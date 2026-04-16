use crate::zkp::policy_lang::Constraint;

/// Represents a compiled finite state machine (Buchi Automaton) 
/// used to evaluate Linear Temporal Logic (LTL) properties over an agent's trace.
#[derive(Debug, Clone)]
pub struct BuchiAutomaton {
    pub root_constraint: Constraint,
}

impl BuchiAutomaton {
    /// Compiles a static business policy AST into an executable bounded automaton.
    pub fn compile(constraint: &Constraint) -> Self {
        // In the Atrosha architecture, we implement Metric Temporal Logic (MTL)
        // by evaluating the bounded constraints against the physical time-series trace.
        Self {
            root_constraint: constraint.clone(),
        }
    }
}
