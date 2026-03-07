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