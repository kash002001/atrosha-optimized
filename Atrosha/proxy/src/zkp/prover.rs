use ark_groth16::{Groth16, ProvingKey, Proof};
use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::SNARK;
use ark_std::rand::{rngs::StdRng, SeedableRng};
use ark_serialize::{CanonicalSerialize, CanonicalDeserialize};

use crate::zkp::compiler::{PolicyCircuit, PolicyWitness};
use crate::zkp::policy_lang::Policy;
use ark_crypto_primitives::sponge::poseidon::PoseidonConfig;

use std::time::Instant;

/// System Parameters for proof generation.
/// In production, these should be generated once per policy during a trusted setup.
#[derive(Clone)]
pub struct Groth16Setup {
    pub proving_key: ProvingKey<Bn254>,
}

pub struct ProofGenerator;

impl ProofGenerator {
    /// Simulates a trusted setup phase for a given policy.
    /// In a real deployment, the ProvingKey is saved to disk and loaded at runtime.
    pub fn trusted_setup(policy: &Policy, poseidon_config: PoseidonConfig<Fr>) -> Groth16Setup {
        let mut rng = StdRng::seed_from_u64(12345); // Deterministic for testing
        
        let dummy_circuit = PolicyCircuit {
            policy: policy.clone(),
            witness: None, 
            poseidon_config,
            whitelist_root: Fr::from(0u32),
        };

        // Groth16 circuit specific setup generates the PK and VK for the exact constraint topology
        let (params, _vk) = Groth16::<Bn254>::circuit_specific_setup(dummy_circuit, &mut rng).unwrap();
        
        Groth16Setup {
            proving_key: params,
        }
    }

    /// Generates a Zero-Knowledge Proof (zkSNARK) evaluating the transaction against the policy.
    pub fn generate_proof(
        setup: &Groth16Setup,
        policy: &Policy,
        poseidon_config: PoseidonConfig<Fr>,
        witness: PolicyWitness,
        whitelist_root: Fr,
    ) -> Result<Proof<Bn254>, String> {
        let mut rng = StdRng::seed_from_u64(98765);
        
        let circuit = PolicyCircuit {
            policy: policy.clone(),
            witness: Some(witness),
            poseidon_config,
            whitelist_root,
        };

        let start = Instant::now();
        
        // Execute the R1CS mapping and generate the zk-SNARK Groth16 proof
        let proof = Groth16::<Bn254>::prove(&setup.proving_key, circuit, &mut rng)
            .map_err(|e| format!("Proof generation failed: {:?}", e))?;
            
        let duration = start.elapsed();
        tracing::debug!("Generated proof in {:?}", duration);
        
        Ok(proof)
    }

    /// Serializes a Groth16 proof into a compact base64-encoded binary string.
    pub fn serialize_proof(proof: &Proof<Bn254>) -> String {
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        let mut bytes = Vec::new();
        proof.serialize_compressed(&mut bytes).unwrap();
        STANDARD.encode(&bytes)
    }

    /// Deserializes a Groth16 proof from a base64-encoded binary string.
    pub fn deserialize_proof(b64: &str) -> Result<Proof<Bn254>, String> {
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        let bytes = STANDARD.decode(b64).map_err(|_| "Invalid base64 encoding".to_string())?;
        Proof::<Bn254>::deserialize_compressed(&bytes[..])
            .map_err(|_| "Invalid proof binary format".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::zkp::policy_lang::parse;
    use ark_crypto_primitives::sponge::poseidon::PoseidonConfig;

    fn dummy_poseidon() -> PoseidonConfig<Fr> {
        PoseidonConfig {
            full_rounds: 8,
            partial_rounds: 31,
            alpha: 5,
            ark: vec![vec![Fr::from(1u32)]],
            mds: vec![vec![Fr::from(1u32)]],
            rate: 2,
            capacity: 1,
        }
    }

    #[test]
    fn test_proof_generation_and_serialization() {
        let policy = parse(r#"
            policy SimpleAuth {
                require tx.amount <= 1000
                require agent.role == "admin"
            }
        "#).unwrap();

        let config = dummy_poseidon();
        
        // 1. Trusted Setup
        let setup = ProofGenerator::trusted_setup(&policy, config.clone());

        // 2. Witness generation
        let witness = PolicyWitness {
            agent_role: Fr::from(3u32), // 3 = admin representation mapped to field element
            tx_amount: Fr::from(500u32), // 500 <= 1000
            ..PolicyWitness::default()
        };

        let start = Instant::now();
        
        // 3. Prove
        let proof_res = ProofGenerator::generate_proof(&setup, &policy, config, witness, Fr::from(0u32));
        assert!(proof_res.is_ok());
        
        let gen_time = start.elapsed();
        println!("Proof generation benchmark: {:?}", gen_time);
        
        // Basic benchmark bound (CI might be slow, but usually should be <500ms on real hardware)
        // We won't strictly assert the time to avoid flaky tests, but we log it.

        let proof = proof_res.unwrap();
        
        // 4. Serialize / Deserialize
        let b64 = ProofGenerator::serialize_proof(&proof);
        assert!(!b64.is_empty());
        
        let decoded_proof = ProofGenerator::deserialize_proof(&b64).unwrap();
        assert_eq!(ProofGenerator::serialize_proof(&decoded_proof), b64);
    }
}
