use ark_groth16::{Groth16, VerifyingKey, prepare_verifying_key, PreparedVerifyingKey, Proof};
use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::SNARK;
use std::time::Instant;
use std::sync::OnceLock;
use axum::{Json, response::IntoResponse, http::StatusCode};
use serde::{Deserialize, Serialize};

pub struct ProofVerifier;

static CACHED_PVK: OnceLock<CachedVerifyingData> = OnceLock::new();

struct CachedVerifyingData {
    pvk: PreparedVerifyingKey<Bn254>,
}

impl ProofVerifier {
    // pre-process and cache the verifying key at startup
    pub fn cache_vk(vk: &VerifyingKey<Bn254>) {
        let pvk = prepare_verifying_key(vk);
        let _ = CACHED_PVK.set(CachedVerifyingData { pvk });
    }

    pub fn verify_proof(
        vk: &VerifyingKey<Bn254>,
        proof: &Proof<Bn254>,
        public_inputs: &[Fr],
    ) -> Result<bool, String> {
        // use cached pvk if available, otherwise prepare each time
        let pvk = if let Some(cached) = CACHED_PVK.get() {
            &cached.pvk
        } else {
            // fallback: prepare inline (slower, ~0.5ms overhead)
            &prepare_verifying_key(vk)
        };

        let start = Instant::now();

        let is_valid = Groth16::<Bn254>::verify_with_processed_vk(pvk, public_inputs, proof)
            .map_err(|e| format!("verification error: {:?}", e))?;

        let duration = start.elapsed();
        tracing::debug!(
            elapsed_us = duration.as_micros(),
            valid = is_valid,
            "o(1) verification complete"
        );

        Ok(is_valid)
    }
}

// ---------------------------------------------------------
// REST API Endpoint
// ---------------------------------------------------------

#[derive(Deserialize)]
pub struct VerifyProofRequest {
    pub proof_b64: String,
    pub whitelist_root: u64,
    pub request_body_hash: u64,
    pub timestamp: u64,
    pub policy_version: u64,
    pub state_seq: u64,
}

#[derive(Serialize)]
pub struct VerifyProofResponse {
    pub is_valid: bool,
    pub verified_at_ms: u128,
}

pub async fn verify_proof_endpoint(
    axum::extract::State(state): axum::extract::State<crate::state::AppState>,
    Json(payload): Json<VerifyProofRequest>,
) -> impl IntoResponse {
    let start = Instant::now();

    let proof = match crate::zkp::prover::ProofGenerator::deserialize_proof(&payload.proof_b64) {
        Ok(p) => p,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(VerifyProofResponse { is_valid: false, verified_at_ms: 0 })),
    };

    let mut is_valid = false;
    if let Some(setup) = &state.zkp_setup {
        let public_inputs = vec![
            Fr::from(payload.whitelist_root as u32),
            Fr::from(payload.request_body_hash as u32),
            Fr::from(payload.timestamp as u32),
            Fr::from(payload.policy_version as u32),
            Fr::from(payload.state_seq as u32),
        ];
        if let Ok(v) = ProofVerifier::verify_proof(&setup.proving_key.vk, &proof, &public_inputs) {
            is_valid = v;
        }
    }

    let duration = start.elapsed();

    (StatusCode::OK, Json(VerifyProofResponse {
        is_valid,
        verified_at_ms: duration.as_millis(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::zkp::prover::ProofGenerator;
    use crate::zkp::policy_lang::parse;
    use crate::zkp::compiler::{PolicyWitness, bn254_poseidon_config};

    #[test]
    fn test_verifier_o1_benchmark() {
        let policy = parse(r#"
            policy LimitOnly {
                require tx.amount <= 50000
            }
        "#).unwrap();

        let config = bn254_poseidon_config();
        let setup = ProofGenerator::trusted_setup(&policy, config.clone());

        // cache the VK for faster verification
        ProofVerifier::cache_vk(&setup.proving_key.vk);

        let witness = PolicyWitness {
            tx_amount: Fr::from(2000u32),
            tx_timestamp: Fr::from(1700000000u64),
            ..PolicyWitness::default()
        };

        let whitelist_root = Fr::from(0u32);
        let body_hash = Fr::from(123u32);
        let ts = Fr::from(1700000000u64);
        let pv = Fr::from(1u32);
        let seq = Fr::from(42u32);

        let proof = ProofGenerator::generate_proof(
            &setup, &policy, config, witness, whitelist_root, body_hash, ts, pv, seq,
        ).unwrap();

        let start = Instant::now();
        let public_inputs = vec![whitelist_root, body_hash, ts, pv, seq];

        let is_valid = ProofVerifier::verify_proof(&setup.proving_key.vk, &proof, &public_inputs).unwrap();
        let verification_time = start.elapsed();

        println!("verification time: {:?}", verification_time);
        assert!(verification_time.as_millis() < 150, "verification should be fast (<150ms debug, <5ms release)");
        assert!(is_valid);

        // wrong public inputs → should fail
        let bad_inputs = vec![Fr::from(99999u32), body_hash, ts, pv, seq];
        let is_valid = ProofVerifier::verify_proof(&setup.proving_key.vk, &proof, &bad_inputs).unwrap();
        assert!(!is_valid);
    }
}
