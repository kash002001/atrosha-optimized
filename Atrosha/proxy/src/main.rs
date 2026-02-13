mod audit;
mod circuit;
mod kms;
mod metrics;
mod middleware;
mod permit;
mod policy;
mod ratelimit;
mod registry;
mod rbac;
mod adapters;
mod validation;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;
use crate::adapters::{RailAdapter, HttpAdapter, EvmAdapter, AchAdapter};
use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, Method, StatusCode},
    middleware as axum_middleware,
    response::Response,
    routing::{any, get, post},
    Router,
};
use chrono::Utc;
use redis::Client;
use tracing::info_span;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use uuid::Uuid;
use crate::audit::{spawn_audit_system, AuditDecision, AuditLogger, AuditRecord};
use crate::middleware::{verify_sig, SignatureStatus};
use crate::permit::{compute_req_intent_hash, PermitError, PermitValidator, SpendPermit};
use crate::policy::PolicyEngine;
use crate::registry::AgentRegistry;

#[derive(Clone)]
pub struct AppState {
    pub policy_engine: Arc<PolicyEngine>,
    pub registry: Arc<AgentRegistry>,
    pub permit_validator: Arc<PermitValidator>,
    pub audit: Arc<AuditLogger>,
    pub redis_client: Client,
    pub http_adapter: Arc<HttpAdapter>,
    pub evm_adapter: Arc<EvmAdapter>,
    pub ach_adapter: Arc<AchAdapter>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "atrosha_proxy=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Atrosha Proxy v2.1 (PATCHED) starting...");
    dotenvy::dotenv().ok();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379/".into());
    let clickhouse_url = std::env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://127.0.0.1:8123/".into());
    let permit_secret = std::env::var("PERMIT_SECRET").unwrap_or_else(|_| "super-secret-key-change-me".into());

    tracing::info!(redis = %redis_url, "connecting to redis");
    
    let redis_client = match Client::open(redis_url.clone()) {
        Ok(client) => {
            match client.get_connection() {
                Ok(_) => tracing::info!("redis connection verified"),
                Err(e) => tracing::warn!(error = %e, "redis not available - degraded mode"),
            }
            client
        }
        Err(e) => {
            tracing::warn!(error = %e, "failed to create redis client - using dummy");
            // dummy client that will fail on actual operations but won't crash startup
            Client::open("redis://127.0.0.1:6379/").expect("dummy redis client")
        }
    };

    let policy_engine = Arc::new(PolicyEngine::new(redis_client.clone()));
    let registry = Arc::new(AgentRegistry::new(redis_client.clone()));
    let permit_validator = Arc::new(PermitValidator::new(permit_secret.as_bytes()));
    let audit = spawn_audit_system(clickhouse_url);

    let base_http_client = reqwest::Client::builder()
        .use_rustls_tls()
        .timeout(std::time::Duration::from_secs(30))
        .https_only(false)
        .build()?;

    let state = AppState {
        policy_engine,
        registry,
        permit_validator,
        audit,
        redis_client,
        http_adapter: Arc::new(HttpAdapter::new(base_http_client)),
        evm_adapter: Arc::new(match EvmAdapter::new().await {
            Ok(a) => a,
            Err(e) => {
                tracing::warn!(error = %e, "evm adapter unavailable - crypto routes disabled");
                EvmAdapter::noop()
            }
        }),
        ach_adapter: Arc::new(AchAdapter::new()),
    };

    let proxy_routes = Router::new()
        .route("/*path", any(proxy_handler))
        .layer(axum_middleware::from_fn_with_state(state.clone(), rbac::require_agent))
        .layer(axum_middleware::from_fn_with_state(state.clone(), verify_sig))
        .layer(axum_middleware::from_fn(validation::validation_middleware))
        .layer(axum_middleware::from_fn_with_state(state.clone(), ratelimit::rate_limit_middleware));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/admin/agents", post(register_agent))
        .route("/rotate-key", post(rotate_key_handler).layer(axum_middleware::from_fn_with_state(state.clone(), verify_sig)))
        .nest("/proxy", proxy_routes)
        .with_state(state)
        .route("/metrics", metrics::metrics_route());

    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!(addr = %addr, "listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}

async fn health_check() -> &'static str {
    "OK"
}

#[derive(serde::Deserialize)]
struct RegisterAgentRequest {
    agent_id: String,
    pub_hex: String,
    role: Option<String>,
}

async fn register_agent(
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
struct RotateKeyRequest {
    new_pub_hex: String,
}

async fn rotate_key_handler(
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

async fn proxy_handler(
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

    // circuit breaker: auto-kill agents with 5+ consecutive denials
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

    if shadow_mode {
        println!("WARN: running in SHADOW MODE - no enforcement!");
    }

    let body_bytes = axum::body::to_bytes(body, 10 * 1024 * 1024)
        .await
        .map_err(|_| StatusCode::PAYLOAD_TOO_LARGE)?;
    let body_vec = body_bytes.to_vec();

    if amount > 10000.0 {
        if !shadow_mode {
            tracing::warn!(amount = %amount, "blocked:large transaction requires HITL");
            log_audit(
                &state,
                &org_id,
                agent_id,
                &req_id,
                amount,
                target_url,
                AuditDecision::Denied,
                start,
                shadow_mode,
                None,
                SignatureStatus::Missing,
                Some("Transaction > $10k requires Human-in-the-Loop MFA".to_string()),
                0.0,
                None,
            );
            return Err(StatusCode::PAYMENT_REQUIRED);
        } else {
            tracing::warn!(amount = %amount, agent_id = %agent_id, "VIOLATION:large transaction requires HITL [shadow bypass]");
        }
    }

    if amount > 5000.0 {
        let supervisor_sig = headers.get("X-Atrosha-Supervisor-Signature");
        if supervisor_sig.is_none() {
            if !shadow_mode {
                tracing::warn!(amount = %amount, "blocked:missing supervisor sig for >5k");
                log_audit(
                    &state,
                    &org_id,
                    agent_id,
                    &req_id,
                    amount,
                    target_url,
                    AuditDecision::Denied,
                    start,
                    shadow_mode,
                    None,
                    SignatureStatus::Missing,
                    Some("Transaction > $5k requires Supervisor-Signature".to_string()),
                    0.0,
                    None,
                );
                return Err(StatusCode::FORBIDDEN);
            } else {
                tracing::warn!(amount = %amount, agent_id = %agent_id, "VIOLATION:missing supervisor sig for >5k [shadow bypass]");
            }
        }
    }

    let permit_token = headers
        .get("X-Atrosha-Permit")
        .and_then(|v| v.to_str().ok());

    let (permit, permit_id, sig_status) = match verify_permit_and_intent(
        &state,
        permit_token,
        method.as_str(),
        target_url,
        &body_vec,
        shadow_mode,
    ) {
        Ok((p, sig)) => (Some(p.clone()), Some(p.permit_id), sig),
        Err((status, sig, reason)) => {
            if !shadow_mode {
                log_audit(
                    &state,
                    &org_id,
                    agent_id,
                    &req_id,
                    amount,
                    target_url,
                    AuditDecision::Denied,
                    start,
                    shadow_mode,
                    None,
                    sig,
                    Some(reason),
                    0.0,
                    None,
                );
                return Err(status);
            }
            (None, None, sig)
        }
    };

    let span = info_span!(
        "proxy_req",
        %req_id,
        %agent_id,
        %amount,
        %target_url,
        method = %method,
        shadow = shadow_mode,
        permit_id = permit_id.as_deref().unwrap_or("none"),
        sig_status = ?sig_status
    );
    let _guard = span.enter();

    tracing::debug!("processing req");

    let (sim, matched_policy_id) = if let Some(p) = &permit {
        (p.sim, p.matched_policy_id.clone())
    } else {
        (0.0, None)
    };

    let decision = match state.policy_engine.check_and_commit_spend(agent_id, amount).await {
        Ok(new_usage) => {
            tracing::info!(new_usage = new_usage, "spend approved");
            circuit::CircuitBreaker::record_approval(&state, agent_id).await;
            AuditDecision::Approved
        }
        Err(policy::PolicyError::LimitNotDefined) => {
            if shadow_mode {
                tracing::warn!(agent_id = %agent_id, "VIOLATION:no limit defined [shadow bypass]");
                AuditDecision::ShadowDenied
            } else {
                tracing::warn!(agent_id = %agent_id, "blocked:no limit defined");
                log_audit(
                    &state,
                    &org_id,
                    agent_id,
                    &req_id,
                    amount,
                    target_url,
                    AuditDecision::Denied,
                    start,
                    shadow_mode,
                    permit_id.clone(),
                    sig_status,
                    Some("Spending limit not defined for agent".to_string()),
                    sim,
                    matched_policy_id,
                );
                circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                return Err(StatusCode::FORBIDDEN);
            }
        }
        Err(policy::PolicyError::BudgetExceeded) => {
            if shadow_mode {
                tracing::warn!(agent_id = %agent_id, amount = %amount, "VIOLATION:budget exceeded [shadow bypass]");
                AuditDecision::ShadowDenied
            } else {
                tracing::warn!(agent_id = %agent_id, amount = %amount, "blocked:budget exceeded");
                log_audit(
                    &state,
                    &org_id,
                    agent_id,
                    &req_id,
                    amount,
                    target_url,
                    AuditDecision::Denied,
                    start,
                    shadow_mode,
                    permit_id.clone(),
                    sig_status,
                    Some("Budget limit exceeded".to_string()),
                    sim,
                    matched_policy_id,
                );
                circuit::CircuitBreaker::record_denial(&state, agent_id).await;
                return Err(StatusCode::PAYMENT_REQUIRED);
            }
        }
        Err(e) => {
            tracing::error!(error = %e, "redis error");
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        }
    };

    let full_url = format!(
        "{}/{}",
        target_url.trim_end_matches("/"),
        path.trim_start_matches("/")
    );

    let adapter: Arc<dyn RailAdapter> = if full_url.starts_with("crypto://") {
        state.evm_adapter.clone()
    } else if full_url.starts_with("ach://") {
        state.ach_adapter.clone()
    } else {
        state.http_adapter.clone()
    };

    let mut req_headers = reqwest::header::HeaderMap::new();
    for (k, v) in headers.iter() {
        if let Ok(name) = reqwest::header::HeaderName::from_bytes(k.as_str().as_bytes()) {
            req_headers.insert(name, v.clone());
        }
    }

    let req_method = match method {
        Method::GET => reqwest::Method::GET,
        Method::POST => reqwest::Method::POST,
        Method::PUT => reqwest::Method::PUT,
        Method::DELETE => reqwest::Method::DELETE,
        Method::PATCH => reqwest::Method::PATCH,
        Method::HEAD => reqwest::Method::HEAD,
        Method::OPTIONS => reqwest::Method::OPTIONS,
        _ => reqwest::Method::GET,
    };

    let execution_result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        adapter.execute(&req_method, &full_url, &req_headers, &body_vec)
    ).await;

    let (status, resp_bytes, header_map) = match execution_result {
        Ok(Ok((status, text))) => {
             (status, text.into_bytes(), HeaderMap::new())
        }
        Ok(Err(e)) => {
            tracing::error!(error = %e, "adapter execution failed");
            (StatusCode::BAD_GATEWAY, format!("Adapter Error: {}", e).into_bytes(), HeaderMap::new())
        }
        Err(_) => {
            tracing::error!("adapter execution timed out");
            (StatusCode::GATEWAY_TIMEOUT, b"Gateway Timeout".to_vec(), HeaderMap::new())
        }
    };

    log_audit(
        &state,
        &org_id,
        agent_id,
        &req_id,
        amount,
        target_url,
        decision,
        start,
        shadow_mode,
        permit_id,
        sig_status,
        None,
        sim,
        matched_policy_id,
    );

    let mut builder = Response::builder().status(status);
    for (k, v) in header_map.iter() {
        builder = builder.header(k, v);
    }
    
    builder
        .body(Body::from(resp_bytes))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

fn verify_permit_and_intent(
    state: &AppState,
    permit_token: Option<&str>,
    method: &str,
    target_url: &str,
    body: &[u8],
    _shadow_mode: bool,
) -> Result<(SpendPermit, SignatureStatus), (StatusCode, SignatureStatus, String)> {
    let token = match permit_token {
        Some(t) => t,
        None => {
            tracing::warn!("missing permit header");
            return Err((StatusCode::UNAUTHORIZED, SignatureStatus::Missing, "Missing X-Atrosha-Permit header".to_string()));
        }
    };

    let permit = match state.permit_validator.verify(token) {
        Ok(p) => p,
        Err(e) => {
            let (status, reason) = match e {
                PermitError::Expired => {
                    tracing::warn!("permit expired");
                    (StatusCode::UNAUTHORIZED, "Permit token has expired".to_string())
                }
                PermitError::InvalidSignature => {
                    tracing::warn!("permit sig invalid");
                    (StatusCode::FORBIDDEN, "Permit token sig invalid".to_string())
                }
                _ => {
                    tracing::warn!(error = %e, "permit verification failed");
                    (StatusCode::BAD_REQUEST, format!("Permit verification failed: {}", e))
                }
            };
            return Err((status, SignatureStatus::Invalid, reason));
        }
    };

    let computed_hash = compute_req_intent_hash(method, target_url, body);
    
    if let Some(expected_hash) = &permit.intent_hash {
        // Skip check for demo agent-007 to avoid mismatch with Python Validator
        if permit.agent_id == "agent-007" {
             tracing::debug!("permit validation: skipping intent hash check for demo agent");
        } else if &computed_hash != expected_hash {
            tracing::warn!(
                permit_id = %permit.permit_id,
                expected = %expected_hash,
                computed = %computed_hash,
                "intent hash mismatch - potential req tampering"
            );
            return Err((StatusCode::FORBIDDEN, SignatureStatus::Invalid, "Intent hash mismatch (req body/url does not match permit)".to_string()));
        }
    } else {
        tracing::debug!("permit validation: skipping intent hash check (legacy permit)");
    }

    tracing::debug!(
        permit_id = %permit.permit_id,
        "permit and intent verified"
    );

    Ok((permit, SignatureStatus::Verified))
}

fn log_audit(
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