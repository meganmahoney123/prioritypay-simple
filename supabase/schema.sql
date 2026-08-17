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
