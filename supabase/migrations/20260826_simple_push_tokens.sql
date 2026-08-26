-- Backs app/api/push/register (see lib/native.js's registerForPushNotifications).
-- Not run automatically by this app -- run it yourself in the Supabase SQL
-- editor (or via `supabase db push` if you use the CLI) whenever you're
-- ready to start actually storing device tokens. Until this runs, the
-- register route no-ops safely and SMS deposit alerts keep working
-- unchanged -- see the comment at the top of app/api/push/register/route.js.
create table if not exists simple_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null default 'ios',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists simple_push_tokens_user_id_idx on simple_push_tokens(user_id);

alter table simple_push_tokens enable row level security;

-- Only the service-role client (supabaseAdmin(), used by the API route)
-- reads/writes this table -- no user-facing policy is needed beyond RLS
-- being on by default (deny-all to anon/authenticated roles).
