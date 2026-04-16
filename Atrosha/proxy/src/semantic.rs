use reqwest::{Client, StatusCode as ReqwestStatus};
use serde::{Deserialize, Serialize};
use std::time::Instant;

// sidecar client for the Atrosha Semantic Engine (FastAPI)
// calls POST /classify for payload inspection and POST /verify for intent matching

#[derive(Debug, Clone, Serialize)]
pub struct ClassifyRequest {
    pub method: String,
    pub target_url: String,
    pub headers: std::collections::HashMap<String, String>,
    pub body: serde_json::Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct VerifyRequest {
    pub intent: String,
    pub action: String,
    pub threshold: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SemanticVerdict {
    pub verdict: String,     // ALLOW, DENY, QUARANTINE
    pub confidence: f64,
    pub latency_ms: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct VerifyResult {
    pub verdict: String,     // APPROVE, REJECT
    pub similarity: f64,
    pub threshold: f64,
    pub latency_ms: f64,
}

#[derive(Debug, Clone)]
pub struct SemanticClient {
    client: Client,
    base_url: String,
}

impl SemanticClient {
    pub fn new(base_url: &str) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_millis(500)) // hard 500ms timeout
            .build()
            .expect("failed to build semantic client");
        Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    pub async fn classify(
        &self,
        method: &str,
        target_url: &str,
        headers: &axum::http::HeaderMap,
        body: &[u8],
    ) -> Result<SemanticVerdict, SemanticError> {
        let t0 = Instant::now();

        let mut hdr_map = std::collections::HashMap::new();
        for (k, v) in headers.iter() {
            if let Ok(val) = v.to_str() {
                hdr_map.insert(k.to_string(), val.to_string());
            }
        }

        let body_val = serde_json::from_slice(body)
            .unwrap_or_else(|_| serde_json::Value::String(
                String::from_utf8_lossy(body).to_string()
            ));

        let req = ClassifyRequest {
            method: method.to_string(),
            target_url: target_url.to_string(),
            headers: hdr_map,
            body: body_val,
        };

        let url = format!("{}/classify", self.base_url);

        let resp = self.client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!(error = %e, elapsed_ms = ?t0.elapsed().as_millis(), "semantic engine unreachable");
                SemanticError::Unavailable
            })?;

        if resp.status() != ReqwestStatus::OK {
            tracing::warn!(status = %resp.status(), "semantic engine returned non-200");
            return Err(SemanticError::BadResponse);
        }

        let verdict: SemanticVerdict = resp.json().await.map_err(|e| {
            tracing::warn!(error = %e, "failed to parse semantic verdict");
            SemanticError::BadResponse
        })?;

        tracing::info!(
            verdict = %verdict.verdict,
            confidence = %verdict.confidence,
            engine_latency_ms = %verdict.latency_ms,
            total_latency_ms = ?t0.elapsed().as_millis(),
            "semantic firewall verdict"
        );

        Ok(verdict)
    }

    /// compare user's locked intent against agent's proposed action via /verify
    pub async fn verify_intent(
        &self,
        intent: &str,
        action: &str,
        threshold: f64,
    ) -> Result<VerifyResult, SemanticError> {
        let t0 = Instant::now();

        let req = VerifyRequest {
            intent: intent.to_string(),
            action: action.to_string(),
            threshold,
        };

        let url = format!("{}/verify", self.base_url);

        let resp = self.client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!(error = %e, elapsed_ms = ?t0.elapsed().as_millis(), "semantic engine /verify unreachable");
                SemanticError::Unavailable
            })?;

        if resp.status() != ReqwestStatus::OK {
            tracing::warn!(status = %resp.status(), "semantic engine /verify returned non-200");
            return Err(SemanticError::BadResponse);
        }

        let result: VerifyResult = resp.json().await.map_err(|e| {
            tracing::warn!(error = %e, "failed to parse verify result");
            SemanticError::BadResponse
        })?;

        tracing::info!(
            verdict = %result.verdict,
            similarity = %result.similarity,
            threshold = %result.threshold,
            engine_latency_ms = %result.latency_ms,
            total_latency_ms = ?t0.elapsed().as_millis(),
            "intent verification verdict"
        );

        Ok(result)
    }

    // fetch 16-bit fixed-point quantized embeddings for SNARK circuit
    pub async fn embed_fixed(
        &self,
        intent: &str,
        action: &str,
    ) -> Result<EmbedFixedResult, SemanticError> {
        let t0 = Instant::now();

        let req = serde_json::json!({
            "intent": intent,
            "action": action,
        });

        let url = format!("{}/embed-fixed", self.base_url);

        let resp = self.client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!(error = %e, "semantic engine /embed-fixed unreachable");
                SemanticError::Unavailable
            })?;

        if resp.status() != ReqwestStatus::OK {
            tracing::warn!(status = %resp.status(), "semantic engine /embed-fixed returned non-200");
            return Err(SemanticError::BadResponse);
        }

        let result: EmbedFixedResult = resp.json().await.map_err(|e| {
            tracing::warn!(error = %e, "failed to parse embed-fixed result");
            SemanticError::BadResponse
        })?;

        tracing::debug!(
            dim = result.dim,
            latency_ms = %result.latency_ms,
            total_ms = ?t0.elapsed().as_millis(),
            "embed-fixed vectors received"
        );

        Ok(result)
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct EmbedFixedResult {
    pub u: Vec<i64>,
    pub v: Vec<i64>,
    pub dim: usize,
    pub latency_ms: f64,
}

// pillar 2: causal intent verification (do-calculus)

#[derive(Debug, Clone, Serialize)]
pub struct CausalVerifyRequest {
    pub intent: String,
    pub action: String,
    pub trace: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CausalVerdict {
    pub verdict: String,     // CAUSAL or ACAUSAL
    pub ate: f64,            // average treatment effect
    pub p_value: f64,
    pub treated: f64,
    pub control: f64,
    pub dag_nodes: usize,
    pub dag_edges: usize,
    pub latency_ms: f64,
    pub reason: String,
}

impl SemanticClient {
    pub async fn causal_verify(
        &self,
        intent: &str,
        action: &str,
        trace: Vec<serde_json::Value>,
    ) -> Result<CausalVerdict, SemanticError> {
        let t0 = Instant::now();

        let req = CausalVerifyRequest {
            intent: intent.to_string(),
            action: action.to_string(),
            trace,
        };

        let url = format!("{}/causal-verify", self.base_url);

        let resp = self.client
            .post(&url)
            .json(&req)
            .send()
            .await
            .map_err(|e| {
                tracing::warn!(error = %e, "semantic engine /causal-verify unreachable");
                SemanticError::Unavailable
            })?;

        if resp.status() != ReqwestStatus::OK {
            tracing::warn!(status = %resp.status(), "semantic engine /causal-verify returned non-200");
            return Err(SemanticError::BadResponse);
        }

        let result: CausalVerdict = resp.json().await.map_err(|e| {
            tracing::warn!(error = %e, "failed to parse causal verdict");
            SemanticError::BadResponse
        })?;

        tracing::info!(
            verdict = %result.verdict,
            ate = %result.ate,
            p_value = %result.p_value,
            dag_nodes = result.dag_nodes,
            engine_latency_ms = %result.latency_ms,
            total_latency_ms = ?t0.elapsed().as_millis(),
            "causal verification verdict"
        );

        Ok(result)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum SemanticError {
    #[error("semantic engine unavailable")]
    Unavailable,
    #[error("bad response from semantic engine")]
    BadResponse,
}
