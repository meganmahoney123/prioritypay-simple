-- Near-miss "does this match?" candidates for in_transit transfer
-- allocations. Before this, a real Plaid transaction that landed in an
-- in_transit allocation's dest_account but fell outside AMOUNT_TOLERANCE
-- of `amount` (confirmed $200, actually sent $180) never matched anything
-- and left that allocation stuck 'in_transit' forever with no signal to
-- anyone -- see lib/reconcileTransfers.js's findNearMissCandidate/
-- maybeRecordNearMissCandidate (used by both the hourly sweep and the
-- webhook's inline check) and
-- app/api/transfer-allocations/[id]/candidate/{confirm,dismiss}/route.js,
-- which are the only places these columns get written.
--
-- All nullable/defaulted and additive -- existing rows are unaffected,
-- same pattern as calculated_amount / dest_account_label /
-- source_account_label before this (20260925_calculated_amount.sql,
-- 20260908_dest_account_label.sql, 20260923_source_account_label.sql).
--
--   candidate_transaction_id: Plaid transaction_id of the pending,
--     unconfirmed candidate. Null = no live candidate.
--   candidate_amount / candidate_date: that transaction's amount/date,
--     snapshotted for the UI and the confirm route. candidate_amount
--     becomes the allocation's real `amount` if the user confirms it;
--     calculated_amount is never touched (same as the manual
--     pre-confirm amount override).
--   candidate_dismissed: true right after "no, that's not it" -- mostly
--     for visibility; the column below is what actually prevents re-
--     proposing the same transaction.
--   candidate_last_dismissed_transaction_id: the one specific
--     transaction_id already dismissed for this row, so it isn't
--     immediately re-proposed on the next reconciliation pass while it's
--     still sitting there unmatched -- a genuinely different transaction
--     can still become a new candidate.
alter table simple_transfer_allocations add column if not exists candidate_transaction_id text;
alter table simple_transfer_allocations add column if not exists candidate_amount numeric;
alter table simple_transfer_allocations add column if not exists candidate_date date;
alter table simple_transfer_allocations add column if not exists candidate_dismissed boolean not null default false;
alter table simple_transfer_allocations add column if not exists candidate_last_dismissed_transaction_id text;
