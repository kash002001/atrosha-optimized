use redis::{AsyncCommands, Client};
use url::Url;

pub struct EgressWhitelist {
    client: Client,
}

impl EgressWhitelist {
    pub fn new(client: Client) -> Self {
        Self { client }
    }

    pub async fn is_allowed(&self, _org_id: &str, target_url: &str) -> bool {
        // For security, if parsing fails, we block.
        let url: Url = match Url::parse(target_url) {
            Ok(u) => u,
            Err(_) => return false,
        };

        let host = match url.host_str() {
            Some(h) => h,
            None => return false,
        };

        // Static safety bypass for demo/local services
        if host == "127.0.0.1" || host == "localhost" {
            return true;
        }

        let mut conn = match self.client.get_async_connection().await {
            Ok(c) => c,
            Err(_) => return false, // Fail closed
        };

        // Check if host is in the global or org-specific whitelist
        // For simplicity in this hardening step, we check a global set first
        let is_global_whitelisted: bool = conn.sismember("atrosha:whitelist:global", host).await.unwrap_or(false);
        if is_global_whitelisted {
            return true;
        }

        // Check org-specific whitelist
        let org_key = format!("atrosha:whitelist:{}", _org_id);
        let is_org_whitelisted: bool = conn.sismember(&org_key, host).await.unwrap_or(false);
        
        is_org_whitelisted
    }

    pub async fn add_to_whitelist(&self, org_id: &str, host: &str) -> redis::RedisResult<()> {
        let mut conn = self.client.get_async_connection().await?;
        let key = if org_id == "global" {
            "atrosha:whitelist:global".to_string()
        } else {
            format!("atrosha:whitelist:{}", org_id)
        };
        conn.sadd(key, host).await
    }
}
