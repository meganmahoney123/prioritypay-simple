-- Attribute income and expenses to a specific business (Settings, Your profile).
alter table simple_transfers add column if not exists business_id uuid references simple_businesses(id) on delete set null;
alter table simple_closeout_transactions add column if not exists business_id uuid references simple_businesses(id) on delete set null;
alter table simple_withdrawals add column if not exists business_id uuid references simple_businesses(id) on delete set null;
notify pgrst, 'reload schema';
