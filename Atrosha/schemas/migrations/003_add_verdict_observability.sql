-- Migration: Add Semantic Engine observability columns to transactions
-- These columns let the Dashboard show *why* a transaction was blocked/allowed

BEGIN;

ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS verdict_confidence DOUBLE PRECISION DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS verdict_latency_ms DOUBLE PRECISION DEFAULT 0.0,
    ADD COLUMN IF NOT EXISTS verdict_source TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS verdict_reason TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS payload_preview TEXT DEFAULT '';

COMMENT ON COLUMN transactions.verdict_confidence IS 'Model confidence score (0.0-1.0). 1.0 for heuristic blocks.';
COMMENT ON COLUMN transactions.verdict_source IS 'Classification source: heuristic or semantic_v3';
COMMENT ON COLUMN transactions.verdict_reason IS 'Matched pattern (heuristic) or model label (semantic)';
COMMENT ON COLUMN transactions.payload_preview IS 'First 500 chars of the request body for audit inspection';

-- partial index for fast "show me all blocks" queries on the dashboard
CREATE INDEX IF NOT EXISTS idx_tx_denied
    ON transactions(created_at DESC)
    WHERE status = 'denied';

-- partial index for heuristic-vs-model breakdown analytics
CREATE INDEX IF NOT EXISTS idx_tx_source
    ON transactions(verdict_source)
    WHERE verdict_source != '';

COMMIT;
