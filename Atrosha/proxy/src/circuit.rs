use redis::AsyncCommands;
use crate::AppState;

const TRIP_THRESHOLD: u32 = 5;
const COOLDOWN_SECS: u64 = 300; // 5 min block

pub struct CircuitBreaker;

impl CircuitBreaker {
    // check if agent is currently tripped
    pub async fn is_open(state: &AppState, agent_id: &str) -> bool {
        let key = format!("circuit:{}", agent_id);

        let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
            Ok(c) => c,
            Err(_) => return false, // fail open if redis is down
        };

        let count: u32 = conn.get(&key).await.unwrap_or(0);
        count >= TRIP_THRESHOLD
    }

    // bump the consecutive-denial counter; auto-expire after cooldown
    pub async fn record_denial(state: &AppState, agent_id: &str) {
        let key = format!("circuit:{}", agent_id);

        let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                tracing::debug!(error = %e, "circuit breaker: redis unavailable");
                return;
            }
        };

        // atomic incr + set TTL on first hit
        let script = redis::Script::new(r#"
            local key = KEYS[1]
            local ttl = tonumber(ARGV[1])
            local count = redis.call("INCR", key)
            if count == 1 then
                redis.call("EXPIRE", key, ttl)
            end
            return count
        "#);

        let count: u32 = script
            .key(&key)
            .arg(COOLDOWN_SECS)
            .invoke_async(&mut conn)
            .await
            .unwrap_or(0);

        if count >= TRIP_THRESHOLD {
            tracing::warn!(agent_id = %agent_id, count, "circuit TRIPPED — agent auto-killed for {}s", COOLDOWN_SECS);
        }
    }

    // reset on successful approval
    pub async fn record_approval(state: &AppState, agent_id: &str) {
        let key = format!("circuit:{}", agent_id);

        let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
            Ok(c) => c,
            Err(_) => return,
        };

        let _: Result<(), _> = conn.del(&key).await;
    }
}
