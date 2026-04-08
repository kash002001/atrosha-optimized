use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem};
use atrosha_proxy::zkp::compiler::{PolicyCircuit, PolicyWitness};
use atrosha_proxy::zkp::policy_lang::parse;
use ark_bn254::Fr;
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
                require agent.role == "admin"
            }
        "#),
        ("Tier 3: Moderate", r#"
            policy Tier3 {
                require tx.amount <= 50000
                require tx.target IN org.whitelist
                require agent.role == "admin"
            }
        "#),
        ("Tier 4: Strict", r#"
            policy Tier4 {
                require tx.amount <= 100000
                require tx.target IN org.whitelist
                require agent.role == "finance"
                require tx.timestamp >= 1700000000
                require tx.timestamp <= 1800000000
            }
        "#),
        ("Tier 5: Complex (Semantic)", r#"
            policy Tier5 {
                require tx.amount <= 250000
                require tx.target IN org.whitelist
                require agent.role == "admin"
                require tx.timestamp >= 1700000000
                require tx.timestamp <= 1800000000
                require fn.causal_score >= 9000
            }
        "#),
    ];

    let config = dummy_poseidon();
    for (name, source) in policies {
        let policy = parse(source).unwrap();
        let circuit = PolicyCircuit {
            policy,
            witness: Some(PolicyWitness::default()),
            poseidon_config: config.clone(),
            whitelist_root: Fr::from(0u32),
        };
        let cs = ConstraintSystem::<Fr>::new_ref();
        circuit.generate_constraints(cs.clone()).unwrap();
        println!("{}: {} constraints", name, cs.num_constraints());
    }
}
