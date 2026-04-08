use criterion::{criterion_group, criterion_main, Criterion, BenchmarkId};
use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::sponge::poseidon::PoseidonConfig;

// Import our internal proxy modules. To do this, atrosha-proxy needs to expose its internals 
// as a lib or we need to declare the modules. In Cargo.toml, the target is usually a bin if it's a proxy.
// However, looking at the proxy code, the main.rs imports `zkp`. We must include it or load it if the bin name is not exposed as a lib.
// Wait, `atrosha-proxy` usually isn't a lib. The benchmark shouldn't define `mod zkp`, it should just use the package namespace "atrosha_proxy".
// Let's assume it's `atrosha_proxy`.

use atrosha_proxy::zkp::policy_lang::parse;
use atrosha_proxy::zkp::prover::ProofGenerator;
use atrosha_proxy::zkp::verifier::ProofVerifier;
use atrosha_proxy::zkp::compiler::PolicyWitness;

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

pub fn pct_benchmarks(c: &mut Criterion) {
    let mut group = c.benchmark_group("PCT 5-Tier Evaluation");

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
    let whitelist_root = Fr::from(999u32);

    for (name, source) in policies {
        let policy = parse(source).unwrap();
        
        group.bench_with_input(BenchmarkId::new("Trusted Setup", name), &policy, |b, p| {
            b.iter(|| ProofGenerator::trusted_setup(p, config.clone()));
        });

        let setup = ProofGenerator::trusted_setup(&policy, config.clone());

        let witness = PolicyWitness {
            tx_amount: Fr::from(500u32),
            agent_role: Fr::from(3u32), // mapped role
            tx_target: Fr::from(999u32),
            whitelist_merkle_path: vec![], // For simplicity, keep topology matched
            tx_timestamp: Fr::from(1750000000u32),
            causal_score_result: Fr::from(9500u32),
            ..PolicyWitness::default()
        };

        group.bench_with_input(BenchmarkId::new("Prove", name), &(&policy, &setup, &witness), |b, (p, s, w)| {
            b.iter(|| ProofGenerator::generate_proof(s, p, config.clone(), (*w).clone(), whitelist_root).unwrap());
        });

        let proof = ProofGenerator::generate_proof(&setup, &policy, config.clone(), witness.clone(), whitelist_root).unwrap();
        let public_inputs = vec![whitelist_root];

        group.bench_with_input(BenchmarkId::new("Verify", name), &(&setup.proving_key.vk, &proof, &public_inputs), |b, (vk, prf, pi)| {
            b.iter(|| ProofVerifier::verify_proof(vk, prf, pi).unwrap());
        });
    }

    group.finish();
}

criterion_group!(benches, pct_benchmarks);
criterion_main!(benches);
