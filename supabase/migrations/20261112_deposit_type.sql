-- Deposit type per deposit, and the person's exact work answers from onboarding.
alter table public.simple_transfers
  add column if not exists deposit_type text
  check (deposit_type in ('self_employed','owner_draw','w2','misc','retirement_income'));

alter table public.simple_profiles
  add column if not exists work_picks text;
