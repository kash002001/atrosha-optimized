use redis::{AsyncCommands, Client};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use url::Url;

const CACHE_TTL_SECS: u64 = 60;
const REFRESH_INTERVAL_SECS: u64 = 45;

struct CacheEntry {
    hosts: HashSet<String>,
    fetched_at: Instant,
}

pub struct EgressWhitelist {
    client: Client,
    // org_id -> cached host set
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
}

impl EgressWhitelist {
    pub fn new(client: Client) -> Self {
        Self {
            client,
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// spawn a background task that preloads the global whitelist every REFRESH_INTERVAL_SECS
    pub fn spawn_refresh(self: &Arc<Self>) {
        let wl = Arc::clone(self);
        tokio::spawn(async move {
            loop {
                if let Err(e) = wl.refresh_cache("global").await {
                    tracing::debug!(error = %e, "whitelist background refresh failed");
                }
                tokio::time::sleep(Duration::from_secs(REFRESH_INTERVAL_SECS)).await;
            }
        });
    }

    async fn refresh_cache(&self, org_id: &str) -> anyhow::Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;

        let global_key = "atrosha:whitelist:global";
        let global_members: HashSet<String> = conn.smembers(global_key).await.unwrap_or_default();

        {
            let mut cache = self.cache.write().await;
            cache.insert("global".to_string(), CacheEntry {
                hosts: global_members,
                fetched_at: Instant::now(),
            });
        }

        // also refresh org-specific if not "global"
        if org_id != "global" {
            let org_key = format!("atrosha:whitelist:{}", org_id);
            let org_members: HashSet<String> = conn.smembers(&org_key).await.unwrap_or_default();
            let mut cache = self.cache.write().await;
            cache.insert(org_id.to_string(), CacheEntry {
                hosts: org_members,
                fetched_at: Instant::now(),
            });
        }

        Ok(())
    }

    async fn check_cache(&self, key: &str, host: &str) -> Option<bool> {
        let cache = self.cache.read().await;
        if let Some(entry) = cache.get(key) {
            if entry.fetched_at.elapsed() < Duration::from_secs(CACHE_TTL_SECS) {
                return Some(entry.hosts.contains(host));
            }
        }
        None
    }

    pub async fn is_allowed(&self, org_id: &str, target_url: &str) -> bool {
        let url: Url = match Url::parse(target_url) {
            Ok(u) => u,
            Err(_) => return false,
        };

        let host = match url.host_str() {
            Some(h) => h.to_string(),
            None => return false,
        };

        // fast path: check in-memory cache first
        if let Some(true) = self.check_cache("global", &host).await {
            return true;
        }
        if let Some(true) = self.check_cache(org_id, &host).await {
            return true;
        }

        // if cache had entries but host wasn't in them, and cache is still fresh, deny early
        {
            let cache = self.cache.read().await;
            let global_fresh = cache.get("global")
                .map_or(false, |e| e.fetched_at.elapsed() < Duration::from_secs(CACHE_TTL_SECS));
            let org_fresh = cache.get(org_id)
                .map_or(false, |e| e.fetched_at.elapsed() < Duration::from_secs(CACHE_TTL_SECS));

            if global_fresh && org_fresh {
                return false;
            }
        }

        // slow path: cache miss or stale — fetch from redis
        let mut conn = match self.client.get_multiplexed_async_connection().await {
            Ok(c) => c,
            Err(_) => return false, // fail closed
        };

        let is_global: bool = conn.sismember("atrosha:whitelist:global", &host).await.unwrap_or(false);
        if is_global {
            // warm the cache asynchronously
            let _ = self.refresh_cache(org_id).await;
            return true;
        }

        let org_key = format!("atrosha:whitelist:{}", org_id);
        let is_org: bool = conn.sismember(&org_key, &host).await.unwrap_or(false);

        // warm cache in background on miss too
        let _ = self.refresh_cache(org_id).await;

        is_org
    }
}
