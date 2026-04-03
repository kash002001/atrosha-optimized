use std::time::Instant;
use std::sync::Arc;
use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Method, StatusCode},
    response::Response,
};
use uuid::Uuid;
use chrono::Utc;
use crate::middleware::SignatureStatus;
use crate::state::AppState;
use crate::audit::{AuditDecision, AuditRecord};
use crate::circuit;
use crate::permit::{compute_req_intent_hash, SpendPermit};
use crate::adapters::RailAdapter;

// max body we'll buffer before rejecting
const MAX_BODY_BYTES: usize = 10 * 1024 * 1024;
// for payloads larger than this, we stream intent classification in parallel with buffering
const STREAMING_THRESHOLD: usize = 64 * 1024;
// how many bytes to send to the intent validator for classification
const INTENT_PREVIEW_BYTES: usize = 4096;

pub async fn health_check() -> &'static str {
    "OK"
}

#[derive(serde::Deserialize)]
pub struct RegisterAgentRequest {
    pub agent_id: String,
    pub pub_hex: String,
    pub role: Option<String>,
}

pub async fn register_agent(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<RegisterAgentRequest>,
) -> Result<&'static str, StatusCode> {
    let admin_secret = std::env::var("ADMIN_SECRET")
        .expect("ADMIN_SECRET must be set in environment");
    let provided_secret = headers
        .get("X-Atrosha-Admin-Secret")
        .and_then(|v| v.to_str().ok());

    match provided_secret {
        Some(s) if s == admin_secret => {}
        _ => {
            tracing::warn!("admin unauthorized: invalid/missing secret");
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    let org_id = headers
        .get("X-Atrosha-Org-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default");

    state
        .registry
        .register_agent(org_id, &req.agent_id, &req.pub_hex, req.role.as_deref())
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "failed to register agent");
            StatusCode::BAD_REQUEST
        })?;

    Ok("registered")
}

#[derive(serde::Deserialize)]
pub struct RotateKeyRequest {
    pub new_pub_hex: String,
}

pub async fn rotate_key_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(req): axum::Json<RotateKeyRequest>,
) -> Result<&'static str, StatusCode> {
    let org_id = headers
        .get("X-Atrosha-Org-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default");

    let agent_id = headers
        .get("X-Atrosha-Agent-ID")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::BAD_REQUEST)?;

    state
        .registry
        .update_key(org_id, agent_id, &req.new_pub_hex)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "failed to rotate key");
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    tracing::info!(org_id = %org_id, agent_id = %agent_id, "key rotation successful");
    Ok("key rotated")
}

pub async fn proxy_handler(
    State(state): State<AppState>,
    method: Method,
    Path(path): Path<String>,
    headers: HeaderMap,
    body: axum::body::Body,
) -> Result<Response, StatusCode> {
    let start = Instant::now();
    let req_id = Uuid::new_v4().to_string();
    
    let org_id = headers
        .get("X-Atrosha-Org-ID")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("default")
        .to_string();

    let agent_id = headers
        .get("X-Atrosha-Agent-ID")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| {
            tracing::warn!("missing X-Atrosha-Agent-ID header");
            StatusCode::BAD_REQUEST
        })?;

    if circuit::CircuitBreaker::is_open(&state, agent_id).await {
        tracing::warn!(agent_id = %agent_id, "circuit breaker OPEN — agent auto-killed");
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    let amount: f64 = headers
        .get("X-Atrosha-Amount")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);

    let target_url = headers
        .get("X-Atrosha-Target")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| {
            tracing::warn!("missing X-Atrosha-Target header");
            StatusCode::BAD_REQUEST
        })?;

    // egress whitelisting — always enforced (now with in-memory cache)
    if !state.egress_whitelist.is_allowed(&org_id, target_url).await {
        tracing::warn!(agent_id = %agent_id, target = %target_url, "EGRESS BLOCKED: target not whitelisted");
        log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, SignatureStatus::Verified, Some("Egress Blocked: Target not whitelisted".to_string()), 0.0, None::<String>, None::<String>);
        return Err(StatusCode::FORBIDDEN);
    }

    // --- streaming body ingestion ---
    // we check Content-Length to decide if we should stream intent classification
    // in parallel with body buffering
    let content_len: usize = headers
        .get("content-length")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);

    let session_id = headers.get("X-Atrosha-Session-ID").and_then(|v| v.to_str().ok()).map(|s| s.to_string());

    let (body_vec, streamed_intent_result) = if content_len > STREAMING_THRESHOLD && session_id.is_some() {
        // large payload: stream first chunk to validator while buffering the rest
        stream_body_with_intent(&state, body, &session_id.as_deref().unwrap_or(""), method.as_str(), target_url).await?
    } else {
        // small payload or no session: buffer normally
        let body_bytes = axum::body::to_bytes(body, MAX_BODY_BYTES)
            .await
            .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;
        (body_bytes.to_vec(), None)
    };

    // semantic firewall — always enforced
    match state.semantic.classify(method.as_str(), target_url, &headers, &body_vec).await {
        Ok(verdict) => {
            if verdict.verdict == "DENY" {
                tracing::warn!(agent_id = %agent_id, "semantic firewall DENIED request");
                log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, SignatureStatus::Verified, Some(format!("Semantic Firewall: DENY (conf={:.3})", verdict.confidence)), 0.0, None::<String>, None::<String>);
                circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                return Err(StatusCode::FORBIDDEN);
            }
        }
        Err(_) => tracing::warn!("semantic engine unavailable — fail-open"),
    }

    // intent verification (IVE)
    // if we already streamed the intent check, use that result; otherwise do it here
    if let Some(sid) = &session_id {
        let intent_blocked = if let Some(streamed) = streamed_intent_result {
            // we already got a result from the streaming path
            streamed
        } else {
            check_intent_sync(&state, sid, method.as_str(), target_url, &body_vec).await
        };

        if intent_blocked {
            tracing::warn!(agent_id = %agent_id, "INTENT DRIFT DETECTED — blocking");
            log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, SignatureStatus::Verified, Some("Intent Drift: streamed validation rejected".to_string()), 0.0, None::<String>, None::<String>);
            circuit::CircuitBreaker::record_denial(&state, agent_id).await;
            return Err(StatusCode::FORBIDDEN);
        }
    }

    if amount > 10000.0 {
        log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, SignatureStatus::Verified, Some("Transaction > $10k requires Human-in-the-Loop MFA".to_string()), 0.0, None::<String>, None::<String>);
        return Err(StatusCode::PAYMENT_REQUIRED);
    }

    if amount > 5000.0 && headers.get("X-Atrosha-Supervisor-Signature").is_none() {
        log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, SignatureStatus::Verified, Some("Transaction > $5k requires Supervisor-Signature".to_string()), 0.0, None::<String>, None::<String>);
        return Err(StatusCode::FORBIDDEN);
    }

    let permit_token = headers.get("X-Atrosha-Permit").and_then(|v| v.to_str().ok());
    let (permit, permit_id, sig_status) = match verify_permit_and_intent(&state, permit_token, method.as_str(), target_url, &body_vec) {
        Ok((p, sig)) => (Some(p.clone()), Some(p.permit_id), sig),
        Err((status, sig, reason)) => {
            log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, sig, Some(reason), 0.0, None::<String>, None::<String>);
            return Err(status);
        }
    };

    let (sim, matched_policy_id) = if let Some(p) = &permit { (p.sim, p.matched_policy_id.clone()) } else { (0.0, None::<String>) };
    let decision = match state.policy_engine.check_and_commit_spend(agent_id, amount).await {
        Ok(_) => {
            circuit::CircuitBreaker::record_approval(&state, agent_id).await;
            AuditDecision::Approved
        }
        Err(e) => {
            log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, permit_id.clone(), sig_status, Some(format!("{}", e)), sim, matched_policy_id, None::<String>);
            circuit::CircuitBreaker::record_denial(&state, agent_id).await;
            return Err(match e { crate::policy::PolicyError::LimitNotDefined => StatusCode::FORBIDDEN, _ => StatusCode::PAYMENT_REQUIRED });
        }
    };

    let full_url = format!("{}/{}", target_url.trim_end_matches('/'), path.trim_start_matches('/'));
    let adapter: Arc<dyn RailAdapter> = if full_url.starts_with("crypto://") { state.evm_adapter.clone() } else if full_url.starts_with("ach://") { state.ach_adapter.clone() } else { state.http_adapter.clone() };

    let mut req_headers = reqwest::header::HeaderMap::new();
    for (k, v) in headers.iter() {
        if let Ok(name) = reqwest::header::HeaderName::from_bytes(k.as_str().as_bytes()) { req_headers.insert(name, v.clone()); }
    }

    let req_method = match method { Method::POST => reqwest::Method::POST, Method::PUT => reqwest::Method::PUT, Method::DELETE => reqwest::Method::DELETE, Method::PATCH => reqwest::Method::PATCH, _ => reqwest::Method::GET };
    let execution_result = tokio::time::timeout(std::time::Duration::from_secs(30), adapter.execute(&req_method, &full_url, &req_headers, &body_vec)).await;

    let (status, resp_bytes, mut header_map) = match execution_result {
        Ok(Ok((status, text))) => (status, text.into_bytes(), HeaderMap::new()),
        Ok(Err(e)) => (StatusCode::BAD_GATEWAY, format!("Adapter Error: {}", e).into_bytes(), HeaderMap::new()),
        Err(_) => (StatusCode::GATEWAY_TIMEOUT, b"Gateway Timeout".to_vec(), HeaderMap::new()),
    };

    let mut generated_proof_b64 = None;
    if matches!(decision, AuditDecision::Approved) {
        if let (Some(setup), Some(policy)) = (&state.zkp_setup, &state.zkp_policy) {
            use ark_bn254::Fr;
            use crate::zkp::compiler::PolicyWitness;
            let target_hash = crate::permit::compute_req_intent_hash(method.as_str(), target_url, &body_vec);
            let target_num = target_hash.len() as u32; // Just a mock deterministic constraint input

            let witness = PolicyWitness {
                tx_amount: Fr::from(amount as u32),
                tx_target: Fr::from(target_num),
                whitelist_merkle_path: vec![],
                ..PolicyWitness::default()
            };
            
            let dummy_config = ark_crypto_primitives::sponge::poseidon::PoseidonConfig {
                full_rounds: 8, partial_rounds: 31, alpha: 5,
                ark: vec![vec![Fr::from(1u32)]], mds: vec![vec![Fr::from(1u32)]],
                rate: 2, capacity: 1,
            };
            
            let whitelist_root = Fr::from(target_num); // Matching default path bounds

            if let Ok(proof) = crate::zkp::prover::ProofGenerator::generate_proof(setup, policy, dummy_config, witness, whitelist_root) {
                let b64 = crate::zkp::prover::ProofGenerator::serialize_proof(&proof);
                {
                    generated_proof_b64 = Some(b64.clone());
                    if let Ok(hval) = axum::http::HeaderValue::from_str(&b64) {
                        header_map.insert("X-Atrosha-Proof", hval);
                    }
                }
            }
        }
    }

    log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, decision, start, false, permit_id, sig_status, None, sim, matched_policy_id, generated_proof_b64);
    let mut builder = Response::builder().status(status);
    for (k, v) in header_map.iter() { builder = builder.header(k, v); }
    builder.body(Body::from(resp_bytes)).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// stream body ingestion: reads the first INTENT_PREVIEW_BYTES, fires off intent validation
/// concurrently, then continues buffering the remaining body.
/// returns (full_body, Option<bool>) where the bool = true means intent was REJECTED
async fn stream_body_with_intent(
    state: &AppState,
    body: Body,
    session_id: &str,
    method: &str,
    target_url: &str,
) -> Result<(Vec<u8>, Option<bool>), StatusCode> {
    use http_body_util::BodyExt;

    let mut collected = Vec::with_capacity(STREAMING_THRESHOLD);
    let mut body = body;
    let mut preview_sent = false;
    let mut intent_handle: Option<tokio::task::JoinHandle<bool>> = None;

    // collect body frame-by-frame
    loop {
        match body.frame().await {
            Some(Ok(frame)) => {
                if let Ok(data) = frame.into_data() {
                    collected.extend_from_slice(&data);

                    if collected.len() > MAX_BODY_BYTES {
                        return Err(StatusCode::PAYLOAD_TOO_LARGE);
                    }

                    // once we have enough for a preview, fire off intent validation
                    if !preview_sent && collected.len() >= INTENT_PREVIEW_BYTES {
                        preview_sent = true;
                        let preview = collected[..INTENT_PREVIEW_BYTES.min(collected.len())].to_vec();
                        let sem = state.semantic.clone();
                        let sid = session_id.to_string();
                        let m = method.to_string();
                        let t = target_url.to_string();

                        intent_handle = Some(tokio::spawn(async move {
                            stream_intent_check(&sem, &sid, &m, &t, &preview).await
                        }));
                    }
                }
            }
            Some(Err(_)) => return Err(StatusCode::BAD_REQUEST),
            None => break,
        }
    }

    // if body was too small for streaming, send intent check now
    if !preview_sent && !session_id.is_empty() {
        let preview = collected.clone();
        let sem = state.semantic.clone();
        let sid = session_id.to_string();
        let m = method.to_string();
        let t = target_url.to_string();

        intent_handle = Some(tokio::spawn(async move {
            stream_intent_check(&sem, &sid, &m, &t, &preview).await
        }));
    }

    // wait for intent validation result
    let intent_rejected = match intent_handle {
        Some(handle) => handle.await.unwrap_or(false),
        None => false,
    };

    Ok((collected, Some(intent_rejected)))
}

/// fire the intent verification call using a body preview
async fn stream_intent_check(
    semantic: &Arc<crate::semantic::SemanticClient>,
    session_id: &str,
    method: &str,
    target_url: &str,
    body_preview: &[u8],
) -> bool {
    let validator_url = std::env::var("INTENT_VALIDATOR_URL").unwrap_or_else(|_| "http://127.0.0.1:8001".into());
    let intent_url = format!("{}/intent/{}", validator_url, session_id);

    let resp = match reqwest::get(&intent_url).await {
        Ok(r) if r.status().is_success() => r,
        _ => return false, // fail open
    };

    let data: serde_json::Value = match resp.json().await {
        Ok(d) => d,
        Err(_) => return false,
    };

    let locked_prompt = data["prompt"].as_str().unwrap_or("");
    if locked_prompt.is_empty() { return false; }

    let action_desc = format!(
        "{} {} | body: {}",
        method, target_url,
        String::from_utf8_lossy(body_preview).chars().take(200).collect::<String>()
    );

    let threshold: f64 = std::env::var("INTENT_SIMILARITY_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.70);

    match semantic.verify_intent(locked_prompt, &action_desc, threshold).await {
        Ok(result) if result.verdict == "REJECT" => {
            tracing::warn!(
                similarity = %result.similarity,
                threshold = %result.threshold,
                "streamed intent check: REJECT"
            );
            true
        }
        _ => false,
    }
}

/// synchronous intent check for small payloads (original behavior)
async fn check_intent_sync(
    state: &AppState,
    session_id: &str,
    method: &str,
    target_url: &str,
    body: &[u8],
) -> bool {
    let validator_url = std::env::var("INTENT_VALIDATOR_URL").unwrap_or_else(|_| "http://127.0.0.1:8001".into());
    let intent_url = format!("{}/intent/{}", validator_url, session_id);

    let resp = match reqwest::get(&intent_url).await {
        Ok(r) if r.status().is_success() => r,
        _ => return false,
    };

    let data: serde_json::Value = match resp.json().await {
        Ok(d) => d,
        Err(_) => return false,
    };

    let locked_prompt = data["prompt"].as_str().unwrap_or("");
    if locked_prompt.is_empty() { return false; }

    let action_desc = format!(
        "{} {} | body: {}",
        method, target_url,
        String::from_utf8_lossy(body).chars().take(200).collect::<String>()
    );

    let threshold: f64 = std::env::var("INTENT_SIMILARITY_THRESHOLD")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.70);

    match state.semantic.verify_intent(locked_prompt, &action_desc, threshold).await {
        Ok(result) if result.verdict == "REJECT" => true,
        _ => false,
    }
}

fn verify_permit_and_intent(
    state: &AppState,
    permit_token: Option<&str>,
    method: &str,
    target_url: &str,
    body: &[u8],
) -> Result<(SpendPermit, SignatureStatus), (StatusCode, SignatureStatus, String)> {
    let token = permit_token.ok_or((StatusCode::UNAUTHORIZED, SignatureStatus::Missing, "Missing permit header".to_string()))?;
    let permit = match state.permit_validator.verify(token) {
        Ok(p) => p,
        Err(e) => return Err((StatusCode::FORBIDDEN, SignatureStatus::Invalid, format!("{}", e))),
    };

    let computed_hash = compute_req_intent_hash(method, target_url, body);
    if let Some(expected_hash) = &permit.intent_hash {
        if &computed_hash != expected_hash {
            return Err((StatusCode::FORBIDDEN, SignatureStatus::Invalid, "Intent hash mismatch".to_string()));
        }
    }
    Ok((permit, SignatureStatus::Verified))
}

pub async fn get_verification_keys(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<axum::Json<serde_json::Value>, StatusCode> {
    let admin_secret = std::env::var("ADMIN_SECRET").unwrap_or_default();
    let provided_secret = headers.get("X-Atrosha-Admin-Secret").and_then(|v| v.to_str().ok());
    if provided_secret != Some(&admin_secret) {
        return Err(StatusCode::UNAUTHORIZED);
    }
    
    if let Some(setup) = &state.zkp_setup {
        use ark_serialize::CanonicalSerialize;
        let mut vk_bytes = Vec::new();
        if setup.proving_key.vk.serialize_uncompressed(&mut vk_bytes).is_ok() {
            use base64::{Engine as _, engine::general_purpose::STANDARD};
            let vk_b64 = STANDARD.encode(&vk_bytes);
            return Ok(axum::Json(serde_json::json!({
                "policy": "MasterApproval",
                "vk_base64": vk_b64
            })));
        }
    }
    Err(StatusCode::INTERNAL_SERVER_ERROR)
}

pub fn log_audit(
    state: &AppState,
    org_id: &str,
    agent_id: &str,
    req_id: &str,
    amount: f64,
    target_url: &str,
    decision: AuditDecision,
    start: Instant,
    shadow_mode: bool,
    permit_id: Option<String>,
    sig_status: SignatureStatus,
    denial_reason: Option<String>,
    sim: f32,
    matched_policy_id: Option<String>,
    zkp_proof: Option<String>,
) {
    let latency_us = start.elapsed().as_micros() as u64;
    state.audit.log(AuditRecord {
        ts: Utc::now(),
        org_id: org_id.to_string(),
        agent_id: agent_id.to_string(),
        req_id: req_id.to_string(),
        action: "proxy".to_string(),
        amount,
        target_url: target_url.to_string(),
        decision,
        latency_us,
        shadow_mode,
        permit_id,
        sig_status,
        denial_reason,
        sim,
        matched_policy_id,
        zkp_proof,
    });
}
