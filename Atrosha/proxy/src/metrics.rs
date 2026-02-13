use axum::routing::get;
use prometheus::{
    Encoder, HistogramOpts, HistogramVec, IntCounterVec, Opts, Registry, TextEncoder,
};
use once_cell::sync::Lazy;

#[allow(dead_code)]
pub static REGISTRY: Lazy<Registry> = Lazy::new(Registry::new);

pub static REQUEST_DURATION: Lazy<HistogramVec> = Lazy::new(|| {
    let opts = HistogramOpts::new(
        "atrosha_proxy_req_duration_seconds",
        "Request duration in seconds",
    )
    .buckets(vec![0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0]);
    
    let histogram = HistogramVec::new(opts, &["method", "status"]).unwrap();
    REGISTRY.register(Box::new(histogram.clone())).ok();
    histogram
});

pub static DENIALS_TOTAL: Lazy<IntCounterVec> = Lazy::new(|| {
    let opts = Opts::new("atrosha_denials_total", "Total number of denied reqs")
        .const_label("service", "atrosha-proxy");
    
    let counter = IntCounterVec::new(opts, &["reason"]).unwrap();
    REGISTRY.register(Box::new(counter.clone())).ok();
    counter
});

#[allow(dead_code)]
pub fn record_req_duration(method: &str, status: u16, duration_secs: f64) {
    REQUEST_DURATION
        .with_label_values(&[method, &status.to_string()])
        .observe(duration_secs);
}

#[allow(dead_code)]
pub fn record_denial(reason: &str) {
    DENIALS_TOTAL.with_label_values(&[reason]).inc();
}

pub async fn metrics_handler() -> String {
    // Force initialization
    Lazy::force(&REQUEST_DURATION);
    Lazy::force(&DENIALS_TOTAL);
    
    let encoder = TextEncoder::new();
    let metric_families = REGISTRY.gather();
    let mut buffer = Vec::new();
    encoder.encode(&metric_families, &mut buffer).ok();
    
    String::from_utf8(buffer).unwrap_or_default()
}

pub fn metrics_route() -> axum::routing::MethodRouter {
    get(metrics_handler)
}