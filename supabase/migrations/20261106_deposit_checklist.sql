-- Transfer checklist grouped by deposit (web branch). Additive and nullable only:
-- no existing column changes, no data removed, safe to re-run.
--
-- simple_transfers.deposit_name     -- the bank transaction's name (e.g. "Retainer: Mesa Dental"),
--                                     recorded by runSplit from the Plaid webhook going forward.
-- simple_transfers.skipped_at       -- set when someone uses "Skip this deposit"; null otherwise.
-- simple_transfers.skip_reason      -- the reason picked ("Not business income", "Refund", ...).
-- simple_transfer_allocations.status_before_skip
--                                   -- each line's status right before its deposit was skipped,
--                                     so Undo restores it exactly (lines deleted individually
--                                     before the skip stay deleted).
-- simple_transfer_allocations.confirm_batch_id
--                                   -- shared id stamped on every line marked as transferred in
--                                     one action from the multi-deposit summary, so it's on record
--                                     which deposits one bank transfer covered.

alter table simple_transfers add column if not exists deposit_name text;
alter table simple_transfers add column if not exists skipped_at timestamptz;
alter table simple_transfers add column if not exists skip_reason text;
alter table simple_transfer_allocations add column if not exists status_before_skip text;
alter table simple_transfer_allocations add column if not exists confirm_batch_id uuid;

-- Backfill names for existing deposits from Close-Out's imported transactions
-- (same Plaid transaction id, same user). Only fills blanks; never overwrites.
update simple_transfers t
set deposit_name = c.name
from simple_closeout_transactions c
where t.deposit_name is null
  and t.plaid_transaction_id is not null
  and c.user_id = t.user_id
  and c.plaid_transaction_id = t.plaid_transaction_id;

notify pgrst, 'reload schema';
