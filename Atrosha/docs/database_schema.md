# Atrosha — Database Architecture

## Three-Tier Strategy

| Tier | Engine | Purpose | Latency |
|------|--------|---------|---------|
| **Hot** | Redis | Rate limits, budgets, circuit breaker, agent registry | <1ms |
| **Warm** | PostgreSQL (Supabase) | Multi-tenant persistent data, auth, RLS | <10ms |
| **Cold** | ClickHouse | Transaction audit logs, analytics, materialized views | <100ms |

---

## PostgreSQL Schema (Supabase)

### `organizations`
Multi-tenant root entity. Every other table references `organization_id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | `uuid_generate_v4()` |
| `name` | `TEXT` | Display name |
| `slug` | `TEXT UNIQUE` | URL-safe identifier |
| `api_key_hash` | `TEXT` | SHA-256 hash of raw key |
| `stripe_cust` | `TEXT` | Stripe customer ID |
| `plan_tier` | `TEXT` | `explorer`, `growth`, `scale`, `enterprise` |
| `sub_status` | `TEXT` | `trialing`, `active`, `past_due`, `canceled` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auto-triggered |

### `agents`
Registered AI agents per org.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `organization_id` | `UUID FK → organizations` | Cascade delete |
| `name` | `TEXT` | Unique per org |
| `pubkey` | `TEXT` | Ed25519 public key |
| `daily_limit_cents` | `BIGINT` | Max daily spend |
| `per_tx_limit_cents` | `BIGINT` | Max per transaction |
| `rate_limit_rpm` | `INT` | Requests per minute (default 60) |
| `is_active` | `BOOLEAN` | Soft disable |
| `meta` | `JSONB` | Arbitrary metadata |

### `rules`
Natural-language spending rules compiled to machine-readable policies.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `organization_id` | `UUID FK` | |
| `agent_id` | `UUID FK` (nullable) | Org-wide if null |
| `nl_text` | `TEXT` | Human-readable rule |
| `compiled_policy` | `JSONB` | Machine-readable policy |
| `priority` | `INT` | Lower = higher priority |
| `effect` | `TEXT` | `allow`, `deny`, `escalate` |
| `status` | `TEXT` | `active`, `disabled`, `archived` |
| `version` | `INT` | Incremented on edit |

### `rule_embeddings`
Vector embeddings for semantic rule conflict detection.

| Column | Type | Notes |
|--------|------|-------|
| `rule_id` | `UUID PK FK → rules` | |
| `embedding` | `vector(384)` | pgvector, MiniLM-L6-v2 |
| `model` | `TEXT` | Model identifier |

Index: `ivfflat (embedding vector_cosine_ops) WITH (lists = 100)`

### `approvals`
Human-in-the-loop decision log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `UUID PK` | |
| `organization_id` | `UUID FK` | |
| `tx_id` | `TEXT` | Transaction reference |
| `agent_id` | `UUID FK` | |
| `approver` | `TEXT` | Who approved |
| `decision` | `TEXT` | `approved`, `denied`, `escalated` |
| `reason` | `TEXT` | Justification |

### `daily_aggregates`
Pre-computed daily rollups for fast limit checks.

| Column | Type | Notes |
|--------|------|-------|
| `agent_id` | `UUID FK` | Composite PK |
| `day` | `DATE` | Composite PK |
| `total_cents` | `BIGINT` | |
| `tx_count` | `INT` | |
| `denied_count` | `INT` | |

**RLS** enabled on all tables. `updated_at` auto-triggers on `organizations`, `agents`, `rules`.

---

## Redis Key Patterns

| Pattern | TTL | Purpose |
|---------|-----|---------|
| `rate:{org_id}:{agent_id}:{minute}` | 60s | Per-minute rate limiting |
| `atrosha:{org_id}:keys:{agent_id}` | — | Agent registry (pubkey, roles) |
| `cb:{agent_id}:deny_count` | 300s | Circuit breaker denial counter |
| `cb:{agent_id}:open` | 300s | Circuit breaker open flag |
| `atrosha:{org_id}:budget:{agent_id}` | — | Daily spend accumulator |

---

## ClickHouse Schema

### `transaction_logs`
Engine: `MergeTree()` partitioned by `toYYYYMMDD(ts)`, ordered by `(org_id, agent_id, ts)`.

| Column | Type | Notes |
|--------|------|-------|
| `ts` | `DateTime64(3, 'UTC')` | Insertion timestamp |
| `org_id` | `String` | Organization |
| `agent_id` | `String` | Agent |
| `req_id` | `String` | Request trace ID |
| `method` | `LowCardinality(String)` | HTTP method |
| `target_url` | `String` | Destination |
| `amount_cents` | `Int64` | Amount in cents |
| `currency` | `LowCardinality(String)` | Default `USD` |
| `decision` | `LowCardinality(String)` | `approved`/`denied`/`shadow_denied` |
| `latency_us` | `UInt64` | Processing time |
| `rule_ids` | `Array(String)` | Matched rules |
| `permit_id` | `String` | JWT permit reference |
| `sig_status` | `LowCardinality(String)` | Ed25519 verify result |
| `shadow` | `UInt8` | Shadow mode flag |
| `sim_score` | `Float64` | Policy similarity |
| `error_msg` | `String` | If denied, why |

**TTL**: `ts + INTERVAL 365 DAY`

### `mv_daily_agent_stats`
Materialized view auto-computing daily rollups:
- `total_cents`, `tx_count`, `denied_count`, `avg_latency_us`, `max_amount_cents`

---

## Data Flow

```
Agent Request
    │
    ├── Redis: rate limit check (org-scoped)
    ├── Redis: circuit breaker check
    ├── Redis: budget check + commit
    │
    ├── [async] ClickHouse: INSERT into transaction_logs
    │
    └── Postgres: rule loading, org config (warm path)
```
