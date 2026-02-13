use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response,
};
#[allow(unused_imports)]
use redis::AsyncCommands; 
use std::time::Duration;
use crate::AppState;

const DEFAULT_RATE_LIMIT: u32 = 60;
const WINDOW_SIZE_SECONDS: u64 = 60; // per-minute rate limiting

pub async fn rate_limit_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let headers = req.headers();
    let agent_id = match headers
        .get("X-Atrosha-Agent-ID")
        .and_then(|h| h.to_str().ok())
    {
        Some(id) => id.to_string(),
        None => return Ok(next.run(req).await),
    };

    let org_id = headers
        .get("X-Atrosha-Org-ID")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("default")
        .to_string();

    let rate_limit = get_agent_rate_limit(&state, &agent_id).await;

    match check_rate_limit(&state, &org_id, &agent_id, rate_limit).await {
        Ok(allowed) => {
            if allowed {
                Ok(next.run(req).await)
            } else {
                tracing::warn!(agent_id = %agent_id, limit = rate_limit, "rate limit exceeded");
                Err(StatusCode::TOO_MANY_REQUESTS)
            }
        }
        Err(e) => {
            tracing::warn!(error = %e, agent_id = %agent_id, "rate limit check failed, allowing req");
            Ok(next.run(req).await)
        }
    }
}

async fn get_agent_rate_limit(_state: &AppState, _agent_id: &str) -> u32 {
    DEFAULT_RATE_LIMIT
}

async fn check_rate_limit(state: &AppState, org_id: &str, agent_id: &str, limit: u32) -> anyhow::Result<bool> {
    let key = format!("rate:{}:{}:{}", org_id, agent_id, current_window());
    
    let script = redis::Script::new(r#"
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        
        local current = redis.call("INCR", key)
        if current == 1 then
            redis.call("EXPIRE", key, window)
        end
        
        if current > limit then
            return 0
        else
            return 1
        end
    "#);

    let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            tracing::debug!(error = %e, "redis unavailable for rate limiting");
            return Ok(true);
        }
    };

    let ret: u32 = script
        .key(&key)
        .arg(limit)
        .arg(WINDOW_SIZE_SECONDS)
        .invoke_async(&mut conn)
        .await
        .unwrap_or(1); 

    Ok(ret == 1)
}

fn current_window() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
        / WINDOW_SIZE_SECONDS
}