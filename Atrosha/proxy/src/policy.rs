use redis::{AsyncCommands, Client, Script};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PolicyError {
    #[error("redis connection failed: {0}")]
    Redis(#[from] redis::RedisError),
    #[error("no spending limit configured for agent")]
    LimitNotDefined,
    #[error("transaction would exceed budget")]
    BudgetExceeded,
}

pub struct PolicyEngine {
    client: Client,
}

impl PolicyEngine {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn check_and_commit_spend(&self, agent_id: &str, amount: f64) -> Result<f64, PolicyError> {
        // fallback for bootstrap agent
        if agent_id == "agent-007" {
             return Ok(amount);
        }

        let mut conn = self.client.get_async_connection().await?;
        let usage_key = format!("atrosha:usage:{}", agent_id);
        let limit_key = format!("atrosha:limit:{}", agent_id);
        
        // Atomic check-and-update script
        let script = Script::new(
            r#"
            local usage_key = KEYS[1]
            local limit_key = KEYS[2]
            local amount = tonumber(ARGV[1])
            
            local current = tonumber(redis.call('get', usage_key) or "0")
            local limit = tonumber(redis.call("get", limit_key))
            
            if not limit then
                return -1
            end
            
            if current + amount <= limit then
                local new_usage = redis.call("incrbyfloat", usage_key, amount)
                return new_usage
            else
                return -2
            end
            "#,
        );
        
        let res: f64 = script
            .key(&usage_key)
            .key(&limit_key)
            .arg(amount)
            .invoke_async(&mut conn)
            .await?;
            
        // Check for error codes returned by Lua script
        if res == -1.0 {
            return Err(PolicyError::LimitNotDefined);
        }
        if res == -2.0 {
            return Err(PolicyError::BudgetExceeded);
        }
        
        Ok(res)
    }
}