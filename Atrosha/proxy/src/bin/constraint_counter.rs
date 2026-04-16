use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem};
use atrosha_proxy::zkp::compiler::{PolicyCircuit, PolicyWitness, bn254_poseidon_config};
use atrosha_proxy::zkp::policy_lang::parse;
use ark_bn254::Fr;

fn main() {
    let policies = vec![
        ("Tier 1: Trivial", r#"
            policy Tier1 {
                require tx.amount <= 1000
            }
        "#),
        ("Tier 2: Basic", r#"
            policy Tier2 {
                require tx.amount <= 50000
                require agent.role == 3
            }
        "#),
        ("Tier 3: Moderate", r#"
            policy Tier3 {
                require tx.amount <= 50000
                require tx.target IN org.whitelist
                require agent.role == 3
            }
        "#),
        ("Tier 4: Strict", r#"
            policy Tier4 {
                require tx.amount <= 100000
                require tx.target IN org.whitelist
                require agent.role == 1
                require tx.timestamp >= 1700000000
                require tx.timestamp <= 1800000000
            }
        "#),
    ];

    let config = bn254_poseidon_config();
    for (name, source) in policies {
        let policy = parse(source).unwrap();
        let circuit = PolicyCircuit {
            policy,
            witness: Some(PolicyWitness::default()),
            poseidon_config: config.clone(),
            whitelist_root: Fr::from(0u32),
            request_body_hash: Fr::from(0u32),
            timestamp: Fr::from(0u32),
            policy_version: Fr::from(0u32),
            state_seq: Fr::from(0u32),
        };
        let cs = ConstraintSystem::<Fr>::new_ref();
        circuit.generate_constraints(cs.clone()).unwrap();
        println!("{}: {} constraints (satisfied: {})", name, cs.num_constraints(), cs.is_satisfied().unwrap());
    }
}
