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

-- PHASE G: Manual-approval transfers -- see TRANSFER_EXECUTION_MODE in
-- lib/runSplit.js. Dwolla (or any ACH originator) approval is a real
-- bottleneck that gates on transaction-history/volume the app doesn't have
-- yet, and requires PriorityPay itself to hold standing authority to pull
-- money out of accounts it doesn't own. Rather than sit blocked on that
-- approval, this mode has PriorityPay calculate the split and tell the
-- user exactly what to send and where, without ever touching the money --
-- the user makes each transfer themselves in their own bank/app, then
-- confirms it here. `status = 'needs_approval'` is the new value this adds
-- to simple_transfer_allocations.status (alongside the existing
-- 'reserved' / 'processing' / 'failed'); `dest_account_id` is what lets the
-- UI say "send $68 to Chase Checking •••• 1234" without a second query,
-- and `confirmed_at` is when the user actually checked it off (see
-- app/api/transfer-allocations/[id]/confirm/route.js). `on delete set
-- null` matches account_id's own behavior elsewhere in this schema --
-- deleting a connected account shouldn't cascade-delete transfer history.
alter table simple_transfer_allocations add column if not exists dest_account_id uuid references simple_accounts(id) on delete set null;
alter table simple_transfer_allocations add column if not exists confirmed_at timestamptz;

-- PHASE H: deposit-threshold SMS alerts. A user opts in with a phone number
-- and a dollar threshold; runSplit() (see lib/runSplit.js) texts them via
-- Twilio the moment a single deposit's total is at or above that threshold,
-- linking straight to the "waiting on you" checklist. sms_threshold is
-- nullable -- null/0 with sms_notifications_enabled=false is the default
-- "off" state, distinct from a genuine $0 threshold (text on every deposit),
-- so the app can tell "never configured" apart from "configured to always
-- notify."
alter table simple_profiles add column if not exists phone_number text;
alter table simple_profiles add column if not exists sms_notifications_enabled boolean not null default false;
alter table simple_profiles add column if not exists sms_threshold numeric;

-- PHASE I: minimum deposit-split threshold. A small deposit (a refund, a
-- reimbursement) shouldn't kick off the full "here's your split, go send
-- these transfers" checklist -- runSplit() (see lib/runSplit.js) only
-- gates the AUTOMATIC Plaid-deposit path on this; the manual "Split $X now"
-- button always runs, since a person clicking it has already decided this
-- amount is worth splitting. $100 is a hard floor, not just a UI default --
-- enforced both here (check constraint) and in the API layer
-- (app/api/profile, app/api/onboarding/complete), so it can't be set below
-- $100 through any path, including a future direct-DB or admin tool.
alter table simple_profiles add column if not exists min_deposit_threshold numeric not null default 100;
alter table simple_profiles drop constraint if exists simple_profiles_min_deposit_threshold_floor;
alter table simple_profiles add constraint simple_profiles_min_deposit_threshold_floor check (min_deposit_threshold >= 100);

-- PHASE J: cache Plaid Balance calls instead of re-fetching on every page
-- load. GET /api/accounts used to call plaidClient.accountsBalanceGet for
-- every linked account on every single request -- and that route is
-- fetched from five different pages (Accounts, Splits, Dashboard, Close
-- Out, Pending Transfers), so an active user checking the app after every
-- deposit could rack up far more Balance calls ($0.10 each) than the
-- Transactions line ($0.30/account, flat, regardless of how many deposits
-- flow through it) ever would. balance_updated_at lets that route skip the
-- live call when the cached value is still fresh (see BALANCE_CACHE_TTL_MS
-- in app/api/accounts/route.js); subtype is cached alongside it since it
-- used to only ever come from that same live call (see AccountSelect's
-- excludeSubtypes, which needs it to keep checking accounts out of the
-- Investments picker) and would otherwise silently go stale/null between
-- refreshes.
alter table simple_accounts add column if not exists balance_updated_at timestamptz;
alter table simple_accounts add column if not exists subtype text;

-- PHASE K: stop polling Plaid's live Balance endpoint on every page load,
-- even on a cache timer -- PHASE J's 24-hour TTL still meant a
-- daily-active user racked up one live Balance call per account per
-- calendar day, which scales with how often someone opens the app, not
-- with anything PriorityPay actually needs balance for. Instead,
-- current_balance is now a running ledger: seeded once from a real Plaid
-- call, then adjusted in place by app/api/plaid/webhook as each new
-- transaction (not just deposits -- every posted transaction, so
-- non-deposit activity like a card swipe or a fee is reflected too)
-- syncs in, which the app is already paying for via Transactions and
-- already fetching for auto-split. balance_reconciled_at is a NEW,
-- separate timestamp from balance_updated_at: it only advances on a real
-- live Plaid Balance call (the initial seed, plus a periodic
-- reconciliation -- see RECONCILE_INTERVAL_MS in app/api/accounts/route.js)
-- and is what decides when the next live call is due. balance_updated_at
-- keeps its existing meaning (freshest known value as of this timestamp,
-- whether that came from a live call or a webhook-driven ledger
-- adjustment) so the UI's "as of" display doesn't change.
--
-- The trade-off, by design: the ledger can drift slightly from the real
-- bank balance between reconciliations -- a pending charge that settles
-- for a different amount than it authorized for, a bank fee, an odd
-- hold -- since only `added` transactions from Plaid's sync are applied
-- here (modified/removed are deliberately not, same reasoning as
-- lib/plaidSync.js's existing comment on why syncNewTransactions only
-- returns `added`). The periodic reconciliation call corrects any drift.
-- This never affects deposit detection or the actual split math, which
-- both already run entirely off Transactions, not Balance.
alter table simple_accounts add column if not exists balance_reconciled_at timestamptz;

-- PHASE L: encrypt accounts.plaid_access_token at rest -- no schema change,
-- since this column was already `text` and simply now holds an AES-256-GCM
-- encrypted blob (see lib/tokenCrypto.js) instead of a raw token. Requires
-- PLAID_TOKEN_ENCRYPTION_KEY to be set (see .env.example). Rows written
-- before this shipped keep working as plain Plaid access tokens
-- (decryptToken tolerates the legacy format) and self-heal to encrypted
-- form the next time each row is read by GET /api/accounts or the Plaid
-- webhook -- no backfill script needed, nothing to run here.

-- PHASE M: deposit-threshold SMS alerts flip from opt-in to on-by-default
-- (Megan's call -- this is the notification that actually gets someone
-- back into the app to act on their split checklist, so it shouldn't be
-- an easy-to-miss checkbox someone leaves unchecked). Still a real,
-- respected toggle -- Settings keeps the on/off checkbox, and
-- lib/runSplit.js still gates on sms_notifications_enabled -- this just
-- changes what a person starts with. Default flips to true for anyone who
-- signs up from here on, and every existing row is backfilled to true so
-- this takes effect for the whole user base immediately, not just new
-- signups. Someone still needs a phone number on file for anything to
-- actually send either way.
alter table simple_profiles alter column sms_notifications_enabled set default true;
update simple_profiles set sms_notifications_enabled = true where sms_notifications_enabled = false;
