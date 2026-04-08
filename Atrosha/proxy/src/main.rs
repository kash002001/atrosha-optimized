use atrosha_proxy::*;


use std::net::SocketAddr;
use std::sync::Arc;
use crate::adapters::{HttpAdapter, EvmAdapter, AchAdapter};
use axum::{
    middleware as axum_middleware,
    routing::{get, post, any},
    Router,
};
use redis::Client;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::audit::spawn_audit_system;
use crate::middleware::verify_sig;
use crate::permit::PermitValidator;
use crate::policy::PolicyEngine;
use crate::registry::AgentRegistry;
use crate::semantic::SemanticClient;
use crate::state::AppState;
use crate::whitelist::EgressWhitelist;
use crate::handlers::{health_check, register_agent, rotate_key_handler, proxy_handler};
use ark_crypto_primitives::sponge::poseidon::PoseidonConfig;
use ark_bn254::Fr;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "atrosha_proxy=debug".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Atrosha Proxy v3.0 (PRODUCTION) starting...");
    dotenvy::dotenv().ok();

    // mandatory config — panic if missing
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379/".into());
    let permit_secret = std::env::var("PERMIT_SECRET")
        .expect("PERMIT_SECRET must be set — run `openssl rand -hex 32` to generate");
    let _admin_secret = std::env::var("ADMIN_SECRET")
        .expect("ADMIN_SECRET must be set — run `openssl rand -hex 32` to generate");

    // clickhouse audit config
    let clickhouse_url = std::env::var("CLICKHOUSE_URL").unwrap_or_else(|_| "http://127.0.0.1:8123/".into());
    let clickhouse_user = std::env::var("CLICKHOUSE_USER").ok();
    let clickhouse_password = std::env::var("CLICKHOUSE_PASSWORD").ok();

    let redis_client = match Client::open(redis_url.clone()) {
        Ok(client) => {
            match client.get_connection() {
                Ok(_) => tracing::info!("redis connection verified"),
                Err(e) => tracing::warn!(error = %e, "redis not available - degraded mode"),
            }
            client
        }
        Err(e) => {
            tracing::error!(error = %e, "failed to create redis client — cannot start");
            return Err(anyhow::anyhow!("redis connection required"));
        }
    };

    let policy_engine = Arc::new(PolicyEngine::new(redis_client.clone()));
    let registry = Arc::new(AgentRegistry::new(redis_client.clone()));
    let permit_validator = Arc::new(PermitValidator::new(permit_secret.as_bytes()));
    let audit = spawn_audit_system(clickhouse_url, clickhouse_user, clickhouse_password);

    let base_http_client = reqwest::Client::builder()
        .use_rustls_tls()
        .timeout(std::time::Duration::from_secs(30))
        .https_only(false)
        .build()?;

    let semantic_url = std::env::var("SEMANTIC_ENGINE_URL")
        .unwrap_or_else(|_| "http://127.0.0.1:8002".into());

    // Initialize ZKP Global Proving Context
    tracing::info!("Initializing Atrosha Zero-Knowledge Prove Setup...");
    let zkp_policy_tree = crate::zkp::policy_lang::parse(r#"
        policy MasterApproval {
            require tx.amount <= 9999999
        }
    "#).unwrap();
    let poseidon_config = PoseidonConfig {
        full_rounds: 8,
        partial_rounds: 31,
        alpha: 5,
        ark: vec![vec![Fr::from(1u32)]],
        mds: vec![vec![Fr::from(1u32)]],
        rate: 2,
        capacity: 1,
    };
    let global_zkp_setup = Arc::new(crate::zkp::prover::ProofGenerator::trusted_setup(&zkp_policy_tree, poseidon_config));
    let zkp_policy = Arc::new(zkp_policy_tree);

    let state = AppState {
        policy_engine,
        registry,
        permit_validator,
        audit,
        redis_client: redis_client.clone(),
        http_adapter: Arc::new(HttpAdapter::new(base_http_client)),
        evm_adapter: Arc::new(match EvmAdapter::new().await {
            Ok(a) => a,
            Err(e) => {
                tracing::warn!(error = %e, "evm adapter unavailable - crypto routes disabled");
                EvmAdapter::noop()
            }
        }),
        ach_adapter: Arc::new(AchAdapter::new()),
        semantic: Arc::new(SemanticClient::new(&semantic_url)),
        egress_whitelist: Arc::new(EgressWhitelist::new(redis_client.clone())),
        zkp_setup: Some(global_zkp_setup),
        zkp_policy: Some(zkp_policy),
    };

    // warm the egress whitelist cache and start background refresh
    state.egress_whitelist.spawn_refresh();

    let proxy_routes = Router::new()
        .route("/*path", any(proxy_handler))
        .layer(axum_middleware::from_fn_with_state(state.clone(), rbac::require_agent))
        .layer(axum_middleware::from_fn_with_state(state.clone(), verify_sig))
        .layer(axum_middleware::from_fn(validation::validation_middleware))
        .layer(axum_middleware::from_fn_with_state(state.clone(), ratelimit::rate_limit_middleware));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/admin/agents", post(register_agent))
        .route("/admin/verification-keys", get(crate::handlers::get_verification_keys))
        .route("/rotate-key", post(rotate_key_handler).layer(axum_middleware::from_fn_with_state(state.clone(), verify_sig)))
        .nest("/proxy", proxy_routes)
        .route("/verify-proof", post(crate::zkp::verifier::verify_proof_endpoint))
        .with_state(state)
        .route("/metrics", metrics::metrics_route());

    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8000);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!(addr = %addr, "listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}