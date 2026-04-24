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
static ORG_ID_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_agent_id_regex() -> &'static Regex {
    AGENT_ID_REGEX.get_or_init(|| Regex::new(r"^[a-zA-Z0-9\-_]+$").unwrap())
}

fn get_org_id_regex() -> &'static Regex {
    // UUID format or alphanumeric slug, max 64 chars
    ORG_ID_REGEX.get_or_init(|| Regex::new(r"^[a-zA-Z0-9\-_]+$").unwrap())
}

pub async fn validation_middleware(
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let headers = req.headers();

    // X-Atrosha-Agent-ID is required on all proxy requests
    match headers.get("X-Atrosha-Agent-ID") {
        Some(agent_id_val) => {
            let agent_id = agent_id_val.to_str().map_err(|_| StatusCode::BAD_REQUEST)?;
            if agent_id.len() > 64 || !get_agent_id_regex().is_match(agent_id) {
                tracing::warn!(agent_id = %agent_id, "blocked: malformed agent id");
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        None => {
            tracing::warn!("blocked: missing X-Atrosha-Agent-ID");
            return Err(StatusCode::UNAUTHORIZED);
        }
    }

    // X-Atrosha-Org-ID is required — prevents all orgs defaulting to "default" bucket (M5)
    match headers.get("X-Atrosha-Org-ID") {
        Some(org_id_val) => {
            let org_id = org_id_val.to_str().map_err(|_| StatusCode::BAD_REQUEST)?;
            if org_id.len() > 64 || !get_org_id_regex().is_match(org_id) {
                tracing::warn!(org_id = %org_id, "blocked: malformed org id");
                return Err(StatusCode::BAD_REQUEST);
            }
        }
        None => {
            tracing::warn!("blocked: missing X-Atrosha-Org-ID");
            return Err(StatusCode::BAD_REQUEST);
        }
    }

    if let Some(len_header) = headers.get("Content-Length") {
        if let Ok(len_str) = len_header.to_str() {
            if let Ok(len) = len_str.parse::<u64>() {
                if len > 10 * 1024 * 1024 {
                    tracing::warn!(len = %len, "blocked: payload too large");
                    return Err(StatusCode::PAYLOAD_TOO_LARGE);
                }
            }
        }
    }

    // H3: enforce content-type on mutation requests — don't leave this as dead code
    if req.method() == axum::http::Method::POST || req.method() == axum::http::Method::PUT {
        match headers.get("content-type").and_then(|h| h.to_str().ok()) {
            Some(ct) if ct.contains("application/json") || ct.contains("application/grpc") => {}
            Some(ct) => {
                tracing::warn!(content_type = %ct, "blocked: unsupported content-type");
                return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE);
            }
            None => {
                tracing::warn!("blocked: missing content-type on POST/PUT");
                return Err(StatusCode::UNSUPPORTED_MEDIA_TYPE);
            }
        }
    }

    Ok(next.run(req).await)
}