-- Debts imported from connected cards through Plaid Liabilities.
-- plaid_account_id ties a debt to the Plaid account it came from so each sync
-- updates the same row instead of adding a new one.
alter table simple_debts add column if not exists plaid_account_id text;
alter table simple_debts add column if not exists account_id uuid references simple_accounts(id) on delete set null;
alter table simple_debts add column if not exists synced_at timestamptz;
alter table simple_debts add column if not exists due_date date;
create unique index if not exists simple_debts_plaid_idx on simple_debts(user_id, plaid_account_id) where plaid_account_id is not null;
