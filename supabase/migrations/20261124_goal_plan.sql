-- Goal planner: each savings goal can have groups (categories) of items with
-- amounts, links, notes, a picture and a status. Additive, safe to re-run.
create table if not exists simple_goal_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  name text not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists simple_goal_groups_idx on simple_goal_groups (user_id, label);
alter table simple_goal_groups enable row level security;

create table if not exists simple_goal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  label text not null,
  group_id uuid not null references simple_goal_groups(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  status text not null default 'idea',
  link text,
  note text,
  photo_url text,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists simple_goal_items_idx on simple_goal_items (user_id, label);
alter table simple_goal_items enable row level security;
