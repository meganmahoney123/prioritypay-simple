-- Paying for a savings goal from its own category lowers the goal (the
-- category's total cap) by the amount paid. Each change is recorded here so it
-- can be undone any time. Additive, safe to run more than once.
create table if not exists simple_goal_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  withdrawal_id uuid references simple_withdrawals(id) on delete cascade,
  label text not null,
  amount numeric not null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index if not exists simple_goal_payments_user_idx on simple_goal_payments (user_id, created_at desc);
alter table simple_goal_payments enable row level security;
