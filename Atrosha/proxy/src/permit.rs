use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use thiserror::Error;
#[derive(Error, Debug)]
pub enum PermitError {
    #[error("invalid token format")]
    InvalidFormat,
    #[error("token expired")]
    Expired,
    #[error("sig verification failed")]
    InvalidSignature,
    #[error("intent hash mismatch")]
    IntentMismatch,
    #[error("missing permit header")]
    MissingPermit,
}
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpendPermit {
    pub permit_id: String,
    pub agent_id: String,
    pub budget_limit: f64,
    pub intent_hash: Option<String>,
    pub exp: i64,
    pub iat: i64,
    pub sim: f32,
    pub matched_policy_id: Option<String>,
}
#[derive(Debug, Serialize, Deserialize)]
struct PermitClaims {
    #[serde(default="generate_permit_id")]
    jti: String,
    sub: String,
    #[serde(default)]
    budget_limit: f64,
    intent_hash: Option<String>,
    exp: i64,
    iat: i64,
    #[serde(default)]
    sim: f32,
    #[serde(default)]
    matched_policy_id: Option<String>,
}
fn generate_permit_id() -> String {
    uuid::Uuid::new_v4().to_string()
}
pub struct PermitValidator {
    decoding_key: DecodingKey,
    validation: Validation,
}
impl PermitValidator {
    pub fn new(secret: &[u8]) -> Self {
        let mut validation=Validation::new(Algorithm::HS256);
        validation.validate_exp=true;
        validation.leeway=30;
        Self {
            decoding_key: DecodingKey::from_secret(secret),
            validation,
        }
    }
    pub fn verify(&self, token: &str) -> Result<SpendPermit, PermitError> {
        let token_data=decode::<PermitClaims>(token, &self.decoding_key, &self.validation)
            .map_err(|e| {
                tracing::warn!(error=%e, "permit decode failed");
                match e.kind() {
                    jsonwebtoken::errors::ErrorKind::ExpiredSignature => PermitError::Expired,
                    jsonwebtoken::errors::ErrorKind::InvalidSignature => PermitError::InvalidSignature,
                    _ => PermitError::InvalidFormat,
                }
            })?;
        let claims=token_data.claims;
        Ok(SpendPermit {
            permit_id: claims.jti,
            agent_id: claims.sub,
            budget_limit: claims.budget_limit,
            intent_hash: claims.intent_hash,
            exp: claims.exp,
            iat: claims.iat,
            sim: claims.sim,
            matched_policy_id: claims.matched_policy_id,
        })
    }
    pub fn verify_req_intent(
        &self,
        permit: &SpendPermit,
        method: &str,
        target_url: &str,
        body: &[u8],
    ) -> Result<(), PermitError> {
        if let Some(expected) = &permit.intent_hash {
            let computed_hash=compute_req_intent_hash(method, target_url, body);
            if computed_hash!=*expected {
                tracing::warn!(
                    permit_id=%permit.permit_id,
                    expected=%expected,
                    computed=%computed_hash,
                    "intent hash mismatch - req tampering detected"
                );
                return Err(PermitError::IntentMismatch);
            }
        }
        Ok(())
    }
}
pub fn compute_req_intent_hash(method: &str, target_url: &str, body: &[u8]) -> String {
    let mut hasher=Sha256::new();
    hasher.update(method.to_uppercase().as_bytes());
    hasher.update(b"|");
    hasher.update(target_url.trim().as_bytes());
    hasher.update(b"|");
    hasher.update(body);
    hex::encode(hasher.finalize())
}
#[allow(dead_code)]
fn sort_json_keys(value: &serde_json::Value) -> serde_json::Value {
    match value {
        serde_json::Value::Object(map) => {
            let mut sorted:Vec<_>=map.iter().collect();
            sorted.sort_by(|a, b| a.0.cmp(b.0));
            serde_json::Value::Object(
                sorted
                    .into_iter()
                    .map(|(k, v)| (k.clone(), sort_json_keys(v)))
                    .collect(),
            )
        }
        serde_json::Value::Array(arr) => {
            serde_json::Value::Array(arr.iter().map(sort_json_keys).collect())
        }
        _ => value.clone(),
    }
}
#[allow(dead_code)]
pub fn compute_intent_hash(task_desc: &str) -> String {
    let mut hasher=Sha256::new();
    hasher.update(task_desc.as_bytes());
    hex::encode(hasher.finalize())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_intent_hash_deterministic() {
        let hash1=compute_intent_hash("transfer $100 to vendor");
        let hash2=compute_intent_hash("transfer $100 to vendor");
        assert_eq!(hash1, hash2);
    }
}