#![allow(dead_code)]
#![allow(unused_imports)]
#![allow(unused_variables)]

use async_trait::async_trait;
use anyhow::Result;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

#[async_trait]
pub trait KmsProvider: Send + Sync {
    async fn fetch_signing_key(&self, key_id: &str) -> Result<Vec<u8>>;
    async fn fetch_verification_key(&self, key_id: &str) -> Result<Vec<u8>>;
}

pub struct MockKms {
    keys: RwLock<HashMap<String, Vec<u8>>>,
    default_key: Vec<u8>,
}

impl MockKms {
    pub fn new(default_secret: &[u8]) -> Self {
        Self {
            keys: RwLock::new(HashMap::new()),
            default_key: default_secret.to_vec(),
        }
    }

    pub async fn set_key(&self, key_id: &str, key: Vec<u8>) {
        let mut keys = self.keys.write().await;
        keys.insert(key_id.to_string(), key);
    }
}

#[async_trait]
impl KmsProvider for MockKms {
    async fn fetch_signing_key(&self, key_id: &str) -> Result<Vec<u8>> {
        // Simulating some latency
        tokio::time::sleep(tokio::time::Duration::from_micros(100)).await;
        let keys = self.keys.read().await;
        if let Some(key) = keys.get(key_id) {
            Ok(key.clone())
        } else {
            Ok(self.default_key.clone())
        }
    }

    async fn fetch_verification_key(&self, key_id: &str) -> Result<Vec<u8>> {
        self.fetch_signing_key(key_id).await
    }
}

pub struct EnvKms {
    secret: Vec<u8>,
}

impl EnvKms {
    pub fn from_env() -> Result<Self> {
        let secret = std::env::var("PERMIT_SECRET")
            .unwrap_or_else(|_| "atrosha-dev-secret".into());
        Ok(Self {
            secret: secret.into_bytes(),
        })
    }
    
    pub fn new(secret: &[u8]) -> Self {
        Self {
            secret: secret.to_vec(),
        }
    }
}

#[async_trait]
impl KmsProvider for EnvKms {
    async fn fetch_signing_key(&self, _key_id: &str) -> Result<Vec<u8>> {
        Ok(self.secret.clone())
    }

    async fn fetch_verification_key(&self, _key_id: &str) -> Result<Vec<u8>> {
        Ok(self.secret.clone())
    }
}

pub type DynKmsProvider = Arc<dyn KmsProvider>;