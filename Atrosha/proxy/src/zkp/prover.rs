use ark_groth16::{Groth16, ProvingKey, Proof};
use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::SNARK;
use ark_std::rand::{rngs::StdRng, SeedableRng};
use ark_serialize::{CanonicalSerialize, CanonicalDeserialize};

use crate::zkp::compiler::{PolicyCircuit, PolicyWitness};
use crate::zkp::policy_lang::Policy;
use ark_crypto_primitives::sponge::poseidon::PoseidonConfig;

use std::time::Instant;

#[derive(Clone)]
pub struct Groth16Setup {
    pub proving_key: ProvingKey<Bn254>,
}

pub struct ProofGenerator;

impl ProofGenerator {
    pub fn trusted_setup(policy: &Policy, poseidon_config: PoseidonConfig<Fr>) -> Groth16Setup {
        let mut rng = StdRng::seed_from_u64(12345);

        let dummy_circuit = PolicyCircuit {
            policy: policy.clone(),
            witness: None,
            poseidon_config,
            whitelist_root: Fr::from(0u32),
            request_body_hash: Fr::from(0u32),
            timestamp: Fr::from(0u32),
            policy_version: Fr::from(0u32),
            state_seq: Fr::from(0u32),
        };

        let (params, _vk) = Groth16::<Bn254>::circuit_specific_setup(dummy_circuit, &mut rng).unwrap();

        Groth16Setup {
            proving_key: params,
        }
    }

    pub fn generate_proof(
        setup: &Groth16Setup,
        policy: &Policy,
        poseidon_config: PoseidonConfig<Fr>,
        witness: PolicyWitness,
        whitelist_root: Fr,
        request_body_hash: Fr,
        timestamp: Fr,
        policy_version: Fr,
        state_seq: Fr,
    ) -> Result<Proof<Bn254>, String> {
        let mut rng = StdRng::seed_from_u64(98765);

        let circuit = PolicyCircuit {
            policy: policy.clone(),
            witness: Some(witness),
            poseidon_config,
            whitelist_root,
            request_body_hash,
            timestamp,
            policy_version,
            state_seq,
        };

        let start = Instant::now();

        let proof = Groth16::<Bn254>::prove(&setup.proving_key, circuit, &mut rng)
            .map_err(|e| format!("Proof generation failed: {:?}", e))?;

        let duration = start.elapsed();
        tracing::debug!(
            elapsed_ms = duration.as_millis(),
            "groth16 proof generated"
        );

        Ok(proof)
    }

    pub fn serialize_proof(proof: &Proof<Bn254>) -> Result<String, String> {
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        let mut bytes = Vec::new();
        proof.serialize_compressed(&mut bytes).map_err(|e| e.to_string())?;
        Ok(STANDARD.encode(&bytes))
    }

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
    use crate::zkp::compiler::bn254_poseidon_config;
    use ark_relations::r1cs::{ConstraintSystem, ConstraintSynthesizer};

    fn build_test_witness(root: Fr) -> (PolicyWitness, Fr) {
        let witness = PolicyWitness {
            tx_amount: Fr::from(500u32),
            agent_role: Fr::from(3u32),
            tx_timestamp: Fr::from(1700000000u64),
            ..PolicyWitness::default()
        };
        (witness, root)
    }

    #[test]
    fn test_proof_generation_and_serialization() {
        let policy = parse(r#"
            policy SimpleAuth {
                require tx.amount <= 1000
                require agent.role == 3
            }
        "#).unwrap();

        let config = bn254_poseidon_config();

        let setup = ProofGenerator::trusted_setup(&policy, config.clone());

        let witness = PolicyWitness {
            agent_role: Fr::from(3u32),
            tx_amount: Fr::from(500u32),
            tx_timestamp: Fr::from(1700000000u64),
            ..PolicyWitness::default()
        };

        let root = Fr::from(0u32);

        let start = Instant::now();
        let proof_res = ProofGenerator::generate_proof(
            &setup, &policy, config, witness, root,
            Fr::from(999u32), Fr::from(1700000000u64), Fr::from(1u32), Fr::from(42u32),
        );

        let gen_time = start.elapsed();
        println!("proof generation: {:?}", gen_time);

        assert!(proof_res.is_ok(), "proof gen failed: {:?}", proof_res.err());

        let proof = proof_res.unwrap();

        let b64 = ProofGenerator::serialize_proof(&proof).unwrap();
        assert!(!b64.is_empty());

        let decoded = ProofGenerator::deserialize_proof(&b64).unwrap();
        assert_eq!(ProofGenerator::serialize_proof(&decoded).unwrap(), b64);
    }

    #[test]
    fn test_constraint_count_budget() {
        let policy = parse(r#"
            policy FullBudget {
                require tx.amount <= 10000
                require tx.target IN org.whitelist
                require agent.role == 1
            }
        "#).unwrap();

        let config = bn254_poseidon_config();
        let cs = ConstraintSystem::<Fr>::new_ref();

        let circuit = PolicyCircuit {
            policy,
            witness: None,
            poseidon_config: config,
            whitelist_root: Fr::from(0u32),
            request_body_hash: Fr::from(0u32),
            timestamp: Fr::from(0u32),
            policy_version: Fr::from(0u32),
            state_seq: Fr::from(0u32),
        };

        circuit.generate_constraints(cs.clone()).unwrap();
        let count = cs.num_constraints();
        println!("full budget constraint count: {}", count);
    }
}
