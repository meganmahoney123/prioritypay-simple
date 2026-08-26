-- Backs app/api/contact (the new /contact page's form). Same pattern as
-- simple_quiz_leads: public/unauthenticated writes, no per-row read policy
-- because only the service-role client (supabaseAdmin(), used by the API
-- route) ever reads it back -- Megan checks messages in the Supabase table
-- editor rather than this needing its own inbox UI. Not run automatically --
-- run it in the Supabase SQL editor before /contact goes live.
create table if not exists simple_contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  ip_address text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists simple_contact_messages_created_idx on simple_contact_messages (created_at desc);
create index if not exists simple_contact_messages_ip_created_idx on simple_contact_messages (ip_address, created_at);

alter table simple_contact_messages enable row level security;
