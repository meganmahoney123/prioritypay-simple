-- Bills and autopays: recurring payments found in linked accounts (pending
-- until the person confirms them) plus ones added by hand.
create table if not exists simple_bills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  amount numeric not null default 0,
  frequency text not null default 'monthly',
  next_due date,
  last_paid date,
  account_id uuid references simple_accounts(id) on delete set null,
  note text,
  source text not null default 'manual',      -- 'detected' or 'manual'
  status text not null default 'confirmed',   -- 'pending' (needs OK), 'confirmed', 'dismissed'
  autopay boolean not null default false,     -- set by the person: is this paid by autopay at the lender?
  plaid_stream_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists simple_bills_stream_unique on simple_bills (user_id, plaid_stream_id) where plaid_stream_id is not null;
alter table simple_bills enable row level security;
drop policy if exists "simple_bills_owner" on simple_bills;
create policy "simple_bills_owner" on simple_bills
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
notify pgrst, 'reload schema';
