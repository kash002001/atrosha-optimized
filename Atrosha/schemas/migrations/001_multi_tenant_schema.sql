-- Atrosha Multi-Tenant Schema v1
-- Postgres 15+ / Supabase compatible
-- every table gets organization_id for tenant isolation

BEGIN;

-- extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector"; -- pgvector for rule embeddings

------------------------------------------------------------
-- organizations
------------------------------------------------------------
CREATE TABLE organizations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    api_key_hash  TEXT NOT NULL,                       -- sha256 of org API key
    stripe_cust   TEXT,                                -- stripe customer id
    plan_tier     TEXT NOT NULL DEFAULT 'explorer'     -- explorer | growth | scale | enterprise
        CHECK (plan_tier IN ('explorer','growth','scale','enterprise')),
    sub_status    TEXT NOT NULL DEFAULT 'trialing'     -- trialing | active | past_due | canceled
        CHECK (sub_status IN ('trialing','active','past_due','canceled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_slug ON organizations(slug);

------------------------------------------------------------
-- agents
------------------------------------------------------------
CREATE TABLE agents (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    pubkey           TEXT NOT NULL,                   -- hex-encoded ed25519
    daily_limit_cents BIGINT NOT NULL DEFAULT 0,
    per_tx_limit_cents BIGINT NOT NULL DEFAULT 0,
    rate_limit_rpm   INT NOT NULL DEFAULT 60,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    meta             JSONB DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_org ON agents(organization_id);
CREATE UNIQUE INDEX idx_agents_org_name ON agents(organization_id, name);

------------------------------------------------------------
-- rules
------------------------------------------------------------
CREATE TABLE rules (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id         UUID REFERENCES agents(id) ON DELETE CASCADE,  -- null = org-wide
    nl_text          TEXT NOT NULL,                    -- human-readable rule
    compiled_policy  JSONB NOT NULL DEFAULT '{}',     -- machine-compiled rego/json
    priority         INT NOT NULL DEFAULT 100,        -- lower = higher priority
    effect           TEXT NOT NULL DEFAULT 'deny'
        CHECK (effect IN ('allow','deny','escalate')),
    status           TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','disabled','archived')),
    version          INT NOT NULL DEFAULT 1,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rules_org ON rules(organization_id);
CREATE INDEX idx_rules_agent ON rules(agent_id);
CREATE INDEX idx_rules_effect ON rules(organization_id, effect, status);

------------------------------------------------------------
-- rule_embeddings  (pgvector for semantic conflict detection)
------------------------------------------------------------
CREATE TABLE rule_embeddings (
    rule_id    UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    embedding  vector(384) NOT NULL,                 -- e5-small / all-MiniLM-L6
    model      TEXT NOT NULL DEFAULT 'all-MiniLM-L6-v2',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (rule_id)
);

-- ivfflat index for fast cosine similarity search
CREATE INDEX idx_rule_emb_vec ON rule_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

------------------------------------------------------------
-- approvals
------------------------------------------------------------
CREATE TABLE approvals (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    tx_id            TEXT NOT NULL,
    agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    approver         TEXT,                            -- user email or 'auto'
    decision         TEXT NOT NULL
        CHECK (decision IN ('approved','denied','escalated')),
    reason           TEXT,
    decided_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approvals_tx ON approvals(tx_id);
CREATE INDEX idx_approvals_agent ON approvals(agent_id);

------------------------------------------------------------
-- daily_aggregates  (fast limit checks without scanning logs)
------------------------------------------------------------
CREATE TABLE daily_aggregates (
    agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    day           DATE NOT NULL,
    total_cents   BIGINT NOT NULL DEFAULT 0,
    tx_count      INT NOT NULL DEFAULT 0,
    denied_count  INT NOT NULL DEFAULT 0,
    PRIMARY KEY (agent_id, day)
);

CREATE INDEX idx_daily_agg_day ON daily_aggregates(day);

------------------------------------------------------------
-- row level security
------------------------------------------------------------
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_embeddings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_aggregates ENABLE ROW LEVEL SECURITY;

-- service role bypasses RLS for backend operations
-- anon/authenticated users see only their org's data
CREATE POLICY org_isolation_agents ON agents
    FOR ALL USING (organization_id = current_setting('app.org_id')::uuid);
CREATE POLICY org_isolation_rules ON rules
    FOR ALL USING (organization_id = current_setting('app.org_id')::uuid);
CREATE POLICY org_isolation_approvals ON approvals
    FOR ALL USING (organization_id = current_setting('app.org_id')::uuid);

------------------------------------------------------------
-- helper: auto-update updated_at
------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_org_updated BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_rules_updated BEFORE UPDATE ON rules
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

COMMIT;
