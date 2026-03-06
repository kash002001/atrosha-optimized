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
    let admin_secret = std::env::var("ADMIN_SECRET").unwrap_or_else(|_| "admin-secret-change-me".to_string());
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

    let shadow_mode = headers
        .get("X-Atrosha-Observation-Mode")
        .or_else(|| headers.get("X-Atrosha-Shadow-Mode"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    // ── egress whitelisting ──────────────────────────────────
    if !state.egress_whitelist.is_allowed(&org_id, target_url).await && !shadow_mode {
        tracing::warn!(agent_id = %agent_id, target = %target_url, "EGRESS BLOCKED: target not whitelisted");
        log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, None::<String>, SignatureStatus::Missing, Some("Egress Blocked: Target not whitelisted".to_string()), 0.0, None::<String>);
        return Err(StatusCode::FORBIDDEN);
    }

    let body_bytes = axum::body::to_bytes(body, 10 * 1024 * 1024)
        .await
        .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;
    let body_vec = body_bytes.to_vec();

    // ── semantic firewall ──────────────────────────────────────
    match state.semantic.classify(method.as_str(), target_url, &headers, &body_vec).await {
        Ok(verdict) => {
            if verdict.verdict == "DENY" && !shadow_mode {
                tracing::warn!(agent_id = %agent_id, "semantic firewall DENIED request");
                log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, None::<String>, SignatureStatus::Missing, Some(format!("Semantic Firewall: DENY (conf={:.3})", verdict.confidence)), 0.0, None::<String>);
                circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                return Err(StatusCode::FORBIDDEN);
            }
        }
        Err(_) => tracing::warn!("semantic engine unavailable — fail-open"),
    }

    // ── intent verification (IVE) ─────────────────────────────
    let session_id = headers.get("X-Atrosha-Session-ID").and_then(|v| v.to_str().ok());
    if let Some(sid) = session_id {
        let validator_url = std::env::var("INTENT_VALIDATOR_URL").unwrap_or_else(|_| "http://127.0.0.1:8001".into());
        let intent_url = format!("{}/intent/{}", validator_url, sid);
        if let Ok(resp) = reqwest::get(&intent_url).await {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<serde_json::Value>().await {
                    let locked_prompt = data["prompt"].as_str().unwrap_or("");
                    let action_desc = format!("{} {} | body: {}", method, target_url, String::from_utf8_lossy(&body_vec).chars().take(200).collect::<String>());
                    let threshold: f64 = std::env::var("INTENT_SIMILARITY_THRESHOLD").ok().and_then(|s| s.parse().ok()).unwrap_or(0.70);
                    match state.semantic.verify_intent(locked_prompt, &action_desc, threshold).await {
                        Ok(result) if result.verdict == "REJECT" && !shadow_mode => {
                            tracing::warn!(agent_id = %agent_id, "INTENT DRIFT DETECTED — blocking");
                            log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, None::<String>, SignatureStatus::Verified, Some(format!("Intent Drift: sim={:.4} < threshold={:.2}", result.similarity, result.threshold)), result.similarity as f32, None::<String>);
                            circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                            return Err(StatusCode::FORBIDDEN);
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    if amount > 10000.0 && !shadow_mode {
        log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, None::<String>, SignatureStatus::Missing, Some("Transaction > $10k requires Human-in-the-Loop MFA".to_string()), 0.0, None::<String>);
        return Err(StatusCode::PAYMENT_REQUIRED);
    }

    if amount > 5000.0 && headers.get("X-Atrosha-Supervisor-Signature").is_none() && !shadow_mode {
        log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, None::<String>, SignatureStatus::Missing, Some("Transaction > $5k requires Supervisor-Signature".to_string()), 0.0, None::<String>);
        return Err(StatusCode::FORBIDDEN);
    }

    let permit_token = headers.get("X-Atrosha-Permit").and_then(|v| v.to_str().ok());
    let (permit, permit_id, sig_status) = match verify_permit_and_intent(&state, permit_token, method.as_str(), target_url, &body_vec) {
        Ok((p, sig)) => (Some(p.clone()), Some(p.permit_id), sig),
        Err((status, sig, reason)) => {
            if !shadow_mode {
                log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, None::<String>, sig, Some(reason), 0.0, None::<String>);
                return Err(status);
            }
            (None, None, sig)
        }
    };

    let (sim, matched_policy_id) = if let Some(p) = &permit { (p.sim, p.matched_policy_id.clone()) } else { (0.0, None::<String>) };
    let decision = match state.policy_engine.check_and_commit_spend(agent_id, amount).await {
        Ok(_) => {
            circuit::CircuitBreaker::record_approval(&state, agent_id).await;
            AuditDecision::Approved
        }
        Err(e) => {
            if !shadow_mode {
                log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, shadow_mode, permit_id.clone(), sig_status, Some(format!("{}", e)), sim, matched_policy_id);
                circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                return Err(match e { crate::policy::PolicyError::LimitNotDefined => StatusCode::FORBIDDEN, _ => StatusCode::PAYMENT_REQUIRED });
            }
            AuditDecision::ShadowDenied
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

    let (status, resp_bytes, header_map) = match execution_result {
        Ok(Ok((status, text))) => (status, text.into_bytes(), HeaderMap::new()),
        Ok(Err(e)) => (StatusCode::BAD_GATEWAY, format!("Adapter Error: {}", e).into_bytes(), HeaderMap::new()),
        Err(_) => (StatusCode::GATEWAY_TIMEOUT, b"Gateway Timeout".to_vec(), HeaderMap::new()),
    };

    log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, decision, start, shadow_mode, permit_id, sig_status, None, sim, matched_policy_id);
    let mut builder = Response::builder().status(status);
    for (k, v) in header_map.iter() { builder = builder.header(k, v); }
    builder.body(Body::from(resp_bytes)).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
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
    });
}
