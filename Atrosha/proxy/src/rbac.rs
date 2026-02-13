use axum::{
    extract::{State, Request},
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use crate::AppState;

#[allow(dead_code)]
pub async fn require_admin(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    require_role(state, req, next, "admin").await
}

pub async fn require_agent(
    State(state): State<AppState>,
    req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    require_role(state, req, next, "any").await
}

async fn require_role(
    state: AppState,
    req: Request,
    next: Next,
    required_role: &str,
) -> Result<Response, StatusCode> {
    let headers = req.headers();
    
    let agent_id = match headers.get("X-Atrosha-Agent-ID").and_then(|h| h.to_str().ok()) {
        Some(id) => id,
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    let org_id = req.extensions().get::<String>().cloned().unwrap_or_else(|| "default".to_string());

    match state.registry.get_agent_role(&org_id, agent_id).await {
        Ok(role) => {
            if required_role == "any" {
                return Ok(next.run(req).await);
            }
            
            if role == required_role || role == "admin" {
                Ok(next.run(req).await)
            } else {
                tracing::warn!(org_id = %org_id, agent_id = %agent_id, role = %role, required = %required_role, "RBAC denied");
                Err(StatusCode::FORBIDDEN)
            }
        }
        Err(_) => {
            Err(StatusCode::UNAUTHORIZED)
        }
    }
}