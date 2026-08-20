-- PriorityPay Simple schema. Run this once in a fresh Supabase project:
-- Project -> SQL Editor -> New query -> paste -> Run.
-- Everything is scoped to auth.users(id) via Supabase Auth, with row-level
-- security so a logged-in user can only ever see their own rows. Server-side
-- API routes use the service-role key, which bypasses RLS by design.
--
-- Unlike the original PriorityPay schema, there is no split_rules_fixed
-- table at all -- PriorityPay Simple has exactly one split mechanism
-- (percentage of every deposit), so split_rules_percent is the only rules
-- table. Solo 401k / SEP IRA / Investments live directly as percent rows
-- (retirement_type / investment_type columns), same as they do in the
-- original app's percent table, just without a fixed-row counterpart.

create extension if not exists "uuid-ossp";

create table if not exists simple_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  persona text not null default 'Self-Employed (No W2 Employees)',
  business_name text,
  entity_type text default 'Sole proprietor / freelancer',
  income_handling text default 'separate',
  has_w2_plan boolean default false,
  w2_elective_deferral_ytd numeric default 0,
  age_bracket text default 'under50',
  onboarded boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists simple_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_name text not null,
  account_name text not null,
  mask text,
  plaid_item_id text,
  plaid_access_token text,
  plaid_account_id text,
  plaid_cursor text,
  dwolla_funding_source_id text,
  current_balance numeric,
  created_at timestamptz not null default now()
);

create table if not exists simple_dwolla_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dwolla_customer_id text not null,
  dwolla_customer_url text not null,
  verification_status text,
  created_at timestamptz not null default now()
);

-- The only split-rules table in this project. Every category -- Solo 401k,
-- SEP IRA, Investments, Tax Reserve, Emergency Fund, OPEX, Savings, or
-- anything custom -- is a row here: a percentage of every deposit, two
-- independent optional caps (see below), and a connected account.
create table if not exists simple_split_rules_percent (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  group_name text,
  pct numeric not null default 0,
  cap numeric, -- optional MONTHLY TOTAL cap, resets every calendar month
  color text not null default '#065f46',
  account_id uuid references simple_accounts(id) on delete set null,
  retirement_type text, -- 'solo_401k' | 'sep_ira' | null
  investment_type text, -- slug derived from label for investment-flavored rows, or null
  created_at timestamptz not null default now()
);

-- Added after the table above already existed in production -- `cap` is a
-- monthly-total cap (resets each month), `balance_cap` is a separate,
-- independent cap keyed off the connected account's live balance instead
-- (never resets on its own; only clears itself once the account's balance
-- drops back below it, e.g. from a real withdrawal). Both are optional and
-- a row may have neither, either, or both at once -- whichever leaves less
-- room wins on a given deposit (see computeAllocations in
-- lib/allocations.js). Not applied to Investments/Retirement sub-account
-- rows in the UI, by product decision -- those buckets are meant to keep
-- receiving their full percentage indefinitely.
alter table simple_split_rules_percent add column if not exists balance_cap numeric;

-- Credit cards are linked purely for close-out expense visibility --
-- never a split-rule destination and never wired to Dwolla, since Dwolla
-- funding sources only support depository (checking/savings) accounts.
-- 'depository' is the default for every account linked through the
-- original checking/savings flow.
alter table simple_accounts add column if not exists account_type text not null default 'depository';

-- Business Owner (With Employees) persona: a rough, self-reported
-- estimate of total annual employee payroll (not per-employee detail --
-- no payroll integration exists), used purely to show the SEP IRA
-- employer-parity cost (same contribution % owed to every eligible
-- employee) alongside the owner's own contribution room. Null for
-- every other persona.
alter table simple_profiles add column if not exists estimated_employee_payroll numeric;

create table if not exists simple_transfers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_amount numeric not null,
  dwolla_transfer_id text,
  status text not null default 'pending',
  trigger text not null default 'manual',
  plaid_transaction_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists transfers_plaid_transaction_id_key
  on simple_transfers(plaid_transaction_id) where plaid_transaction_id is not null;

create table if not exists simple_transfer_allocations (
  id uuid primary key default uuid_generate_v4(),
  transfer_id uuid not null references simple_transfers(id) on delete cascade,
  category_type text not null default 'percent',
  label text not null,
  amount numeric not null,
  reserved_only boolean not null default false,
  dwolla_transfer_id text,
  status text not null default 'reserved',
  retirement_type text,
  investment_type text
);

-- The user's REAL Solo 401k / SEP IRA account -- deliberately separate from
-- split_rules_percent's account_id, which is just where that money holds
-- until Close-Out sends it here in one click.
create table if not exists simple_retirement_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  retirement_type text not null,
  account_id uuid not null references simple_accounts(id) on delete cascade,
  connected_at timestamptz not null default now(),
  unique (user_id, retirement_type)
);

create table if not exists simple_monthly_closeouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period date not null,
  status text not null default 'draft',
  net_income numeric,
  tax_rate_pct numeric not null default 25,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

create table if not exists simple_closeout_transactions (
  id uuid primary key default uuid_generate_v4(),
  closeout_id uuid not null references simple_monthly_closeouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references simple_accounts(id) on delete set null,
  plaid_transaction_id text not null,
  txn_date date not null,
  name text,
  amount numeric not null,
  direction text not null,
  suggested_category text not null,
  confirmed_category text,
  created_at timestamptz not null default now(),
  unique (closeout_id, plaid_transaction_id)
);

-- ---------- Row Level Security ----------

alter table simple_profiles enable row level security;
alter table simple_accounts enable row level security;
alter table simple_dwolla_customers enable row level security;
alter table simple_split_rules_percent enable row level security;
alter table simple_transfers enable row level security;
alter table simple_transfer_allocations enable row level security;
alter table simple_retirement_accounts enable row level security;
alter table simple_monthly_closeouts enable row level security;
alter table simple_closeout_transactions enable row level security;

create policy "own profile" on simple_profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own accounts" on simple_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own dwolla customer" on simple_dwolla_customers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own percent rules" on simple_split_rules_percent for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transfers" on simple_transfers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own transfer allocations" on simple_transfer_allocations for all using (
  exists (select 1 from simple_transfers t where t.id = transfer_id and t.user_id = auth.uid())
);
create policy "own retirement accounts" on simple_retirement_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own closeouts" on simple_monthly_closeouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own closeout transactions" on simple_closeout_transactions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create a profile row the moment someone signs up.
create or replace function public.handle_new_simple_user()
returns trigger as $$
begin
  insert into public.simple_profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_simple on auth.users;
create trigger on_auth_user_created_simple
  after insert on auth.users
  for each row execute procedure public.handle_new_simple_user();

-- Account lockout after repeated failed logins (Dwolla approval requirement:
-- lock an account for at least 30 minutes after 10 incorrect password
-- attempts). Enforced at the app level in app/api/auth/login/route.js --
-- the login page always goes through that route, which checks/updates this
-- table via the service-role client before/after calling Supabase Auth.
--
-- (Supabase also offers a server-side "Password Verification" Auth Hook
-- that would enforce this even against direct Supabase Auth API calls, but
-- that hook requires the Team plan ($599/mo) -- not worth it for this one
-- feature, so we enforce in our own app code instead.)
--
-- Keyed by email (lowercased), not user_id, because we need to check
-- lockout status before Supabase Auth has told us whether the email even
-- corresponds to a real account -- looking up a user_id from an email
-- pre-auth would need an extra admin API call for no real benefit.
--
-- Only the service_role (our own server-side API routes) can read or write
-- this table -- not end users, and not the browser's anon key.
create table if not exists public.simple_login_lockouts (
  email text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  last_attempt_at timestamptz not null default now()
);

grant all on table public.simple_login_lockouts to service_role;
revoke all on table public.simple_login_lockouts from authenticated, anon, public;

-- PHASE C: Subscription billing (Stripe) -- 30 days free, then $12/mo.
--
-- trial_ends_at is set once, at signup, inside handle_new_simple_user()
-- below -- a single source of truth so it's correct regardless of which
-- app code path creates the user, rather than being computed from
-- created_at at read time (which would need every caller to agree on the
-- same "30 days" constant forever).
--
-- subscription_status mirrors Stripe's own subscription status values
-- (trialing / active / past_due / canceled) and is kept in sync by the
-- Stripe webhook handler (app/api/stripe/webhook/route.js) -- it is NOT
-- flipped to anything else when a trial lapses unpaid. "Read-only" isn't
-- its own status: app code treats a profile as read-only whenever
-- subscription_status is 'trialing' (or 'past_due'/'canceled') AND
-- trial_ends_at has passed with no active subscription. This avoids
-- needing a cron job or extra webhook event just to flip a status the
-- instant a trial expires.
alter table simple_profiles add column if not exists subscription_status text not null default 'trialing';
alter table simple_profiles add column if not exists trial_ends_at timestamptz;
alter table simple_profiles add column if not exists stripe_customer_id text;
alter table simple_profiles add column if not exists stripe_subscription_id text;

create or replace function public.handle_new_simple_user()
returns trigger as $$
begin
  insert into public.simple_profiles (id, trial_ends_at) values (new.id, now() + interval '30 days');
  return new;
end;
$$ language plpgsql security definer;

-- PHASE D: Business Financials -- a one-time-per-year (editable anytime)
-- manual entry of Schedule-C-style totals, so the Tax Strategy Advisor has
-- a real business profit figure for anyone running a separate business
-- entity, instead of guessing from personal-account cash flow (which is
-- only accurate for a sole proprietor with no separate entity -- see
-- lib/advisorPrompt.js). Deliberately NOT synced from Plaid: pulling real
-- business-account transactions in automatically was considered and
-- intentionally not built yet (would need its own categorization review
-- flow, kept separate from Close-Out's personal net-income math). This is
-- the lightweight alternative -- reusing Schedule C's own line items,
-- since that's the actual IRS form this advice is in service of, and it's
-- something anyone running a business already has from bookkeeping or a
-- prior year's return.
create table if not exists simple_business_financials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  gross_receipts numeric not null default 0,
  cost_of_goods_sold numeric not null default 0,
  advertising numeric not null default 0,
  car_and_truck numeric not null default 0,
  contract_labor numeric not null default 0,
  depreciation numeric not null default 0,
  insurance numeric not null default 0,
  legal_and_professional numeric not null default 0,
  office_expense numeric not null default 0,
  rent numeric not null default 0,
  repairs_and_maintenance numeric not null default 0,
  supplies numeric not null default 0,
  taxes_and_licenses numeric not null default 0,
  travel numeric not null default 0,
  meals numeric not null default 0,
  utilities numeric not null default 0,
  wages numeric not null default 0,
  other_expenses numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, tax_year)
);

alter table simple_business_financials enable row level security;
create policy "own business financials" on simple_business_financials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PHASE E: Advisor usage cap -- one row per user per calendar month,
-- incremented once per completed chat turn (never on a capped/blocked
-- attempt, so hitting the cap doesn't cost anything further). Kept as its
-- own tiny table rather than a column on simple_profiles so the monthly
-- reset is just "a new row," with no cron job or reset logic needed --
-- see app/api/advisor/chat/route.js.
create table if not exists simple_advisor_usage (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month text not null, -- "YYYY-MM"
  message_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table simple_advisor_usage enable row level security;
create policy "own advisor usage" on simple_advisor_usage for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PHASE F: Tax Savings Quiz leads -- public, unauthenticated marketing quiz
-- (app/tax-savings-quiz) that runs entirely server-side via
-- lib/quizEngine.js (no LLM calls -- deterministic matching against the
-- same curated strategy library the in-app advisor uses). Every submission
-- is stored here for follow-up: email + raw answers + which strategy ids
-- matched. Deliberately NO RLS policy is defined (RLS is still enabled) --
-- this table has no owning user, so there is nothing for anon/authenticated
-- roles to be granted access to. Only the service-role client
-- (supabaseAdmin(), used exclusively inside app/api/quiz/submit/route.js)
-- can read or write it, since the service role bypasses RLS entirely.
create table if not exists simple_quiz_leads (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  persona text[] not null default '{}',
  answers jsonb not null default '{}',
  matched_strategy_ids text[] not null default '{}',
  ip_address text,
  created_at timestamptz not null default now()
);

alter table simple_quiz_leads enable row level security;
create index if not exists simple_quiz_leads_ip_created_idx on simple_quiz_leads (ip_address, created_at);
