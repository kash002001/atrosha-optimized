use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tracing::{info, warn, error};

#[derive(Deserialize, Clone)]
struct AgentPolicy {
    max_per_transaction: f64,
    max_daily_spend: f64,
}

#[derive(Deserialize)]
struct PolicyConfig {
    default_policy: AgentPolicy,
    agents: HashMap<String, AgentPolicy>,
}

#[derive(Deserialize, Serialize, Clone)]
struct RefundRequest {
    amount: f64,
    account_id: String,
}

#[derive(Serialize)]
struct BlockedResponse {
    status: &'static str,
    agent: String,
    reason: String,
    limit: f64,
    attempted: f64,
}

#[derive(Serialize)]
struct AuditLog {
    timestamp: String,
    agent: String,
    action: String,
    amount: f64,
    verdict: String,
    reason: String,
    daily_total: f64,
}

struct AppState {
    bank_url: String,
    redis: redis::Client,
    policies: PolicyConfig,
}

impl AppState {
    fn policy_for(&self, agent_id: &str) -> &AgentPolicy {
        self.policies.agents.get(agent_id).unwrap_or(&self.policies.default_policy)
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("info,atrosha_proxy=debug")
        .init();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());
    let redis = redis::Client::open(redis_url.as_str()).expect("bad redis url");

    // verify redis is reachable
    let mut conn = redis.get_multiplexed_async_connection().await.expect("redis unreachable");
    let _: String = redis::cmd("PING").query_async(&mut conn).await.expect("redis ping failed");
    info!("Redis connected at {}", redis_url);

    let raw = std::fs::read_to_string("budget.json").expect("missing budget.json");
    let policies: PolicyConfig = serde_json::from_str(&raw).expect("invalid budget.json");
    info!("Loaded {} agent-specific policies + default", policies.agents.len());

    let state = Arc::new(AppState {
        bank_url: std::env::var("BANK_URL").unwrap_or_else(|_| "http://localhost:8001".into()),
        redis,
        policies,
    });

    let app = Router::new()
        .route("/balance", get(proxy_balance))
        .route("/refund", post(proxy_refund))
        .route("/health", get(health))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8000").await.unwrap();
    info!("Atrosha Proxy listening on 0.0.0.0:8000");
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

async fn proxy_balance(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let client = reqwest::Client::new();
    match client.get(format!("{}/balance", state.bank_url)).send().await {
        Ok(resp) => {
            let body = resp.bytes().await.unwrap();
            (StatusCode::OK, body).into_response()
        }
        Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Bank unreachable").into_response(),
    }
}

async fn proxy_refund(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RefundRequest>,
) -> impl IntoResponse {
    let policy = state.policy_for(&payload.account_id);
    let today = Utc::now().format("%Y-%m-%d").to_string();
    let spend_key = format!("atrosha:spend:{}:{}", payload.account_id, today);

    // --- gate 1: per-transaction limit ---
    if payload.amount > policy.max_per_transaction {
        let reason = format!(
            "Transaction ${:.2} exceeds per-tx limit ${:.2}",
            payload.amount, policy.max_per_transaction
        );
        warn!(agent = %payload.account_id, %reason);
        log_audit(&state, &payload, "DENIED", &reason, 0.0).await;

        return (
            StatusCode::FORBIDDEN,
            Json(BlockedResponse {
                status: "DENIED",
                agent: payload.account_id,
                reason,
                limit: policy.max_per_transaction,
                attempted: payload.amount,
            }),
        ).into_response();
    }

    // --- gate 2: daily spend limit (atomic redis check) ---
    let mut conn = match state.redis.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            error!("Redis connection failed: {}", e);
            // fail closed: deny if we can't verify budget
            return (StatusCode::SERVICE_UNAVAILABLE, "Atrosha: Budget service unavailable").into_response();
        }
    };

    // atomically increment and check
    let amount_cents = (payload.amount * 100.0) as i64;
    let new_total_cents: i64 = match conn.incr(&spend_key, amount_cents).await {
        Ok(v) => v,
        Err(e) => {
            error!("Redis INCR failed: {}", e);
            return (StatusCode::SERVICE_UNAVAILABLE, "Atrosha: Budget service unavailable").into_response();
        }
    };

    // set expiry on first write (48h buffer so it doesn't vanish mid-day)
    let _: Result<(), _> = conn.expire(&spend_key, 172800).await;

    let new_total = new_total_cents as f64 / 100.0;

    if new_total > policy.max_daily_spend {
        // rollback the increment
        let _: Result<(), _> = conn.decr(&spend_key, amount_cents).await;

        let prev = new_total - payload.amount;
        let reason = format!(
            "Daily spend would be ${:.2} (limit ${:.2}, already spent ${:.2})",
            new_total, policy.max_daily_spend, prev
        );
        warn!(agent = %payload.account_id, %reason);
        log_audit(&state, &payload, "DENIED", &reason, prev).await;

        return (
            StatusCode::FORBIDDEN,
            Json(BlockedResponse {
                status: "DENIED",
                agent: payload.account_id,
                reason,
                limit: policy.max_daily_spend,
                attempted: payload.amount,
            }),
        ).into_response();
    }

    // --- passed all gates: forward to bank ---
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{}/refund", state.bank_url))
        .json(&payload)
        .send()
        .await;

    match res {
        Ok(resp) => {
            info!(
                agent = %payload.account_id,
                amount = payload.amount,
                daily_total = new_total,
                "Transaction APPROVED"
            );
            log_audit(&state, &payload, "APPROVED", "Within policy", new_total).await;

            let body = resp.bytes().await.unwrap();
            (StatusCode::OK, body).into_response()
        }
        Err(_) => {
            // rollback on bank failure
            let _: Result<(), _> = conn.decr(&spend_key, amount_cents).await;
            (StatusCode::INTERNAL_SERVER_ERROR, "Bank unreachable").into_response()
        }
    }
}

async fn log_audit(state: &AppState, req: &RefundRequest, verdict: &str, reason: &str, daily_total: f64) {
    let log = AuditLog {
        timestamp: Utc::now().to_rfc3339(),
        agent: req.account_id.clone(),
        action: "refund".into(),
        amount: req.amount,
        verdict: verdict.into(),
        reason: reason.into(),
        daily_total,
    };

    if let Ok(json) = serde_json::to_string(&log) {
        if let Ok(mut conn) = state.redis.get_multiplexed_async_connection().await {
            let _: Result<(), _> = conn.lpush("atrosha:audit_log", &json).await;
            // keep last 10k entries
            let _: Result<(), _> = conn.ltrim("atrosha:audit_log", 0, 9999).await;
        }
    }
}
