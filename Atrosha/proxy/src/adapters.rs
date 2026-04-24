use async_trait::async_trait;
use reqwest::{Client, Method, StatusCode};
use serde_json::json;
use std::error::Error;

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
            // strip internal and hop-by-hop headers (C3 already enforced upstream in handlers.rs)
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

        // C3: no hardcoded fallback — fail hard if the private key is not set
        let private_key = std::env::var("ETH_PRIVATE_KEY")
            .map_err(|_| "ETH_PRIVATE_KEY must be set for EVM adapter — refusing to use test key in production")?;

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

    // noop: used when EVM adapter unavailable — uses a zeroed key that can't sign real transactions
    pub fn noop() -> Self {
        // all-zeros key is cryptographically valid but has no associated funds
        let zeroed_key = "0".repeat(64);
        let provider = Provider::<Http>::try_from("http://127.0.0.1:8545")
            .expect("loopback URL is always valid");
        let wallet = LocalWallet::from_str(&zeroed_key)
            .expect("zeroed key is a valid scalar")
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
        tracing::info!(url = %url, "executing evm transaction"); // H2: removed println! debug

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

        // L3: use env-var-configured explorer URL, not a hardcoded placeholder
        let explorer_base = std::env::var("EVM_EXPLORER_URL")
            .unwrap_or_else(|_| "https://etherscan.io".to_string());

        let res = json!({
            "status": "broadcasted",
            "tx_hash": tx_hash,
            "explorer": format!("{}/tx/{}", explorer_base.trim_end_matches('/'), tx_hash)
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
        // H3: was std::thread::sleep — blocking inside async is a tokio anti-pattern
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
        Ok((StatusCode::ACCEPTED, json!({"status": "pending_batch", "settlement": "T+1"}).to_string()))
    }
}