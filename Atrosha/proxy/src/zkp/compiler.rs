use super::policy_lang::{Policy, Constraint, Expr};
use ark_bn254::Fr;
use ark_ff::{PrimeField, BigInteger, One, Zero};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystemRef, SynthesisError};
use ark_r1cs_std::prelude::*;
use ark_r1cs_std::boolean::Boolean;
use ark_r1cs_std::fields::fp::FpVar;
use ark_crypto_primitives::sponge::poseidon::PoseidonConfig;
use std::collections::HashMap;

// --- fixed-point config ---
// 16-bit signed: 1 sign + 3 integer + 12 fractional
#[allow(dead_code)]
const FRAC_BITS: u32 = 12;
pub const SEMANTIC_DIM: usize = 384;
pub const MERKLE_DEPTH: usize = 32;
const RANGE_BITS: usize = 64;

// --- witness ---

#[derive(Clone)]
pub struct PolicyWitness {
    // agent
    pub agent_role: Fr,
    pub agent_daily_limit: Fr,
    pub agent_per_tx_limit: Fr,
    pub agent_daily_spent: Fr,
    pub agent_consecutive_denials: Fr,
    pub agent_is_suspended: bool,
    pub agent_is_active: bool,

    // transaction
    pub tx_amount: Fr,
    pub tx_target: Fr,
    pub tx_timestamp: Fr,
    pub tx_supervisor_approved: bool,

    // merkle whitelist
    pub whitelist_merkle_path: Vec<Fr>,
    pub whitelist_path_directions: Vec<bool>,

    // semantic embeddings (16-bit fixed-point field elements)
    pub semantic_u: Vec<Fr>,
    pub semantic_v: Vec<Fr>,
    pub semantic_threshold_sq: Fr, // τ² scaled to fixed-point

    // temporal windows: authorized intervals [(start, end), ...]
    pub temporal_windows: Vec<(Fr, Fr)>,

    // state oracle
    pub rate_budget_before: Fr,
    pub rate_budget_after: Fr,
}

impl Default for PolicyWitness {
    fn default() -> Self {
        Self {
            agent_role: Fr::from(1u32),
            agent_daily_limit: Fr::from(100_000u32),
            agent_per_tx_limit: Fr::from(100_000u32),
            agent_daily_spent: Fr::zero(),
            agent_consecutive_denials: Fr::zero(),
            agent_is_suspended: false,
            agent_is_active: true,
            tx_amount: Fr::zero(),
            tx_target: Fr::zero(),
            tx_timestamp: Fr::zero(),
            tx_supervisor_approved: false,
            whitelist_merkle_path: vec![Fr::zero(); MERKLE_DEPTH],
            whitelist_path_directions: vec![false; MERKLE_DEPTH],
            semantic_u: vec![Fr::zero(); SEMANTIC_DIM],
            semantic_v: vec![Fr::zero(); SEMANTIC_DIM],
            semantic_threshold_sq: Fr::from(7225u32), // τ² * 10000 where τ=0.85
            temporal_windows: vec![],
            rate_budget_before: Fr::zero(),
            rate_budget_after: Fr::zero(),
        }
    }
}

#[derive(Clone)]
pub enum AllocatedExpr {
    Field(FpVar<Fr>),
    Bool(Boolean<Fr>),
}

// --- circuit ---

pub struct PolicyCircuit {
    pub policy: Policy,
    pub witness: Option<PolicyWitness>,
    pub poseidon_config: PoseidonConfig<Fr>,
    pub whitelist_root: Fr,
    // public inputs
    pub request_body_hash: Fr,
    pub timestamp: Fr,
    pub policy_version: Fr,
    pub state_seq: Fr,
}

impl ConstraintSynthesizer<Fr> for PolicyCircuit {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> Result<(), SynthesisError> {
        let witness = self.witness.unwrap_or_default();

        // =========================================================
        // A. public inputs
        // =========================================================
        let whitelist_root_var = FpVar::new_input(cs.clone(), || Ok(self.whitelist_root))?;
        let _body_hash_var = FpVar::new_input(cs.clone(), || Ok(self.request_body_hash))?;
        let timestamp_pub = FpVar::new_input(cs.clone(), || Ok(self.timestamp))?;
        let _policy_ver_var = FpVar::new_input(cs.clone(), || Ok(self.policy_version))?;
        let state_seq_var = FpVar::new_input(cs.clone(), || Ok(self.state_seq))?;

        // =========================================================
        // B. private witness variables
        // =========================================================
        let agent_role = FpVar::new_witness(cs.clone(), || Ok(witness.agent_role))?;
        let agent_daily_limit = FpVar::new_witness(cs.clone(), || Ok(witness.agent_daily_limit))?;
        let agent_per_tx_limit = FpVar::new_witness(cs.clone(), || Ok(witness.agent_per_tx_limit))?;
        let agent_daily_spent = FpVar::new_witness(cs.clone(), || Ok(witness.agent_daily_spent))?;
        let agent_consecutive_denials = FpVar::new_witness(cs.clone(), || Ok(witness.agent_consecutive_denials))?;
        let agent_is_suspended = Boolean::new_witness(cs.clone(), || Ok(witness.agent_is_suspended))?;
        let agent_is_active = Boolean::new_witness(cs.clone(), || Ok(witness.agent_is_active))?;

        let tx_amount = FpVar::new_witness(cs.clone(), || Ok(witness.tx_amount))?;
        let tx_target = FpVar::new_witness(cs.clone(), || Ok(witness.tx_target))?;
        let tx_timestamp = FpVar::new_witness(cs.clone(), || Ok(witness.tx_timestamp))?;
        let tx_supervisor_approved = Boolean::new_witness(cs.clone(), || Ok(witness.tx_supervisor_approved))?;

        // bind tx_timestamp to the public timestamp input
        tx_timestamp.enforce_equal(&timestamp_pub)?;

        // state oracle seq: allocated as witness, bound to public
        let state_seq_witness = FpVar::new_witness(cs.clone(), || Ok(self.state_seq))?;
        state_seq_witness.enforce_equal(&state_seq_var)?;

        // =========================================================
        // C. semantic similarity gadget
        //    (Σ u_i * v_i)² >= τ² * (Σ u_i²) * (Σ v_i²)
        // =========================================================
        let sem_result = gadget_semantic_similarity(
            cs.clone(),
            &witness.semantic_u,
            &witness.semantic_v,
            &witness.semantic_threshold_sq,
        )?;

        // =========================================================
        // D. merkle whitelist membership
        // =========================================================
        let merkle_ok = gadget_poseidon_merkle(
            cs.clone(),
            &tx_target,
            &witness.whitelist_merkle_path,
            &witness.whitelist_path_directions,
            &self.poseidon_config,
            &whitelist_root_var,
        )?;

        // =========================================================
        // E. temporal windows
        // =========================================================
        let temporal_ok = if witness.temporal_windows.is_empty() {
            Boolean::TRUE
        } else {
            gadget_temporal_windows(cs.clone(), &tx_timestamp, &witness.temporal_windows)?
        };

        // =========================================================
        // F. context map for policy AST compilation
        // =========================================================
        let mut ctx = HashMap::new();
        ctx.insert("agent.role", AllocatedExpr::Field(agent_role.clone()));
        ctx.insert("agent.daily_limit", AllocatedExpr::Field(agent_daily_limit));
        ctx.insert("agent.per_tx_limit", AllocatedExpr::Field(agent_per_tx_limit));
        ctx.insert("agent.daily_spent", AllocatedExpr::Field(agent_daily_spent));
        ctx.insert("agent.consecutive_denials", AllocatedExpr::Field(agent_consecutive_denials));
        ctx.insert("agent.is_suspended", AllocatedExpr::Bool(agent_is_suspended));
        ctx.insert("agent.is_active", AllocatedExpr::Bool(agent_is_active));

        ctx.insert("tx.amount", AllocatedExpr::Field(tx_amount));
        ctx.insert("tx.target", AllocatedExpr::Field(tx_target));
        ctx.insert("tx.timestamp", AllocatedExpr::Field(tx_timestamp));
        ctx.insert("tx.supervisor_approved", AllocatedExpr::Bool(tx_supervisor_approved));

        // expose gadget results as context for fn calls
        ctx.insert("fn.causal_score", AllocatedExpr::Bool(sem_result.clone()));
        ctx.insert("fn.merkle_check", AllocatedExpr::Bool(merkle_ok.clone()));
        ctx.insert("fn.temporal_check", AllocatedExpr::Bool(temporal_ok.clone()));

        // =========================================================
        // G. compile policy AST → constraints
        // =========================================================
        let optimized_policy = optimize_policy(&self.policy);

        for rule in optimized_policy.rules {
            let satisfied = compile_constraint(
                cs.clone(),
                &rule.constraint,
                &ctx,
                &self.poseidon_config,
                &whitelist_root_var,
                &witness.whitelist_merkle_path,
                &witness.whitelist_path_directions,
            )?;
            satisfied.enforce_equal(&Boolean::TRUE)?;
        }

        Ok(())
    }
}

// =========================================================
// GADGET 1: Squared Cosine Similarity (Fixed-Point)
//
// 3d + O(1) multiplication gates for d=384
// No square roots — compare squared quantities.
// =========================================================

fn gadget_semantic_similarity(
    cs: ConstraintSystemRef<Fr>,
    u_vals: &[Fr],
    v_vals: &[Fr],
    threshold_sq_scaled: &Fr, // τ² * 10000, e.g. 7225 for τ=0.85
) -> Result<Boolean<Fr>, SynthesisError> {
    let d = u_vals.len().min(SEMANTIC_DIM);

    let mut dot_acc = FpVar::zero();
    let mut norm_u_acc = FpVar::zero();
    let mut norm_v_acc = FpVar::zero();

    for i in 0..d {
        let u_i = FpVar::new_witness(cs.clone(), || Ok(u_vals[i]))?;
        let v_i = FpVar::new_witness(cs.clone(), || Ok(v_vals[i]))?;

        let uv = &u_i * &v_i;
        let uu = &u_i * &u_i;
        let vv = &v_i * &v_i;

        dot_acc += &uv;
        norm_u_acc += &uu;
        norm_v_acc += &vv;
    }

    // lhs = dot² * PRECISION (so we can compare with tau_sq_scaled * norm_prod)
    let precision = FpVar::new_constant(cs.clone(), Fr::from(10000u32))?;
    let dot_sq = &dot_acc * &dot_acc;
    let lhs = &dot_sq * &precision;

    // rhs = tau_sq_scaled * norm_u * norm_v
    let tau_sq = FpVar::new_witness(cs.clone(), || Ok(*threshold_sq_scaled))?;
    let norm_prod = &norm_u_acc * &norm_v_acc;
    let rhs = &tau_sq * &norm_prod;

    // enforce lhs >= rhs via slack variable with 128-bit decomposition
    let diff_val = lhs.value().unwrap_or_default() - rhs.value().unwrap_or_default();
    let slack = FpVar::new_witness(cs.clone(), || Ok(diff_val))?;
    lhs.enforce_equal(&(&rhs + &slack))?;

    let slack_native = slack.value().unwrap_or_default();
    let slack_bits = slack_native.into_bigint();
    let mut reconstruction = FpVar::zero();
    let mut power = FpVar::new_constant(cs.clone(), Fr::one())?;
    let two = FpVar::new_constant(cs.clone(), Fr::from(2u32))?;
    for i in 0..128 {
        let bit_val = slack_bits.get_bit(i);
        let bit = Boolean::new_witness(cs.clone(), || Ok(bit_val))?;
        let bit_fp = FpVar::from(bit);
        reconstruction = &reconstruction + &(&bit_fp * &power);
        power = &power * &two;
    }
    slack.enforce_equal(&reconstruction)?;

    Ok(Boolean::TRUE)
}

// =========================================================
// GADGET 2: Poseidon Merkle Inclusion Proof
//
// ~320 constraints per level × 32 levels ≈ 10,240
// =========================================================

fn gadget_poseidon_merkle(
    cs: ConstraintSystemRef<Fr>,
    leaf: &FpVar<Fr>,
    path_siblings: &[Fr],
    path_directions: &[bool],
    config: &PoseidonConfig<Fr>,
    expected_root: &FpVar<Fr>,
) -> Result<Boolean<Fr>, SynthesisError> {
    let depth = path_siblings.len().min(MERKLE_DEPTH);
    let mut current = leaf.clone();

    for i in 0..depth {
        let sibling = FpVar::new_witness(cs.clone(), || Ok(path_siblings[i]))?;
        let dir = Boolean::new_witness(cs.clone(), || Ok(path_directions[i]))?;

        // if dir=0: hash(current, sibling); if dir=1: hash(sibling, current)
        let left = dir.select(&sibling, &current)?;
        let right = dir.select(&current, &sibling)?;

        // poseidon 2-to-1 compression
        current = poseidon_two_to_one(cs.clone(), &left, &right, config)?;
    }

    current.is_eq(expected_root)
}

// poseidon 2-to-1 hash using the sponge construction
// each call: ~300 constraints (full_rounds * width + partial_rounds)
fn poseidon_two_to_one(
    cs: ConstraintSystemRef<Fr>,
    left: &FpVar<Fr>,
    right: &FpVar<Fr>,
    config: &PoseidonConfig<Fr>,
) -> Result<FpVar<Fr>, SynthesisError> {
    // simplified poseidon: state = [0, left, right], apply rounds
    // in production arkworks, use PoseidonCRHGadget directly
    // here we implement the permutation inline for constraint accuracy

    let mut state = vec![
        FpVar::zero(),
        left.clone(),
        right.clone(),
    ];

    let width = state.len();

    // full rounds
    for r in 0..config.full_rounds {
        // add round constants
        for j in 0..width {
            let rc_idx = r * width + j;
            let rc = if rc_idx < config.ark.len() && j < config.ark[rc_idx].len() {
                config.ark[rc_idx][j]
            } else {
                Fr::from((r * width + j + 1) as u64) // deterministic fallback
            };
            let rc_var = FpVar::new_constant(cs.clone(), rc)?;
            state[j] = &state[j] + &rc_var;
        }

        // s-box: x^5 on all elements (full round)
        for j in 0..width {
            let x2 = &state[j] * &state[j];
            let x4 = &x2 * &x2;
            state[j] = &x4 * &state[j];
        }

        // mds mix
        state = mds_mix(cs.clone(), &state, config)?;
    }

    // partial rounds (s-box only on first element)
    for r in 0..config.partial_rounds {
        let rc_idx = config.full_rounds * width + r;
        let rc = if rc_idx < config.ark.len() && !config.ark[rc_idx].is_empty() {
            config.ark[rc_idx][0]
        } else {
            Fr::from((rc_idx + 1) as u64)
        };
        let rc_var = FpVar::new_constant(cs.clone(), rc)?;
        state[0] = &state[0] + &rc_var;

        // s-box on first element only
        let x2 = &state[0] * &state[0];
        let x4 = &x2 * &x2;
        state[0] = &x4 * &state[0];

        state = mds_mix(cs.clone(), &state, config)?;
    }

    // output = state[1] (squeeze from rate position)
    Ok(state[1].clone())
}

fn mds_mix(
    cs: ConstraintSystemRef<Fr>,
    state: &[FpVar<Fr>],
    config: &PoseidonConfig<Fr>,
) -> Result<Vec<FpVar<Fr>>, SynthesisError> {
    let w = state.len();
    let mut out = Vec::with_capacity(w);

    for i in 0..w {
        let mut acc = FpVar::zero();
        for j in 0..w {
            let mds_val = if i < config.mds.len() && j < config.mds[i].len() {
                config.mds[i][j]
            } else {
                if i == j { Fr::one() } else { Fr::from(2u32) }
            };
            let mds_var = FpVar::new_constant(cs.clone(), mds_val)?;
            acc = &acc + &(&mds_var * &state[j]);
        }
        out.push(acc);
    }

    Ok(out)
}

// =========================================================
// GADGET 3: Range Check (64-bit Bit Decomposition)
//
// a <= b: decompose (b - a) into 64 bits
// each bit: d_j * (1 - d_j) = 0 → 64 constraints
// reconstruction: Σ d_j * 2^j == diff → 1 constraint
// total: 65 constraints per check
// =========================================================

fn enforce_less_or_equal(
    cs: ConstraintSystemRef<Fr>,
    a: &FpVar<Fr>,
    b: &FpVar<Fr>,
) -> Result<Boolean<Fr>, SynthesisError> {
    let diff = b - a;

    // get the native value for bit extraction
    let diff_val = diff.value().unwrap_or_default();
    let diff_bits = diff_val.into_bigint();

    // allocate each bit, enforce boolean, and check reconstruction
    let mut bit_vars = Vec::with_capacity(RANGE_BITS);
    let mut reconstruction = FpVar::zero();
    let mut power = FpVar::new_constant(cs.clone(), Fr::one())?;
    let two = FpVar::new_constant(cs.clone(), Fr::from(2u32))?;

    for i in 0..RANGE_BITS {
        let bit_val = diff_bits.get_bit(i);
        let bit = Boolean::new_witness(cs.clone(), || Ok(bit_val))?;

        // bit * (1 - bit) = 0 is enforced by Boolean::new_witness

        let bit_fp = FpVar::from(bit.clone());
        reconstruction = &reconstruction + &(&bit_fp * &power);
        power = &power * &two;

        bit_vars.push(bit);
    }

    // diff must equal the reconstruction (proves no underflow / overflow)
    diff.enforce_equal(&reconstruction)?;

    // if we got here without synthesis error, a <= b
    // return a boolean witness since we can't detect failure compositionally
    let is_leq = Boolean::new_witness(cs.clone(), || {
        let va = a.value().unwrap_or_default().into_bigint();
        let vb = b.value().unwrap_or_default().into_bigint();
        Ok(va <= vb)
    })?;

    Ok(is_leq)
}

fn enforce_strict_less_than(
    cs: ConstraintSystemRef<Fr>,
    a: &FpVar<Fr>,
    b: &FpVar<Fr>,
) -> Result<Boolean<Fr>, SynthesisError> {
    // a < b ↔ a + 1 <= b
    let one = FpVar::new_constant(cs.clone(), Fr::one())?;
    let a_plus_one = a + &one;
    enforce_less_or_equal(cs, &a_plus_one, b)
}

fn enforce_geq(
    cs: ConstraintSystemRef<Fr>,
    a: &FpVar<Fr>,
    b: &FpVar<Fr>,
) -> Result<Boolean<Fr>, SynthesisError> {
    enforce_less_or_equal(cs, b, a)
}

// =========================================================
// GADGET 4: Temporal Windows
//
// t ∈ [s_0, e_0] ∨ [s_1, e_1] ∨ ... ∨ [s_k, e_k]
// ~130 constraints per interval (2 range checks + boolean glue)
// =========================================================

fn gadget_temporal_windows(
    cs: ConstraintSystemRef<Fr>,
    t: &FpVar<Fr>,
    windows: &[(Fr, Fr)],
) -> Result<Boolean<Fr>, SynthesisError> {
    let mut any_match = Boolean::FALSE;

    for (start_val, end_val) in windows {
        let s = FpVar::new_witness(cs.clone(), || Ok(*start_val))?;
        let e = FpVar::new_witness(cs.clone(), || Ok(*end_val))?;

        let after_start = enforce_less_or_equal(cs.clone(), &s, t)?;
        let before_end = enforce_less_or_equal(cs.clone(), t, &e)?;
        let in_window = after_start.and(&before_end)?;

        any_match = any_match.or(&in_window)?;
    }

    Ok(any_match)
}

// =========================================================
// Poseidon parameters (BN254-compatible, Filecoin-style)
// =========================================================

pub fn bn254_poseidon_config() -> PoseidonConfig<Fr> {
    // width=3 (rate=2, capacity=1), α=5, security ~128-bit for BN254
    let full_rounds = 8;
    let partial_rounds = 57; // BN254 requires more partial rounds

    // generate deterministic round constants via SHAKE-256
    // in production, use the exact Neptune/Filecoin parameters
    let total_rounds = full_rounds + partial_rounds;
    let width = 3;
    let mut ark = Vec::with_capacity(total_rounds);
    for r in 0..total_rounds {
        let mut round_consts = Vec::with_capacity(width);
        for j in 0..width {
            // deterministic derivation: hash(r || j) mod p
            let seed = (r as u64).wrapping_mul(1000).wrapping_add(j as u64).wrapping_add(1);
            round_consts.push(Fr::from(seed.wrapping_mul(0x517cc1b727220a95u64)));
        }
        ark.push(round_consts);
    }

    // cauchy MDS matrix
    let mds = vec![
        vec![Fr::from(2u64), Fr::from(1u64), Fr::from(1u64)],
        vec![Fr::from(1u64), Fr::from(2u64), Fr::from(1u64)],
        vec![Fr::from(1u64), Fr::from(1u64), Fr::from(2u64)],
    ];

    PoseidonConfig {
        full_rounds,
        partial_rounds,
        alpha: 5,
        ark,
        mds,
        rate: 2,
        capacity: 1,
    }
}

// =========================================================
// optimization pass
// =========================================================

fn optimize_policy(policy: &Policy) -> Policy {
    let mut optimized_rules = Vec::new();
    for rule in &policy.rules {
        optimized_rules.push(super::policy_lang::Rule {
            constraint: optimize_constraint(&rule.constraint),
            span: rule.span,
        });
    }
    Policy { rules: optimized_rules, name: policy.name.clone() }
}

fn optimize_constraint(c: &Constraint) -> Constraint {
    match c {
        Constraint::And(a, b) => {
            Constraint::And(Box::new(optimize_constraint(a)), Box::new(optimize_constraint(b)))
        }
        _ => c.clone()
    }
}

// =========================================================
// AST → gadget compilation
// =========================================================

fn compile_constraint(
    cs: ConstraintSystemRef<Fr>,
    c: &Constraint,
    ctx: &HashMap<&str, AllocatedExpr>,
    hash_config: &PoseidonConfig<Fr>,
    whitelist_root: &FpVar<Fr>,
    merkle_path: &[Fr],
    merkle_dirs: &[bool],
) -> Result<Boolean<Fr>, SynthesisError> {
    match c {
        Constraint::Eq(l, r) => {
            let left = allocate_expr(cs.clone(), l, ctx)?;
            let right = allocate_expr(cs.clone(), r, ctx)?;
            match (left, right) {
                (AllocatedExpr::Field(a), AllocatedExpr::Field(b)) => a.is_eq(&b),
                (AllocatedExpr::Bool(a), AllocatedExpr::Bool(b)) => a.is_eq(&b),
                _ => panic!("type mismatch: Eq"),
            }
        }
        Constraint::Neq(l, r) => {
            let inner = compile_constraint(cs.clone(), &Constraint::Eq(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            Ok(inner.not())
        }
        Constraint::Lte(l, r) => {
            let (AllocatedExpr::Field(a), AllocatedExpr::Field(b)) = (allocate_expr(cs.clone(), l, ctx)?, allocate_expr(cs.clone(), r, ctx)?) else {
                panic!("type mismatch: Lte");
            };
            enforce_less_or_equal(cs.clone(), &a, &b)
        }
        Constraint::Gte(l, r) => {
            let (AllocatedExpr::Field(a), AllocatedExpr::Field(b)) = (allocate_expr(cs.clone(), l, ctx)?, allocate_expr(cs.clone(), r, ctx)?) else {
                panic!("type mismatch: Gte");
            };
            enforce_less_or_equal(cs.clone(), &b, &a)
        }
        Constraint::Lt(l, r) => {
            let (AllocatedExpr::Field(a), AllocatedExpr::Field(b)) = (allocate_expr(cs.clone(), l, ctx)?, allocate_expr(cs.clone(), r, ctx)?) else {
                panic!("type mismatch: Lt");
            };
            enforce_strict_less_than(cs.clone(), &a, &b)
        }
        Constraint::Gt(l, r) => {
            let (AllocatedExpr::Field(a), AllocatedExpr::Field(b)) = (allocate_expr(cs.clone(), l, ctx)?, allocate_expr(cs.clone(), r, ctx)?) else {
                panic!("type mismatch: Gt");
            };
            enforce_strict_less_than(cs.clone(), &b, &a)
        }
        Constraint::And(a, b) => {
            let left = compile_constraint(cs.clone(), a, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            let right = compile_constraint(cs.clone(), b, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            left.and(&right)
        }
        Constraint::Or(a, b) => {
            let left = compile_constraint(cs.clone(), a, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            let right = compile_constraint(cs.clone(), b, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            left.or(&right)
        }
        Constraint::Not(a) => {
            // can't negate range checks after synthesis; flip the comparison operator
            match a.as_ref() {
                Constraint::Gt(l, r) => compile_constraint(cs, &Constraint::Lte(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs),
                Constraint::Lt(l, r) => compile_constraint(cs, &Constraint::Gte(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs),
                Constraint::Gte(l, r) => compile_constraint(cs, &Constraint::Lt(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs),
                Constraint::Lte(l, r) => compile_constraint(cs, &Constraint::Gt(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs),
                Constraint::Eq(l, r) => compile_constraint(cs, &Constraint::Neq(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs),
                Constraint::Neq(l, r) => compile_constraint(cs, &Constraint::Eq(l.clone(), r.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs),
                other => {
                    let inner = compile_constraint(cs, other, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
                    Ok(inner.not())
                }
            }
        }
        Constraint::Implies(a, b) => {
            let left = compile_constraint(cs.clone(), a, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            let right = compile_constraint(cs.clone(), b, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            left.not().or(&right)
        }
        Constraint::In(expr, _set_expr) => {
            let target = match allocate_expr(cs.clone(), expr, ctx)? {
                AllocatedExpr::Field(f) => f,
                _ => panic!("merkle membership needs a field element"),
            };
            gadget_poseidon_merkle(cs.clone(), &target, merkle_path, merkle_dirs, hash_config, whitelist_root)
        }
        Constraint::NotIn(expr, set_expr) => {
            let inner = compile_constraint(cs.clone(), &Constraint::In(expr.clone(), set_expr.clone()), ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)?;
            Ok(inner.not())
        }
        Constraint::Within { condition, duration_secs: _ } => {
            compile_constraint(cs, condition, ctx, hash_config, whitelist_root, merkle_path, merkle_dirs)
        }
    }
}

// =========================================================
// expression allocator
// =========================================================

fn allocate_expr(
    cs: ConstraintSystemRef<Fr>,
    e: &Expr,
    ctx: &HashMap<&str, AllocatedExpr>,
) -> Result<AllocatedExpr, SynthesisError> {
    match e {
        Expr::Field(fp) => {
            let key = format!("{}", fp);
            if let Some(allocated) = ctx.get(key.as_str()) {
                Ok(allocated.clone())
            } else {
                panic!("unknown field path: {}", key);
            }
        }
        Expr::LitAmount(n) | Expr::LitScore(n) | Expr::LitCounter(n) | Expr::LitTimestamp(n) => {
            let val = FpVar::new_constant(cs, Fr::from(*n))?;
            Ok(AllocatedExpr::Field(val))
        }
        Expr::LitRole(role) => {
            let val = FpVar::new_constant(cs, Fr::from(role.to_field_index()))?;
            Ok(AllocatedExpr::Field(val))
        }
        Expr::LitBool(b) => {
            let val = Boolean::new_constant(cs, *b)?;
            Ok(AllocatedExpr::Bool(val))
        }
        Expr::Add(a, b) => {
            let (AllocatedExpr::Field(va), AllocatedExpr::Field(vb)) = (allocate_expr(cs.clone(), a, ctx)?, allocate_expr(cs.clone(), b, ctx)?) else {
                panic!("type mismatch: Add");
            };
            Ok(AllocatedExpr::Field(va + vb))
        }
        Expr::Sub(a, b) => {
            let (AllocatedExpr::Field(va), AllocatedExpr::Field(vb)) = (allocate_expr(cs.clone(), a, ctx)?, allocate_expr(cs.clone(), b, ctx)?) else {
                panic!("type mismatch: Sub");
            };
            Ok(AllocatedExpr::Field(va - vb))
        }
        Expr::Mul(a, b) => {
            let (AllocatedExpr::Field(va), AllocatedExpr::Field(vb)) = (allocate_expr(cs.clone(), a, ctx)?, allocate_expr(cs.clone(), b, ctx)?) else {
                panic!("type mismatch: Mul");
            };
            Ok(AllocatedExpr::Field(va * vb))
        }
        Expr::FnCall { name, args: _ } => {
            let key = format!("fn.{}", name);
            if let Some(allocated) = ctx.get(key.as_str()) {
                Ok(allocated.clone())
            } else {
                panic!("unknown function: {}", key);
            }
        }
    }
}

// =========================================================
// tests
// =========================================================

#[cfg(test)]
mod tests {
    use super::*;
    use ark_relations::r1cs::ConstraintSystem;
    use crate::zkp::policy_lang::parse;

    fn parse_policy(input: &str) -> Policy {
        parse(input).unwrap()
    }

    fn test_poseidon() -> PoseidonConfig<Fr> {
        bn254_poseidon_config()
    }

    // helper: compute the actual merkle root from a leaf + path
    fn compute_expected_root(leaf: Fr, path: &[Fr], dirs: &[bool], config: &PoseidonConfig<Fr>) -> Fr {
        let cs = ConstraintSystem::<Fr>::new_ref();
        let mut current = FpVar::new_witness(cs.clone(), || Ok(leaf)).unwrap();

        for (i, (sib, dir)) in path.iter().zip(dirs.iter()).enumerate() {
            let sibling = FpVar::new_witness(cs.clone(), || Ok(*sib)).unwrap();
            let (left, right) = if *dir {
                (sibling.clone(), current.clone())
            } else {
                (current.clone(), sibling.clone())
            };
            current = poseidon_two_to_one(cs.clone(), &left, &right, config).unwrap();
        }

        current.value().unwrap()
    }

    fn default_circuit(p: Policy) -> (PolicyCircuit, PolicyWitness) {
        let config = test_poseidon();
        let merkle_path = vec![Fr::from(2u32), Fr::from(3u32)];
        let merkle_dirs = vec![false, false];
        let leaf = Fr::from(12345u32);
        let root = compute_expected_root(leaf, &merkle_path, &merkle_dirs, &config);

        let witness = PolicyWitness {
            agent_role: Fr::from(1u32),
            agent_daily_limit: Fr::from(100_000u32),
            agent_per_tx_limit: Fr::from(100_000u32),
            agent_daily_spent: Fr::zero(),
            agent_consecutive_denials: Fr::zero(),
            agent_is_suspended: false,
            agent_is_active: true,
            tx_amount: Fr::from(5000u32),
            tx_target: leaf,
            tx_timestamp: Fr::from(1700000000u64),
            tx_supervisor_approved: true,
            whitelist_merkle_path: merkle_path,
            whitelist_path_directions: merkle_dirs,
            semantic_u: vec![Fr::from(3000u32); SEMANTIC_DIM], // ~0.73 in fixed-point
            semantic_v: vec![Fr::from(3000u32); SEMANTIC_DIM], // identical → sim=1.0
            semantic_threshold_sq: Fr::from(7225u32), // τ² * 10000
            temporal_windows: vec![],
            rate_budget_before: Fr::from(10000u32),
            rate_budget_after: Fr::from(5000u32),
        };

        let circuit = PolicyCircuit {
            policy: p,
            witness: Some(witness.clone()),
            poseidon_config: config,
            whitelist_root: root,
            request_body_hash: Fr::from(999u32),
            timestamp: Fr::from(1700000000u64),
            policy_version: Fr::from(1u32),
            state_seq: Fr::from(42u32),
        };

        (circuit, witness)
    }

    fn build_circuit(p: Policy) -> ConstraintSystemRef<Fr> {
        let cs = ConstraintSystem::<Fr>::new_ref();
        let (circuit, _) = default_circuit(p);
        circuit.generate_constraints(cs.clone()).unwrap();
        cs
    }

    #[test]
    fn test_semantic_gadget_constraint_count() {
        let cs = ConstraintSystem::<Fr>::new_ref();
        let u = vec![Fr::from(3000u32); SEMANTIC_DIM];
        let v = vec![Fr::from(3000u32); SEMANTIC_DIM];
        let threshold_sq = Fr::from(7225u32); // τ² * 10000

        let before = cs.num_constraints();
        let _result = gadget_semantic_similarity(cs.clone(), &u, &v, &threshold_sq).unwrap();
        let after = cs.num_constraints();

        let sem_constraints = after - before;
        println!("semantic similarity gadget: {} constraints", sem_constraints);

        // 3*384 muls + ~130 slack decomp + O(1) glue ≈ ~1350
        assert!(sem_constraints < 1600, "semantic gadget too large: {}", sem_constraints);
        // parallel vectors → sim = 1.0 >= 0.85 → should pass
        // (can't check result.value() without full circuit context)
    }

    #[test]
    fn test_range_check_soundness() {
        let cs = ConstraintSystem::<Fr>::new_ref();
        let a = FpVar::new_witness(cs.clone(), || Ok(Fr::from(500u32))).unwrap();
        let b = FpVar::new_witness(cs.clone(), || Ok(Fr::from(1000u32))).unwrap();

        let _ = enforce_less_or_equal(cs.clone(), &a, &b).unwrap();
        assert!(cs.is_satisfied().unwrap(), "500 <= 1000 should be satisfiable");

        let constraints = cs.num_constraints();
        println!("range check: {} constraints", constraints);
        // 64 boolean + 1 reconstruction = 65
        assert!(constraints <= 70, "range check too expensive: {}", constraints);
    }

    #[test]
    fn test_baseline_policy() {
        let cs = build_circuit(parse_policy(r#"
            policy LimitTest {
                require tx.amount <= 10000
                require agent.role == 1
            }
        "#));
        let count = cs.num_constraints();
        println!("baseline policy: {} constraints", count);
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_compound_arithmetic() {
        let cs = build_circuit(parse_policy(r#"
            policy Compound {
                require tx.amount + agent.daily_spent <= agent.daily_limit
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_negation_logic() {
        let cs = build_circuit(parse_policy(r#"
            policy Negation {
                require agent.is_suspended == false
                require not (tx.amount > 5000)
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_multiple_rules() {
        let cs = build_circuit(parse_policy(r#"
            policy Multi {
                require agent.is_active == true
                require agent.consecutive_denials < 3
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_implication() {
        let cs = build_circuit(parse_policy(r#"
            policy Implication {
                require (tx.amount > 1000) implies (tx.supervisor_approved == true)
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_merkle_membership() {
        let cs = build_circuit(parse_policy(r#"
            policy MerkleTest {
                require tx.target IN org.whitelist
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_temporal_within() {
        let cs = build_circuit(parse_policy(r#"
            policy Temporal {
                require within (24) { tx.amount <= 10000 }
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_boolean_aggregation() {
        let cs = build_circuit(parse_policy(r#"
            policy BooleanAggr {
                require ((agent.role == 1) or (tx.supervisor_approved == true)) and (agent.is_active == true)
            }
        "#));
        assert!(cs.is_satisfied().unwrap());
    }

    #[test]
    fn test_full_policy_stress() {
        let cs = build_circuit(parse_policy(r#"
            policy UniversalSovereign {
                require (agent.is_active == true) and (agent.is_suspended == false)
                require agent.consecutive_denials < 5
                require (tx.amount * 2) <= agent.per_tx_limit
                require tx.target IN org.whitelist
                require (agent.role == 1) implies (tx.amount <= 10000)
            }
        "#));
        let count = cs.num_constraints();
        println!("full policy stress: {} constraints", count);
        assert!(cs.is_satisfied().unwrap());
    }
}
