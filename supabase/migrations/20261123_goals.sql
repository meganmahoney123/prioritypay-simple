-- Savings goals: a category with a total cap IS a goal (the cap is the target).
-- This table holds the extras: target date, cover picture and kind of goal.
-- Additive, safe to run more than once.
create table if not exists simple_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  goal_date date,
  cover text,
  photo_path text,
  kind text,
  created_at timestamptz not null default now(),
  unique (user_id, label)
);
alter table simple_goals enable row level security;
-- Private bucket for goal pictures people upload (read through short-lived signed links).
insert into storage.buckets (id, name, public) values ('goal-photos', 'goal-photos', false) on conflict (id) do nothing;
