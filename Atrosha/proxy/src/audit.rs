#![allow(dead_code)]
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::sync::Arc;
use thiserror::Error;
use tokio::sync::mpsc;
use crate::middleware::SignatureStatus;

#[derive(Error, Debug)]
pub enum AuditError {
    #[error("channel closed")]
    ChannelClosed,
    #[error("clickhouse error: {0}")]
    ClickHouse(String),
}

#[derive(Debug, Clone, Serialize)]
pub struct AuditRecord {
    pub ts: DateTime<Utc>,
    pub agent_id: String,
    pub req_id: String,
    pub org_id: String,
    pub action: String,
    pub amount: f64,
    pub target_url: String,
    pub decision: AuditDecision,
    pub latency_us: u64,
    pub shadow_mode: bool,
    pub permit_id: Option<String>,
    pub sig_status: SignatureStatus,
    pub denial_reason: Option<String>,
    pub sim: f32,
    pub matched_policy_id: Option<String>,
    pub zkp_proof: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuditDecision {
    Approved,
    Denied,
    ShadowDenied,
}

pub struct AuditLogger {
    tx: mpsc::Sender<AuditRecord>,
}

impl AuditLogger {
    pub fn new(tx: mpsc::Sender<AuditRecord>) -> Self {
        Self { tx }
    }

    pub fn log(&self, record: AuditRecord) {
        let tx = self.tx.clone();
        tokio::spawn(async move {
            if tx.send(record).await.is_err() {
                tracing::warn!("audit channel full or closed, record dropped");
            }
        });
    }
}

pub struct AuditWorker {
    rx: mpsc::Receiver<AuditRecord>,
    client: reqwest::Client,
    clickhouse_url: String,
    batch_size: usize,
    flush_interval_ms: u64,
}

impl AuditWorker {
    pub fn new(
        rx: mpsc::Receiver<AuditRecord>,
        clickhouse_url: String,
        clickhouse_user: Option<String>,
        clickhouse_password: Option<String>,
        batch_size: usize,
        flush_interval_ms: u64,
    ) -> Self {
        let mut headers = reqwest::header::HeaderMap::new();
        if let Some(user) = &clickhouse_user {
            headers.insert("X-ClickHouse-User", user.parse().expect("invalid clickhouse user header"));
        }
        if let Some(pass) = &clickhouse_password {
            headers.insert("X-ClickHouse-Key", pass.parse().expect("invalid clickhouse key header"));
        }

        let client = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .expect("failed to build clickhouse http client");

        Self {
            rx,
            client,
            clickhouse_url,
            batch_size,
            flush_interval_ms,
        }
    }

    pub async fn run(mut self) {
        let _ = self.ensure_schema().await;
        let mut batch: Vec<AuditRecord> = Vec::with_capacity(self.batch_size);
        let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(self.flush_interval_ms));
        
        loop {
            tokio::select! {
                Some(record) = self.rx.recv() => {
                    batch.push(record);
                    if batch.len() >= self.batch_size {
                        self.flush_batch(&mut batch).await;
                    }
                }
                _ = interval.tick() => {
                    if !batch.is_empty() {
                        self.flush_batch(&mut batch).await;
                    }
                }
            }
        }
    }

    async fn flush_batch(&self, batch: &mut Vec<AuditRecord>) {
        if batch.is_empty() {
            return;
        }

        if let Err(e) = self.insert_records(batch).await {
            tracing::error!(error = %e, count = batch.len(), "failed to flush audit batch");
        }
        batch.clear();
    }

    async fn ensure_schema(&self) -> Result<(), AuditError> {
        let ddl = r#"CREATE TABLE IF NOT EXISTS transaction_logs (
            ts DateTime64(3) DEFAULT now64(3),
            org_id LowCardinality(String) DEFAULT '',
            agent_id String DEFAULT '',
            req_id String DEFAULT '',
            method LowCardinality(String) DEFAULT '',
            target_url String DEFAULT '',
            amount_cents Int64 DEFAULT 0,
            currency LowCardinality(String) DEFAULT 'USD',
            decision LowCardinality(String) DEFAULT '',
            latency_us UInt32 DEFAULT 0,
            rule_ids Array(String) DEFAULT [],
            shadow_mode UInt8 DEFAULT 0,
            permit_id Nullable(String),
            sig_status LowCardinality(String) DEFAULT 'MISSING',
            denial_reason String DEFAULT '',
            sim_score Float32 DEFAULT 0.0,
            matched_policy_id Nullable(String),
            zkp_proof String DEFAULT ''
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMMDD(ts)
        ORDER BY (org_id, agent_id, ts)
        TTL ts + INTERVAL 365 DAY
        SETTINGS index_granularity = 8192"#;
        let resp = self.client.post(&self.clickhouse_url).body(ddl).send().await;
        match resp {
            Ok(r) if r.status().is_success() => {
                tracing::info!("clickhouse schema verified");
            }
            Ok(r) => {
                let body = r.text().await.unwrap_or_default();
                tracing::warn!(error = %body, "clickhouse schema creation returned non-200");
            }
            Err(e) => {
                tracing::warn!(error = %e, "clickhouse unreachable during schema init");
            }
        }
        Ok(())
    }

    async fn insert_records(&self, records: &[AuditRecord]) -> Result<(), AuditError> {
        let mut values = Vec::new();
        for r in records {
            let decision_str = match r.decision {
                AuditDecision::Approved => "APPROVED",
                AuditDecision::Denied => "DENIED",
                AuditDecision::ShadowDenied => "SHADOW_DENIED",
            };

            let sig_status_str = match r.sig_status {
                SignatureStatus::Verified => "VERIFIED",
                SignatureStatus::Invalid => "INVALID",
                SignatureStatus::Missing => "MISSING",
                SignatureStatus::KeyNotFound => "KEY_NOT_FOUND",
            };

            let permit_id_sql = r
                .permit_id
                .as_ref()
                .map(|id| format!("'{}'", id))
                .unwrap_or_else(|| "NULL".to_string());

            let denial_reason_sql = r
                .denial_reason
                .as_ref()
                .map(|reason| format!("'{}'", reason.replace("'", "''")))
                .unwrap_or_else(|| "NULL".to_string());

            let matched_policy_id_sql = r
                .matched_policy_id
                .as_ref()
                .map(|id| format!("'{}'", id))
                .unwrap_or_else(|| "NULL".to_string());

            let amount_cents = (r.amount * 100.0) as i64;

            let rule_ids_sql = r.matched_policy_id
                .as_ref()
                .map(|id| format!("['{}']" , id))
                .unwrap_or_else(|| "[]".to_string());

            let zkp_proof_sql = r
                .zkp_proof
                .as_ref()
                .map(|p| format!("'{}'", p.replace("'", "''")))
                .unwrap_or_else(|| "''".to_string());

            values.push(format!(
                "('{}', '{}', '{}', '{}', '{}', '{}', {}, 'USD', '{}', {}, {}, {}, {}, '{}', {}, {}, {}, {})",
                r.ts.format("%Y-%m-%d %H:%M:%S.%3f"),
                r.org_id,
                r.agent_id,
                r.req_id,
                r.action,
                r.target_url,
                amount_cents,
                decision_str,
                r.latency_us,
                rule_ids_sql,
                if r.shadow_mode { 1 } else { 0 },
                permit_id_sql,
                sig_status_str,
                denial_reason_sql,
                r.sim,
                matched_policy_id_sql,
                zkp_proof_sql
            ));
        }

        let query = format!(
            "INSERT INTO transaction_logs (ts, org_id, agent_id, req_id, method, target_url, amount_cents, currency, decision, latency_us, rule_ids, shadow_mode, permit_id, sig_status, denial_reason, sim_score, matched_policy_id, zkp_proof) VALUES {}",
            values.join(",")
        );

        let resp = self.client
            .post(&self.clickhouse_url)
            .body(query)
            .send()
            .await
            .map_err(|e| AuditError::ClickHouse(e.to_string()))?;

        if !resp.status().is_success() {
            let body = resp.text().await.unwrap_or_default();
            return Err(AuditError::ClickHouse(body));
        }

        Ok(())
    }
}

pub fn spawn_audit_system(
    clickhouse_url: String,
    clickhouse_user: Option<String>,
    clickhouse_password: Option<String>,
) -> Arc<AuditLogger> {
    let (tx, rx) = mpsc::channel(10000);
    let worker = AuditWorker::new(rx, clickhouse_url, clickhouse_user, clickhouse_password, 100, 1000);
    tokio::spawn(worker.run());
    Arc::new(AuditLogger::new(tx))
}