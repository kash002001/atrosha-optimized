use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::Serialize;
use crate::AppState;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum SignatureStatus {
    Verified,
    Invalid,
    Missing,
    KeyNotFound,
}

pub async fn verify_sig(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let headers = req.headers().clone();

    let agent_id = match headers.get("X-Atrosha-Agent-ID").and_then(|h| h.to_str().ok()) {
        Some(id) => id.to_string(),
        None => {
            tracing::warn!(sig_status = ?SignatureStatus::Missing, "rejected: missing agent ID header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    let sig_hex = match headers.get("X-Atrosha-Signature").and_then(|h| h.to_str().ok()) {
        Some(sig) => sig.to_string(),
        None => {
            tracing::warn!(agent_id = %agent_id, sig_status = ?SignatureStatus::Missing, "rejected: missing signature header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };
    
    // Pillar 4: Hardware-Rooted Identity (TEE validation)
    let attestation_base64 = match headers.get("X-Atrosha-Attestation").and_then(|h| h.to_str().ok()) {
        Some(att) => att.to_string(),
        None => {
            tracing::warn!(agent_id = %agent_id, "rejected: missing TEE attestation document");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };
    
    if let Err(e) = crate::tee::verify_enclave_attestation(&attestation_base64) {
        tracing::error!(agent_id = %agent_id, error = %e, "rejected: TEE enclave verification failed");
        return Err(StatusCode::FORBIDDEN);
    }

    let org_id = headers
        .get("X-Atrosha-Org-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default")
        .to_string();

    let ts = match headers.get("X-Atrosha-Timestamp").and_then(|h| h.to_str().ok()) {
        Some(ts) => ts.to_string(),
        None => {
            tracing::warn!(agent_id = %agent_id, sig_status = ?SignatureStatus::Missing, "rejected: missing timestamp header");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    // replay protection: reject timestamps older than 5 minutes
    if let Ok(ts_epoch) = ts.parse::<i64>() {
        let now = chrono::Utc::now().timestamp();
        let drift = (now - ts_epoch).abs();
        if drift > 300 {
            tracing::warn!(agent_id = %agent_id, drift_secs = drift, "rejected: timestamp too old (replay?)");
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    let (mut parts, body) = req.into_parts();
    parts.extensions.insert(org_id.clone());

    let bytes = match axum::body::to_bytes(body, 1024 * 1024 * 10).await {
        Ok(b) => b,
        Err(_) => return Err(StatusCode::PAYLOAD_TOO_LARGE),
    };

    // signature payload: ts + "." + body
    let data = [ts.as_bytes(), b".", &bytes].concat();

    let pub_bytes = match state.registry.get_pub(&org_id, &agent_id).await {
        Ok(bytes) => bytes,
        Err(e) => {
            tracing::warn!(org_id = %org_id, agent_id = %agent_id, error = %e, sig_status = ?SignatureStatus::KeyNotFound, "rejected: agent key lookup failed");
            return Err(StatusCode::UNAUTHORIZED);
        }
    };

    let key_array: [u8; 32] = match pub_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => {
            tracing::error!(agent_id = %agent_id, "invalid key length in registry");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let verifying_key = match VerifyingKey::from_bytes(&key_array) {
        Ok(k) => k,
        Err(_) => {
            tracing::error!(agent_id = %agent_id, "failed to parse verifying key");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let sig_bytes = match hex::decode(&sig_hex) {
        Ok(b) => b,
        Err(_) => {
            tracing::warn!(agent_id = %agent_id, sig_status = ?SignatureStatus::Invalid, "rejected: malformed signature hex");
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    let sig = match Signature::from_slice(&sig_bytes) {
        Ok(s) => s,
        Err(_) => {
            tracing::warn!(agent_id = %agent_id, sig_status = ?SignatureStatus::Invalid, "rejected: invalid signature format");
            return Err(StatusCode::BAD_REQUEST);
        }
    };

    if verifying_key.verify(&data, &sig).is_ok() {
        tracing::debug!(agent_id = %agent_id, sig_status = ?SignatureStatus::Verified, "sig verified");
        let new_req = Request::from_parts(parts, Body::from(bytes));
        Ok(next.run(new_req).await)
    } else {
        tracing::warn!(agent_id = %agent_id, sig_status = ?SignatureStatus::Invalid, "rejected: signature verification failed");
        Err(StatusCode::FORBIDDEN)
    }
}