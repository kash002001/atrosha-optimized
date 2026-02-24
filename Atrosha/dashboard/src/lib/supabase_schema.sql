-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Organizations
-- ==========================================
create table if not exists organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique,
  api_key_hash text,
  stripe_cust text,
  plan_tier text default 'explorer',
  sub_status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table organizations enable row level security;

-- Idempotent Policy Creation
drop policy if exists "Enable read access for all users" on organizations;
create policy "Enable read access for all users" on organizations for select using (auth.role() = 'authenticated');


-- ==========================================
-- 2. Agents
-- ==========================================
create table if not exists agents (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  pubkey text,
  daily_limit_cents bigint default 0,
  per_tx_limit_cents bigint default 0,
  rate_limit_rpm int default 60,
  is_active boolean default true,
  meta jsonb default '{}',
  created_at timestamptz default now()
);

-- RLS
alter table agents enable row level security;

-- Idempotent Policy Creation
drop policy if exists "Enable read access for all users" on agents;
create policy "Enable read access for all users" on agents for select using (auth.role() = 'authenticated');

drop policy if exists "Enable insert access for all users" on agents;
create policy "Enable insert access for all users" on agents for insert with check (auth.role() = 'authenticated');


-- ==========================================
-- 3. Rules
-- ==========================================
create table if not exists rules (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  nl_text text,
  compiled_policy jsonb,
  priority int default 10,
  effect text default 'allow',
  status text default 'active',
  version int default 1,
  created_at timestamptz default now()
);

-- RLS
alter table rules enable row level security;

-- Idempotent Policy Creation
drop policy if exists "Enable read access for all users" on rules;
create policy "Enable read access for all users" on rules for select using (auth.role() = 'authenticated');

drop policy if exists "Enable insert access for all users" on rules;
create policy "Enable insert access for all users" on rules for insert with check (auth.role() = 'authenticated');

drop policy if exists "Enable delete access for all users" on rules;
create policy "Enable delete access for all users" on rules for delete using (auth.role() = 'authenticated');


-- ==========================================
-- 4. Transactions 
-- ==========================================
create table if not exists transactions (
  id text primary key, -- external transaction id
  organization_id uuid references organizations(id),
  agent_id text, -- ID string from the agent
  amount bigint, -- cents
  currency text default 'USD',
  status text, -- approved/denied
  destination text,
  sim_score real,
  latency_ms real,
  denial_reason text,
  created_at timestamptz default now()
);

-- RLS
alter table transactions enable row level security;

-- Idempotent Policy Creation
drop policy if exists "Enable read access for all users" on transactions;
create policy "Enable read access for all users" on transactions for select using (auth.role() = 'authenticated');


-- ==========================================
-- 5. Dummy Data (Safe Insert)
-- ==========================================
insert into transactions (id, agent_id, amount, status, destination, sim_score, latency_ms, denial_reason, created_at)
values 
('tx-demo-001', 'Stripe', 4500, 'approved', 'stripe.com/charges', 1.0, 13.06, null, now()),
('tx-demo-002', 'OpenAI', 250, 'approved', 'api.openai.com/v1', 0.99, 12.8, null, now() - interval '2 minutes'),
('tx-demo-003', 'Wise', 120000, 'denied', 'transfer.wise.com', 1.0, 14.2, 'semantic firewall DENIED request', now() - interval '1 hour')
on conflict (id) do nothing;
