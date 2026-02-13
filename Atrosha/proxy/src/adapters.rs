use async_trait::async_trait;
use reqwest::{Client, Method, StatusCode};
use serde_json::json;
use std::error::Error;
use tracing::info;

#[async_trait]
pub trait RailAdapter: Send + Sync {
    async fn execute(
        &self,
        method: &Method,
        url: &str,
        headers: &reqwest::header::HeaderMap,
        body: &[u8],
    ) -> Result<(StatusCode, String), Box<dyn Error + Send + Sync>>;
}

pub struct HttpAdapter {
    client: Client,
}

impl HttpAdapter {
    pub fn new(client: Client) -> Self {
        Self { client }
    }
}

#[async_trait]
impl RailAdapter for HttpAdapter {
    async fn execute(
        &self,
        method: &Method,
        url: &str,
        headers: &reqwest::header::HeaderMap,
        body: &[u8],
    ) -> Result<(StatusCode, String), Box<dyn Error + Send + Sync>> {
        let mut req = self.client.request(method.clone(), url);
        
        for (k, v) in headers.iter() {
            let key = k.as_str().to_lowercase();
            // Filter out internal headers
            if !key.starts_with("x-atrosha") && key != "host" && key != "content-length" {
                req = req.header(k, v);
            }
        }

        if !body.is_empty() {
            req = req.body(body.to_vec());
        }

        let resp = req.send().await?;
        let status = resp.status();
        let text = resp.text().await?;
        Ok((status, text))
    }
}

use ethers::prelude::*;
use std::convert::TryFrom;
use std::str::FromStr;
use std::sync::Arc;

pub struct EvmAdapter {
    client: Arc<SignerMiddleware<Provider<Http>, LocalWallet>>,
}

impl EvmAdapter {
    pub async fn new() -> Result<Self, Box<dyn Error>> {
        let rpc_url = std::env::var("ETH_RPC_URL").unwrap_or_else(|_| "http://127.0.0.1:8545".to_string());
        let private_key = std::env::var("ETH_PRIVATE_KEY").unwrap_or_else(|_| "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80".to_string());
        
        let provider = Provider::<Http>::try_from(rpc_url)?;
        let chain_id = match provider.get_chainid().await {
            Ok(id) => id,
            Err(e) => {
                tracing::warn!("EVM provider unreachable ({}), defaulting chain_id to 31337", e);
                ethers::types::U256::from(31337)
            }
        };
        
        let wallet = LocalWallet::from_str(&private_key)?.with_chain_id(chain_id.as_u64());
        let client = Arc::new(SignerMiddleware::new(provider, wallet));
        
        Ok(Self { client })
    }

    // fallback that creates a dummy provider pointing nowhere useful
    pub fn noop() -> Self {
        let provider = Provider::<Http>::try_from("http://127.0.0.1:8545").unwrap();
        let wallet = LocalWallet::from_str("ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
            .unwrap()
            .with_chain_id(31337u64);
        let client = Arc::new(SignerMiddleware::new(provider, wallet));
        Self { client }
    }
}

#[async_trait]
impl RailAdapter for EvmAdapter {
    async fn execute(
        &self,
        method: &Method,
        url: &str,
        _headers: &reqwest::header::HeaderMap,
        body: &[u8],
    ) -> Result<(StatusCode, String), Box<dyn Error + Send + Sync>> {
        info!(url = %url, "executing evm transaction");
        println!("DEBUG: EVM ADAPTER CALLED with url {}", url);

        if method != Method::POST {
             return Ok((StatusCode::METHOD_NOT_ALLOWED, "EVM actions must be POST".to_string()));
        }

        let body_json: serde_json::Value = serde_json::from_slice(body).map_err(|_| "Invalid JSON")?;
        let recipient_str = body_json["recipient"].as_str().ok_or("Missing recipient")?;
        let amount_u64 = body_json["amount"].as_u64().ok_or("Missing amount")?;
        
        let to_address = Address::from_str(recipient_str).map_err(|e| format!("Invalid address: {}", e))?;
        
        let tx = TransactionRequest::new()
            .to(to_address)
            .value(amount_u64)
            .from(self.client.address());
            
        let pending_tx = self.client.send_transaction(tx, None).await.map_err(|e| format!("Tx Failed: {}", e))?;
        let tx_hash = format!("{:?}", pending_tx.tx_hash());
        
        let res = json!({
            "status": "broadcasted",
            "network": "testnet",
            "tx_hash": tx_hash,
            "explorer": format!("https://explorer.testnet/tx/{}", tx_hash)
        });
        
        Ok((StatusCode::OK, res.to_string()))
    }
}

pub struct AchAdapter;

impl AchAdapter {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl RailAdapter for AchAdapter {
    async fn execute(
        &self,
        _method: &Method,
        _url: &str,
        _headers: &reqwest::header::HeaderMap,
        _body: &[u8],
    ) -> Result<(StatusCode, String), Box<dyn Error + Send + Sync>> {
        // Simulate ACH processing delay
        std::thread::sleep(std::time::Duration::from_millis(50));
        Ok((StatusCode::ACCEPTED, json!({"status": "pending_batch", "settlement": "T+1"}).to_string()))
    }
}