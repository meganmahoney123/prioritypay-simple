-- Safe to run more than once. Makes sure every deposit-type column exists and that
-- "investment" (Investment income) is an allowed deposit type.
alter table public.simple_profiles add column if not exists work_picks text;

alter table public.simple_transfers add column if not exists deposit_type text;
alter table public.simple_transfers drop constraint if exists simple_transfers_deposit_type_check;
alter table public.simple_transfers
  add constraint simple_transfers_deposit_type_check
  check (deposit_type is null or deposit_type in ('self_employed','owner_draw','w2','misc','retirement_income','investment'));

alter table public.simple_transfers add column if not exists business_id uuid references public.simple_businesses(id) on delete set null;
alter table public.simple_closeout_transactions add column if not exists business_id uuid references public.simple_businesses(id) on delete set null;
alter table public.simple_withdrawals add column if not exists business_id uuid references public.simple_businesses(id) on delete set null;

notify pgrst, 'reload schema';
