use serde::{Deserialize, Serialize};
use tracing::warn;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JsonPolicy {
    pub agent: String,
    pub action: String,
    pub threshold: Option<f64>,
    pub min_semantic_confidence: Option<f32>,
    pub match_verdict: Option<String>,
    pub effect: String,
    pub require: Option<String>,
}

pub fn evaluate_json_policies(
    policies: &[JsonPolicy],
    agent_id: &str,
    amount: f64,
    ml_verdict: &str,
    ml_confidence: f32,
    has_supervisor_sig: bool,
) -> Result<(), String> {
    for p in policies {
        // Agent match
        if p.agent != "Global" && p.agent != agent_id {
            continue;
        }

        let mut matches = true;

        if let Some(t) = p.threshold {
            if amount < t { matches = false; }
        }

        if let Some(min_conf) = p.min_semantic_confidence {
            if ml_confidence >= min_conf { matches = false; }
        }

        if let Some(ref v) = p.match_verdict {
            if ml_verdict != v { matches = false; }
        }

        if matches {
            warn!("Matched JSON policy: {:?}", p);
            
            if p.effect == "deny" {
                if let Some(ref req) = p.require {
                    if req == "supervisor_sig" {
                        if !has_supervisor_sig {
                            return Err(format!("Policy violation: Requires supervisor_sig. Matched rule constraints."));
                        }
                        // if has sig, it allows it through.
                    } else if req == "2fa" {
                        return Err(format!("Policy violation: Requires 2fa. Matched rule constraints."));
                    }
                } else {
                    return Err(format!("Policy violation: Explicit deny."));
                }
            }
        }
    }
    Ok(())
}
