-- Whether a deposit is Business or Other income, stored per deposit so it can
-- be corrected from Split My Deposits. Null = not set yet (the app then guesses:
-- deposits that came from a bank transaction are Business, the rest Other).
alter table simple_transfers add column if not exists source_kind text;
alter table simple_transfers drop constraint if exists simple_transfers_source_kind_check;
alter table simple_transfers add constraint simple_transfers_source_kind_check check (source_kind is null or source_kind in ('business', 'other'));
