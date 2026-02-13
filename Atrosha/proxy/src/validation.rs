use axum::{
    body::Body,
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};
use regex::Regex;
use std::sync::OnceLock;

static AGENT_ID_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_agent_id_regex() -> &'static Regex {
    AGENT_ID_REGEX.get_or_init(|| Regex::new(r"^[a-zA-Z0-9-_]+$").unwrap())
}

pub async fn validation_middleware(
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let headers = req.headers();

    if let Some(agent_id_val) = headers.get("X-Atrosha-Agent-ID") {
        if let Ok(agent_id) = agent_id_val.to_str() {
            if !get_agent_id_regex().is_match(agent_id) {
                tracing::warn!(agent_id = %agent_id, "blocked:malformed agent id");
                return Err(StatusCode::BAD_REQUEST);
            }
            if agent_id.len() > 64 {
                tracing::warn!("blocked: agent id too long");
                return Err(StatusCode::BAD_REQUEST);
            }
        } else {
             return Err(StatusCode::BAD_REQUEST);
        }
    }

    if let Some(len_header) = headers.get("Content-Length") {
        if let Ok(len_str) = len_header.to_str() {
            if let Ok(len) = len_str.parse::<u64>() {
                if len > 10 * 1024 * 1024 {
                    tracing::warn!(len = %len, "blocked:data too large");
                    return Err(StatusCode::PAYLOAD_TOO_LARGE);
                }
            }
        }
    }

    if req.method() == axum::http::Method::POST || req.method() == axum::http::Method::PUT {
        if let Some(content_type) = headers.get("content-type") {
            if let Ok(ct) = content_type.to_str() {
                 if !ct.contains("application/json") && !ct.contains("application/grpc") {
                     // In strict mode we might block, but here we just pass
                 }
            }
        }
    }

    Ok(next.run(req).await)
}