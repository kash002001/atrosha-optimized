use std::sync::Arc;
use redis;
use crate::policy::PolicyEngine;
use crate::registry::AgentRegistry;
use crate::permit::PermitValidator;
use crate::audit::AuditLogger;
use crate::adapters::{HttpAdapter, EvmAdapter, AchAdapter};
use crate::semantic::SemanticClient;
use crate::whitelist::EgressWhitelist;

#[derive(Clone)]
pub struct AppState {
    pub policy_engine: Arc<PolicyEngine>,
    pub registry: Arc<AgentRegistry>,
    pub permit_validator: Arc<PermitValidator>,
    pub audit: Arc<AuditLogger>,
    pub redis_client: redis::Client,
    pub http_adapter: Arc<HttpAdapter>,
    pub evm_adapter: Arc<EvmAdapter>,
    pub ach_adapter: Arc<AchAdapter>,
    pub semantic: Arc<SemanticClient>,
    pub egress_whitelist: Arc<EgressWhitelist>,
    pub zkp_setup: Option<Arc<crate::zkp::prover::Groth16Setup>>,
    pub zkp_policy: Option<Arc<crate::zkp::policy_lang::Policy>>,
}
