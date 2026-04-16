use redis::AsyncCommands;

// cas reserve-commit protocol for stateful constraints
// each agent has an atomic budget counter + monotonic seq number
// the sequence number is bound to the SNARK public inputs to prevent replay

const RESERVATION_TTL_SECS: u64 = 30;

#[derive(Debug)]
pub enum OracleError {
    InsufficientBudget,
    StaleSequence,
    RedisDown(String),
}

impl std::fmt::Display for OracleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InsufficientBudget => write!(f, "insufficient budget"),
            Self::StaleSequence => write!(f, "stale sequence number"),
            Self::RedisDown(e) => write!(f, "redis unavailable: {}", e),
        }
    }
}

pub struct StateOracle {
    redis: redis::Client,
}

impl StateOracle {
    pub fn new(redis: redis::Client) -> Self {
        Self { redis }
    }

    // RESERVE: atomically check+decrement budget, increment seq, set TTL
    // returns (new_seq, budget_remaining) on success
    pub async fn reserve(&self, agent_id: &str, amount: u64) -> Result<(u64, u64), OracleError> {
        let budget_key = format!("pct:budget:{}", agent_id);
        let seq_key = format!("pct:seq:{}", agent_id);
        let _lock_key = format!("pct:lock:{}:{{}}", agent_id);

        let script = redis::Script::new(r#"
            local bk = KEYS[1]
            local sk = KEYS[2]
            local amt = tonumber(ARGV[1])
            local ttl = tonumber(ARGV[2])

            local budget = tonumber(redis.call("GET", bk) or "0")
            if budget < amt then
                return {-1, budget, 0}
            end

            local new_budget = budget - amt
            redis.call("SET", bk, tostring(new_budget))

            local seq = redis.call("INCR", sk)
            -- store reservation so we can release on timeout
            local rk = "pct:rsv:" .. KEYS[1] .. ":" .. tostring(seq)
            redis.call("SETEX", rk, ttl, tostring(amt))

            return {1, new_budget, seq}
        "#);

        let mut conn = self.redis.get_multiplexed_async_connection().await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        let result: Vec<i64> = script
            .key(&budget_key)
            .key(&seq_key)
            .arg(amount)
            .arg(RESERVATION_TTL_SECS)
            .invoke_async(&mut conn)
            .await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        let ok = result.first().copied().unwrap_or(-1);
        let remaining = result.get(1).copied().unwrap_or(0) as u64;
        let seq = result.get(2).copied().unwrap_or(0) as u64;

        if ok < 0 {
            return Err(OracleError::InsufficientBudget);
        }

        Ok((seq, remaining))
    }

    // COMMIT: delete the reservation key (finalizes the spend)
    pub async fn commit(&self, agent_id: &str, seq: u64) -> Result<(), OracleError> {
        let budget_key = format!("pct:budget:{}", agent_id);
        let rsv_key = format!("pct:rsv:{}:{}", budget_key, seq);

        let mut conn = self.redis.get_multiplexed_async_connection().await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        let _: Option<String> = conn.get_del(&rsv_key).await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        Ok(())
    }

    // RELEASE: return the reserved amount back to the budget
    pub async fn release(&self, agent_id: &str, seq: u64) -> Result<(), OracleError> {
        let budget_key = format!("pct:budget:{}", agent_id);
        let rsv_key = format!("pct:rsv:{}:{}", budget_key, seq);

        let script = redis::Script::new(r#"
            local bk = KEYS[1]
            local rk = KEYS[2]
            local amt = redis.call("GET", rk)
            if amt then
                local budget = tonumber(redis.call("GET", bk) or "0")
                redis.call("SET", bk, tostring(budget + tonumber(amt)))
                redis.call("DEL", rk)
                return 1
            end
            return 0
        "#);

        let mut conn = self.redis.get_multiplexed_async_connection().await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        let _: i64 = script
            .key(&budget_key)
            .key(&rsv_key)
            .invoke_async(&mut conn)
            .await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        Ok(())
    }

    // INIT: set agent budget (admin operation)
    pub async fn init_budget(&self, agent_id: &str, budget: u64) -> Result<(), OracleError> {
        let budget_key = format!("pct:budget:{}", agent_id);
        let mut conn = self.redis.get_multiplexed_async_connection().await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        let _: () = conn.set(&budget_key, budget.to_string()).await
            .map_err(|e| OracleError::RedisDown(e.to_string()))?;

        Ok(())
    }

    // LIST_TRACE: fetch the historical event trace for an agent (for LTL Model Checking)
    // In production, this might use Redis TimeSeries or a bounded LIST (LRANGE)
    pub async fn get_history_trace(&self, agent_id: &str, _limit: isize) -> Result<Vec<serde_json::Value>, OracleError> {
        // Stub: Normally we'd do LRANGE pct:trace:{agent_id} 0 -limit
        // and parse each record as a JSON Value.
        // For the current implementation, we return an empty trace.
        Ok(vec![])
    }
}
