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
use crate::model_check::engine::ModelChecker;
use crate::model_check::ltl::BuchiAutomaton;
use crate::zkp::policy_lang::Constraint;

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

    // pillar 2: causal intent verification (do-calculus)
    // fires after basic intent match; tests whether intent *causally drives* the action
    if let Some(_sid) = &session_id {
        let intent_text = headers.get("X-Atrosha-Intent-Text")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");

        if !intent_text.is_empty() {
            let action_desc = format!(
                "{} {} | body: {}",
                method, target_url,
                String::from_utf8_lossy(&body_vec).chars().take(200).collect::<String>()
            );

            // reasoning trace steps from the agent (optional header, JSON array)
            let trace: Vec<serde_json::Value> = headers
                .get("X-Atrosha-Trace")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| serde_json::from_str(s).ok())
                .unwrap_or_default();

            match state.semantic.causal_verify(intent_text, &action_desc, trace).await {
                Ok(cv) if cv.verdict == "ACAUSAL" => {
                    tracing::warn!(
                        agent_id = %agent_id,
                        ate = %cv.ate,
                        p_value = %cv.p_value,
                        "CAUSAL INTEGRITY FAILED — intent does not causally drive action"
                    );
                    log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, None::<String>, SignatureStatus::Verified, Some(format!("Causal Integrity: ACAUSAL (ATE={:.4}, p={:.4})", cv.ate, cv.p_value)), 0.0, None::<String>, None::<String>);
                    circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                    return Err(StatusCode::FORBIDDEN);
                }
                Ok(cv) => {
                    tracing::info!(
                        ate = %cv.ate,
                        p_value = %cv.p_value,
                        "causal integrity verified"
                    );
                }
                Err(_) => tracing::warn!("causal engine unavailable — fail-open"),
            }
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
    
    // pillar 5: temporal logic bounded model check
    if let Some(oracle) = &state.state_oracle {
        if let Some(policy) = &state.zkp_policy {
            if let Ok(history) = oracle.get_history_trace(agent_id, 100).await {
                // Construct current physical mapping for model checker
                let current_tx = serde_json::json!({
                    "timestamp": chrono::Utc::now().timestamp() as u64,
                    "target": target_url,
                    "amount": amount
                });

                if let Some(root_constraint) = policy.rules.iter()
                    .map(|r| r.constraint.clone())
                    .reduce(|a, b| Constraint::And(Box::new(a), Box::new(b))) {
                    
                    let b_auto = BuchiAutomaton::compile(&root_constraint);
                    if let Ok(passes) = ModelChecker::verify_trace(&b_auto, &current_tx, &history) {
                        if !passes {
                            tracing::warn!(agent_id = %agent_id, "TEMPORAL LOGIC INTEGRITY FAILED");
                            log_audit(&state, &org_id, agent_id, &req_id, amount, target_url, AuditDecision::Denied, start, false, permit_id.clone(), sig_status, Some("Temporal Integrity: LTL Bounds Violated".to_string()), sim, matched_policy_id.clone(), None::<String>);
                            circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                            return Err(StatusCode::FORBIDDEN);
                        }
                    }
                }
            }
        }
    }

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
            use crate::zkp::compiler::{PolicyWitness, bn254_poseidon_config, SEMANTIC_DIM, MERKLE_DEPTH};
            use sha2::{Sha256, Digest};

            let config = state.poseidon_config
                .as_ref()
                .map(|c| c.as_ref().clone())
                .unwrap_or_else(bn254_poseidon_config);

            // 1. body hash for circuit binding
            let body_digest = Sha256::digest(&body_vec);
            let body_hash_val = u32::from_le_bytes(body_digest[0..4].try_into().unwrap_or([0;4]));
            let now_ts = chrono::Utc::now().timestamp() as u64;

            // 2. state oracle: reserve budget, get monotonic seq
            let (seq_num, _budget_remaining) = if let Some(oracle) = &state.state_oracle {
                match oracle.reserve(agent_id, amount as u64).await {
                    Ok((s, r)) => {
                        tracing::debug!(seq = s, remaining = r, "budget reserved");
                        (s, r)
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, "state oracle reserve failed — using seq=0");
                        (0u64, 0u64)
                    }
                }
            } else {
                (0u64, 0u64)
            };

            // 3. semantic engine: get 16-bit fixed-point embedding vectors
            let intent_text = headers.get("X-Atrosha-Intent-Text")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("transaction");
            let action_text = format!("{} {} {}", method, target_url, String::from_utf8_lossy(&body_vec[..body_vec.len().min(200)]));

            let (sem_u, sem_v) = match state.semantic.embed_fixed(intent_text, &action_text).await {
                Ok(result) => {
                    let u: Vec<Fr> = result.u.iter().map(|x| Fr::from(*x as u32)).collect();
                    let v: Vec<Fr> = result.v.iter().map(|x| Fr::from(*x as u32)).collect();
                    (u, v)
                }
                Err(_) => {
                    // fail-open: default zero vectors (similarity check passes trivially)
                    tracing::warn!("embed-fixed unavailable — using zero semantic vectors");
                    (vec![Fr::from(0u32); SEMANTIC_DIM], vec![Fr::from(0u32); SEMANTIC_DIM])
                }
            };

            // 4. build full witness
            let witness = PolicyWitness {
                tx_amount: Fr::from(amount as u32),
                tx_target: Fr::from(0u32),
                tx_timestamp: Fr::from(now_ts),
                agent_role: Fr::from(1u32),
                whitelist_merkle_path: vec![Fr::from(0u32); MERKLE_DEPTH],
                whitelist_path_directions: vec![false; MERKLE_DEPTH],
                semantic_u: sem_u,
                semantic_v: sem_v,
                semantic_threshold_sq: Fr::from(7225u32), // τ=0.85 → 7225
                ..PolicyWitness::default()
            };

            let whitelist_root = Fr::from(0u32);
            let body_hash = Fr::from(body_hash_val);
            let ts = Fr::from(now_ts);
            let pv = Fr::from(1u32);
            let seq = Fr::from(seq_num as u32);

            // 5. generate groth16 proof
            match crate::zkp::prover::ProofGenerator::generate_proof(
                setup, policy, config, witness, whitelist_root, body_hash, ts, pv, seq,
            ) {
                Ok(proof) => {
                    let b64 = crate::zkp::prover::ProofGenerator::serialize_proof(&proof);
                    generated_proof_b64 = Some(b64.clone());

                    // inject PCT headers
                    if let Ok(hval) = axum::http::HeaderValue::from_str(&b64) {
                        header_map.insert("X-PCT-Proof", hval);
                    }
                    if let Ok(hval) = axum::http::HeaderValue::from_str(&now_ts.to_string()) {
                        header_map.insert("X-PCT-Timestamp", hval);
                    }
                    if let Ok(hval) = axum::http::HeaderValue::from_str("1") {
                        header_map.insert("X-PCT-Policy-Version", hval);
                    }
                    if let Ok(hval) = axum::http::HeaderValue::from_str(&seq_num.to_string()) {
                        header_map.insert("X-PCT-Seq", hval);
                    }

                    // 6. commit reservation on success
                    if let Some(oracle) = &state.state_oracle {
                        if let Err(e) = oracle.commit(agent_id, seq_num).await {
                            tracing::warn!(error = %e, "state oracle commit failed");
                        }
                    }
                }
                Err(e) => {
                    tracing::error!(error = %e, "proof generation failed");

                    // release reservation on failure
                    if let Some(oracle) = &state.state_oracle {
                        if let Err(re) = oracle.release(agent_id, seq_num).await {
                            tracing::warn!(error = %re, "state oracle release failed");
                        }
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
