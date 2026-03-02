-- Migration: Add alert_configs table for org-level webhook alerting
-- Supabase Edge Function reads this table to decide where to fire

ALTER TABLE alert_configs ENABLE ROW LEVEL SECURITY;

-- table already created by MCP migration, this file is the paper trail
