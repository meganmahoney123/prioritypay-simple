-- Debt Payoff plan: the debts a person is paying down, plus their method
-- (avalanche or snowball) and the extra amount they put toward debt each month.
create table if not exists simple_debts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  debt_type text not null default 'credit_card',
  balance numeric not null check (balance >= 0),
  apr numeric not null default 0 check (apr >= 0 and apr <= 100),
  min_payment numeric not null default 0 check (min_payment >= 0),
  paid_off_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists simple_debts_user_idx on simple_debts(user_id);
alter table simple_debts enable row level security;
drop policy if exists "simple_debts_owner" on simple_debts;
create policy "simple_debts_owner" on simple_debts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table simple_profiles add column if not exists debt_method text check (debt_method in ('avalanche','snowball'));
alter table simple_profiles add column if not exists debt_extra numeric check (debt_extra >= 0);
