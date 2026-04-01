use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
#[allow(unused_imports)]
use redis::AsyncCommands;
use std::time::Duration;
use crate::AppState;

const DEFAULT_RATE_LIMIT: u32 = 60;
const WINDOW_SIZE_SECONDS: u64 = 60;

// burst allowance: agents can spike up to 2x their per-minute rate in any 10s window
const BURST_WINDOW_SECS: u64 = 10;
const BURST_MULTIPLIER: f64 = 2.0;

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

    let rate_limit = get_agent_rate_limit(&state, &org_id, &agent_id).await;

    match check_rate_limit(&state, &org_id, &agent_id, rate_limit).await {
        Ok((allowed, remaining, reset_at)) => {
            if allowed {
                let mut resp = next.run(req).await;
                // inject rate limit headers so callers can self-throttle
                let hdrs = resp.headers_mut();
                hdrs.insert("X-RateLimit-Limit", rate_limit.into());
                hdrs.insert("X-RateLimit-Remaining", remaining.into());
                hdrs.insert("X-RateLimit-Reset", reset_at.into());
                Ok(resp)
            } else {
                tracing::warn!(agent_id = %agent_id, org_id = %org_id, limit = rate_limit, "rate limit exceeded");
                let mut resp = StatusCode::TOO_MANY_REQUESTS.into_response();
                let hdrs = resp.headers_mut();
                hdrs.insert("X-RateLimit-Limit", rate_limit.into());
                hdrs.insert("X-RateLimit-Remaining", 0u32.into());
                hdrs.insert("X-RateLimit-Reset", reset_at.into());
                hdrs.insert("Retry-After", reset_at.into());
                Err(StatusCode::TOO_MANY_REQUESTS)
            }
        }
        Err(e) => {
            tracing::warn!(error = %e, agent_id = %agent_id, "rate limit check failed, allowing req");
            Ok(next.run(req).await)
        }
    }
}

/// pull per-agent rate limits from redis registry, fallback to default
async fn get_agent_rate_limit(state: &AppState, org_id: &str, agent_id: &str) -> u32 {
    let key = format!("atrosha:agent_config:{}:{}", org_id, agent_id);

    let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return DEFAULT_RATE_LIMIT,
    };

    // try agent-specific override first
    let custom: Option<u32> = conn.hget(&key, "rate_limit_rpm").await.ok().flatten();
    if let Some(rpm) = custom {
        return rpm;
    }

    // try org-level default
    let org_key = format!("atrosha:org_config:{}", org_id);
    let org_limit: Option<u32> = conn.hget(&org_key, "rate_limit_rpm").await.ok().flatten();
    org_limit.unwrap_or(DEFAULT_RATE_LIMIT)
}

/// sliding window rate limit + burst check
async fn check_rate_limit(
    state: &AppState,
    org_id: &str,
    agent_id: &str,
    limit: u32,
) -> anyhow::Result<(bool, u32, u32)> {
    let window_key = format!("rate:{}:{}:{}", org_id, agent_id, current_window());
    let burst_key = format!("burst:{}:{}:{}", org_id, agent_id, current_burst_window());
    let burst_limit = (limit as f64 / (WINDOW_SIZE_SECONDS as f64 / BURST_WINDOW_SECS as f64) * BURST_MULTIPLIER) as u32;

    // atomic script: check both per-minute and burst windows
    let script = redis::Script::new(r#"
        local wkey = KEYS[1]
        local bkey = KEYS[2]
        local wlimit = tonumber(ARGV[1])
        local blimit = tonumber(ARGV[2])
        local wttl = tonumber(ARGV[3])
        local bttl = tonumber(ARGV[4])

        -- per-minute window
        local wcount = redis.call("INCR", wkey)
        if wcount == 1 then
            redis.call("EXPIRE", wkey, wttl)
        end

        -- burst window (shorter)
        local bcount = redis.call("INCR", bkey)
        if bcount == 1 then
            redis.call("EXPIRE", bkey, bttl)
        end

        -- deny if either window exceeded
        if wcount > wlimit then
            return { 0, wlimit - wcount, wcount }
        end
        if bcount > blimit then
            return { 0, wlimit - wcount, wcount }
        end

        return { 1, wlimit - wcount, wcount }
    "#);

    let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(e) => {
            tracing::debug!(error = %e, "redis unavailable for rate limiting");
            // fail open: return allowed=true
            return Ok((true, limit, seconds_until_window_reset()));
        }
    };

    let result: Vec<i64> = script
        .key(&window_key)
        .key(&burst_key)
        .arg(limit)
        .arg(burst_limit)
        .arg(WINDOW_SIZE_SECONDS)
        .arg(BURST_WINDOW_SECS)
        .invoke_async(&mut conn)
        .await
        .unwrap_or(vec![1, limit as i64, 0]);

    let allowed = result.first().copied().unwrap_or(1) == 1;
    let remaining = result.get(1).copied().unwrap_or(0).max(0) as u32;
    let reset = seconds_until_window_reset();

    Ok((allowed, remaining, reset))
}

fn current_window() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
        / WINDOW_SIZE_SECONDS
}

fn current_burst_window() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs()
        / BURST_WINDOW_SECS
}

fn seconds_until_window_reset() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or(Duration::ZERO)
        .as_secs();
    (WINDOW_SIZE_SECONDS - (now % WINDOW_SIZE_SECONDS)) as u32
}