-- ClickHouse: transaction_logs
-- optimized for high-throughput append-only audit trail
-- LowCardinality on low-cardinality string cols to cut storage ~60%

CREATE TABLE IF NOT EXISTS transaction_logs (
    ts            DateTime64(3)          DEFAULT now64(3),
    org_id        LowCardinality(String) DEFAULT '',
    agent_id      String                 DEFAULT '',
    req_id        String                 DEFAULT '',
    method        LowCardinality(String) DEFAULT '',     -- GET, POST, TRANSFER, etc
    target_url    String                 DEFAULT '',
    amount_cents  Int64                  DEFAULT 0,
    currency      LowCardinality(String) DEFAULT 'USD',
    decision      LowCardinality(String) DEFAULT '',     -- APPROVED, DENIED, SHADOW_DENIED
    latency_us    UInt32                 DEFAULT 0,
    rule_ids      Array(String)          DEFAULT [],     -- which rules fired
    shadow_mode   UInt8                  DEFAULT 0,
    permit_id     Nullable(String),
    sig_status    LowCardinality(String) DEFAULT 'MISSING',
    denial_reason String                 DEFAULT '',
    sim_score     Float32                DEFAULT 0.0,
    matched_policy_id Nullable(String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(ts)
ORDER BY (org_id, agent_id, ts)
TTL ts + INTERVAL 365 DAY
SETTINGS index_granularity = 8192;

-- materialized view for per-agent daily rollups (optional but useful)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_agent_stats
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (org_id, agent_id, day)
AS
SELECT
    toDate(ts) AS day,
    org_id,
    agent_id,
    count()            AS tx_count,
    sum(amount_cents)  AS total_cents,
    countIf(decision = 'DENIED') AS denied_count,
    avg(latency_us)    AS avg_latency_us
FROM transaction_logs
GROUP BY day, org_id, agent_id;
