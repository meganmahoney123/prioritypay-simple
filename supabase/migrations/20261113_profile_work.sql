-- Named businesses for the "Your profile" card in Settings, plus the
-- (optional) W-2 employer name. work_picks was added in 20261112_deposit_type.sql.
create table if not exists simple_businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  entity_type text,
  created_at timestamptz not null default now()
);
alter table simple_businesses enable row level security;
drop policy if exists "simple_businesses_owner" on simple_businesses;
create policy "simple_businesses_owner" on simple_businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table simple_profiles add column if not exists work_picks text;
alter table simple_profiles add column if not exists employer_name text;
