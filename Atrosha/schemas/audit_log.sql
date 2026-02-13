CREATE TABLE IF NOT EXISTS atrosha_audit (
    timestamp DateTime,
    agent_id String,
    request_id String,
    action String,
    amount Float64,
    target_url String,
    decision Enum8('APPROVED' = 1, 'DENIED' = 2, 'SHADOW_DENIED' = 3),
    latency_us UInt64,
    shadow_mode UInt8,
    permit_id Nullable(String),
    signature_status Enum8('VERIFIED' = 1, 'INVALID' = 2, 'MISSING' = 3, 'KEY_NOT_FOUND' = 4),
    denial_reason String DEFAULT '',
    similarity_score Float32 DEFAULT 0.0,
    matched_policy_id Nullable(String)
) ENGINE = MergeTree()
ORDER BY (timestamp, agent_id)
PARTITION BY toYYYYMM(timestamp)
TTL timestamp + INTERVAL 90 DAY;

CREATE TABLE IF NOT EXISTS atrosha_permits (
    timestamp DateTime,
    agent_id String,
    intent_hash String,
    budget_limit Float64,
    expires_at DateTime
) ENGINE = MergeTree()
ORDER BY (timestamp, agent_id)
PARTITION BY toYYYYMM(timestamp)
TTL timestamp + INTERVAL 30 DAY;
