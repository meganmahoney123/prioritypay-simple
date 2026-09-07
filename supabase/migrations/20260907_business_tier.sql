-- PHASE Q: Business tier -- multi-entity cash aggregation + QuickBooks
-- Online sync, gated behind a separate paid plan.
--
-- Design decisions made before writing this (see PROJECT_HANDOFF.md's
-- conventions -- append-only PHASE blocks, everything nullable/optional so
-- production stays live through the migration):
--
-- 1. "Plan" is modeled as its own column on simple_profiles (`plan`), not
--    folded into `persona`. Persona describes WHO the user is
--    (self-employed / business owner / W2); plan describes WHAT THEY PAY
--    FOR. A "Business Owner (With Employees)" persona on the $19/mo Simple
--    plan is a normal, expected combination -- the Business Owner persona
--    already exists purely to show payroll-aware SEP IRA math in Close-Out
--    (see the estimated_employee_payroll column, added earlier) and has
--    nothing to do with billing. Same paralleling-isReadOnly() pattern
--    subscription.js already uses for trial vs. paid.
-- 2. Multi-entity is real, not cosmetic: `simple_entities` is a new
--    grouping table, and every table that needs to be scoped per-business
--    gets a nullable `entity_id` FK. Nullable is load-bearing here, not
--    incidental -- every existing account, transfer, and split rule has no
--    entity_id and keeps working exactly as before ("no entity" reads as
--    "belongs to the user's one personal/business cash pool", same as
--    today). Business tier customers can optionally create entities and
--    assign accounts to them; Simple-plan customers never see entities at
--    all and their data is untouched.
-- 3. QuickBooks Online connections and the profit-vs-deposit true-up are
--    both scoped to entity_id (nullable) rather than user_id alone, since
--    a business-tier user may run QBO per-entity (or, if they only ever
--    use one, entity_id just stays null for that one connection/snapshot
--    row -- same "null means the single default pool" rule as above).

-- 1. Plan column. Separate from `persona` and from `subscription_status`
-- (subscription_status is Stripe's raw status word -- trialing/active/
-- past_due/canceled; `plan` is which product tier that active
-- subscription is for). Defaults every existing row to 'simple' so
-- nothing changes for anyone until they explicitly upgrade.
alter table simple_profiles add column if not exists plan text not null default 'simple';
alter table simple_profiles add constraint simple_profiles_plan_check
  check (plan in ('simple', 'business')) not valid;
alter table simple_profiles validate constraint simple_profiles_plan_check;

-- 2. Multi-entity grouping. A business-tier user can create one row per
-- separate business/set-of-books they want aggregated and true-up'd
-- independently. Deliberately minimal for now (name + a free-text entity
-- type, same shallow shape as simple_profiles.entity_type already uses) --
-- nothing here blocks adding EIN/address/etc. later as nullable columns.
create table if not exists simple_entities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  entity_type text,
  created_at timestamptz not null default now()
);
alter table simple_entities enable row level security;
drop policy if exists "simple_entities_owner" on simple_entities;
create policy "simple_entities_owner" on simple_entities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nullable on purpose (see header comment #2): an account with no
-- entity_id belongs to the user's single default cash pool, exactly as
-- every account behaves today. Only business-tier users are ever shown UI
-- to set this.
alter table simple_accounts add column if not exists entity_id uuid references simple_entities(id) on delete set null;
create index if not exists simple_accounts_entity_id_idx on simple_accounts(entity_id) where entity_id is not null;

-- 3. QuickBooks Online connection. One row per (user, entity) OAuth grant
-- -- entity_id nullable for the same single-default-pool reason as above.
-- Tokens stored the same way Plaid's plaid_access_token already is
-- (service-role-only table, RLS enabled but every real read/write goes
-- through supabaseAdmin() per app convention -- see lib/supabaseServer.js).
-- realm_id is QBO's own company/tenant id and is what every Accounting API
-- call is scoped to.
create table if not exists simple_qbo_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid references simple_entities(id) on delete set null,
  realm_id text not null,
  access_token text not null,
  refresh_token text not null,
  access_token_expires_at timestamptz not null,
  refresh_token_expires_at timestamptz not null,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table simple_qbo_connections enable row level security;
drop policy if exists "simple_qbo_connections_owner" on simple_qbo_connections;
create policy "simple_qbo_connections_owner" on simple_qbo_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- One QBO company connected per (user, entity) slot -- re-connecting the
-- same entity replaces its row rather than accumulating duplicates.
-- entity_id can repeat as null across different realm_ids for users who
-- haven't set up entities yet, so this is scoped by realm_id, not a bare
-- unique(user_id, entity_id).
create unique index if not exists simple_qbo_connections_realm_id_key on simple_qbo_connections(realm_id);

-- 4. Profit-vs-deposit true-up snapshots. One row per (user, entity,
-- period) -- period is always the first of the month, matching Close-
-- Out's monthly-record shape (simple_monthly_closeouts). qbo_net_income is
-- pulled from QBO's ProfitAndLoss report for that period; tracked_deposits
-- is the sum of what PriorityPay's own split engine has recorded landing
-- in that entity's connected accounts over the same period (mirrors how
-- Close-Out computes real confirmed net income today, just against QBO's
-- books instead of Plaid-categorized transactions). variance is stored
-- rather than computed on read so a snapshot is a durable record of what
-- was true-up'd, even if QBO's own numbers change later.
create table if not exists simple_qbo_profit_snapshots (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id uuid references simple_entities(id) on delete set null,
  period date not null,
  qbo_net_income numeric,
  tracked_deposits numeric,
  variance numeric,
  created_at timestamptz not null default now()
);
alter table simple_qbo_profit_snapshots enable row level security;
drop policy if exists "simple_qbo_profit_snapshots_owner" on simple_qbo_profit_snapshots;
create policy "simple_qbo_profit_snapshots_owner" on simple_qbo_profit_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create unique index if not exists simple_qbo_profit_snapshots_period_key
  on simple_qbo_profit_snapshots(user_id, coalesce(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), period);
