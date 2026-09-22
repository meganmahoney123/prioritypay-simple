-- simple_manual_contributions was, at some point, created directly in the
-- old Supabase project's SQL Editor rather than through a committed
-- migration -- the app has read/written it from 7+ routes for a while
-- (POST /api/allocations/manual-contribution, /api/allocations/category-
-- transfer, /api/allocations/execute-real-transfer, the account-balances/
-- category-summary/total-allocation GET routes, and the dev seed route),
-- but its CREATE TABLE never existed in this repo's schema.sql or any
-- migration file. When the database was rebuilt from scratch on a new
-- Supabase project (Sep 2026, after the original project's MFA lockout),
-- re-running schema.sql + the committed migrations never recreated this
-- table -- hence "Could not find the table 'public.simple_manual_
-- contributions' in the schema cache" on the One-Time Transfer flow.
--
-- One row per manual ledger entry against a category `label` (positive =
-- money added to that category, negative = money removed from it) --
-- same "label is the identity, not a foreign key" convention as
-- simple_withdrawal_allocations.label (see PHASE notes in schema.sql),
-- since a category is identified by its label text throughout this app,
-- not a stable row id (split rule ids aren't stable across saves).
create table if not exists simple_manual_contributions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  amount numeric not null,
  note text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists simple_manual_contributions_user_id_idx on simple_manual_contributions(user_id);
create index if not exists simple_manual_contributions_user_label_idx on simple_manual_contributions(user_id, label);

alter table simple_manual_contributions enable row level security;
create policy "own manual contributions" on simple_manual_contributions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Make PostgREST pick up the new table immediately rather than waiting for
-- its periodic schema-cache refresh -- otherwise this exact error can
-- reappear for a short window right after running this migration.
notify pgrst, 'reload schema';
