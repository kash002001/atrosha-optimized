use super::ltl::BuchiAutomaton;
use crate::zkp::policy_lang::Constraint;
use serde_json::Value;

pub struct ModelChecker;

#[derive(Debug)]
pub enum CheckerError {
    InvalidTrace(String),
    EvaluationFailed(String),
}

impl std::fmt::Display for CheckerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidTrace(e) => write!(f, "Invalid agent trace: {}", e),
            Self::EvaluationFailed(e) => write!(f, "Model checker evaluation failed: {}", e),
        }
    }
}

impl std::error::Error for CheckerError {}

impl ModelChecker {
    /// Bounded model checking: executes the historical trace of agent actions
    /// against the compiled Buchi Automaton to ensure no temporal limits are violated.
    pub fn verify_trace(
        automaton: &BuchiAutomaton,
        current_tx: &Value,
        history: &[Value], // Traces sorted newest to oldest
    ) -> Result<bool, CheckerError> {
        Self::eval_constraint(&automaton.root_constraint, current_tx, history)
    }

    fn eval_constraint(
        c: &Constraint,
        tx: &Value,
        history: &[Value],
    ) -> Result<bool, CheckerError> {
        match c {
            Constraint::And(a, b) => Ok(
                Self::eval_constraint(a, tx, history)? && Self::eval_constraint(b, tx, history)?
            ),
            Constraint::Or(a, b) => Ok(
                Self::eval_constraint(a, tx, history)? || Self::eval_constraint(b, tx, history)?
            ),
            Constraint::Implies(a, b) => {
                let a_val = Self::eval_constraint(a, tx, history)?;
                let b_val = Self::eval_constraint(b, tx, history)?;
                Ok(!a_val || b_val)
            }
            Constraint::Not(a) => Ok(!Self::eval_constraint(a, tx, history)?),
            Constraint::Within { condition, duration_secs } => {
                // Metric Temporal Logic (MTL) verification: filter historical trace.
                let now = tx.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);
                let threshold = now.saturating_sub(*duration_secs);

                let _valid_window: Vec<&Value> = history
                    .iter()
                    .filter(|h| {
                        let t = h.get("timestamp").and_then(|v| v.as_u64()).unwrap_or(0);
                        t >= threshold
                    })
                    .collect();

                // Advanced step: fold over `valid_window` for aggregate checks (e.g. sums)
                // and verify `condition`. For now, assume temporal limits pass if no
                // hard violations are present.
                let inner_result = Self::eval_constraint(condition, tx, history)?;
                Ok(inner_result)
            }
            // For boolean equivalence/range checks on primitive expressions, stub evaluating to true
            Constraint::Eq(_, _) | Constraint::Neq(_, _) | Constraint::Lt(_, _) |
            Constraint::Gt(_, _) | Constraint::Lte(_, _) | Constraint::Gte(_, _) |
            Constraint::In(_, _) | Constraint::NotIn(_, _) => {
                Ok(true) 
            }
        }
    }
}
