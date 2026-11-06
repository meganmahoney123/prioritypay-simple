// Shared server-side helpers for the deposit-grouped transfer checklist
// (components/PendingTransfers.js, app/api/transfers/deposits and the
// per-deposit routes under app/api/transfers/[id]/). PrioritySave never
// moves money: "Mark as transferred" only records that the user says they
// made the transfer themselves, exactly like the single-line confirm route
// (app/api/transfer-allocations/[id]/confirm), which this mirrors.
//
// See supabase/migrations/20261106_deposit_checklist.sql for the columns
// used here (deposit_name, skipped_at, skip_reason, status_before_skip,
// confirm_batch_id).

import { randomUUID } from "node:crypto";

export const SKIP_REASONS = [
  "Not business income",
  "Refund or reimbursement",
  "Transfer between my accounts",
  "Other",
];

// Same rule the single-line confirm/skip routes already use: a deposit is
// done ('completed') once none of its lines are still waiting on the user.
// Skipped deposits keep 'skipped' until they're undone.
export async function recomputeTransferStatus(admin, transferId) {
  const { data: transfer } = await admin
    .from("simple_transfers")
    .select("id, status, skipped_at")
    .eq("id", transferId)
    .single();
  if (!transfer || transfer.skipped_at) return;

  const { data: waiting } = await admin
    .from("simple_transfer_allocations")
    .select("id")
    .eq("transfer_id", transferId)
    .eq("status", "needs_approval");
  const next = waiting && waiting.length ? "needs_approval" : "completed";
  if (transfer.status !== next) {
    await admin.from("simple_transfers").update({ status: next }).eq("id", transferId);
  }
}

// Marks every given line as transferred ('needs_approval' -> 'in_transit'),
// after checking each one belongs to this user and is still waiting.
// Lines confirmed together share one confirm_batch_id, so a single bank
// transfer that covered several deposits stays on record line by line.
export async function confirmAllocations(admin, userId, allocationIds) {
  const ids = Array.from(new Set((allocationIds || []).filter(Boolean)));
  if (!ids.length) return { error: "Nothing to mark as transferred.", status: 400 };

  const { data: rows, error } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, transfer_id, simple_transfers!inner(user_id, skipped_at)")
    .in("id", ids)
    .eq("simple_transfers.user_id", userId);
  if (error) return { error: error.message, status: 500 };
  if (!rows || rows.length !== ids.length) return { error: "Transfer not found.", status: 404 };
  if (rows.some((r) => r.status !== "needs_approval" || r.simple_transfers?.skipped_at)) {
    return { error: "One of these transfers isn't waiting to be marked anymore. Refresh and try again.", status: 400 };
  }

  const batchId = ids.length > 1 ? randomUUID() : null;
  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({ status: "in_transit", confirmed_at: new Date().toISOString(), confirm_batch_id: batchId })
    .in("id", ids)
    .eq("status", "needs_approval");
  if (updateError) return { error: updateError.message, status: 500 };

  const transferIds = Array.from(new Set(rows.map((r) => r.transfer_id)));
  for (const transferId of transferIds) await recomputeTransferStatus(admin, transferId);

  return { ok: true, batchId, transferIds };
}

// Loads one of this user's transfers (deposit) with its lines, or null.
export async function loadOwnTransfer(admin, userId, transferId) {
  const { data } = await admin
    .from("simple_transfers")
    .select("id, user_id, status, skipped_at, skip_reason, simple_transfer_allocations(id, status, status_before_skip)")
    .eq("id", transferId)
    .eq("user_id", userId)
    .maybeSingle();
  return data || null;
}
