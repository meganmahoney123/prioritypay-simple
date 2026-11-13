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
import { typeOptionsFor } from "@/lib/depositTypes";

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

  // Every deposit needs its type picked before anything is marked as moved,
  // when there is more than one kind of money to choose from (the same rule
  // the checklist screen uses to grey out its buttons). Skipped quietly if the
  // deposit_type column doesn't exist yet.
  const checkIds = Array.from(new Set(rows.map((r) => r.transfer_id)));
  const { data: typed, error: typedError } = await admin
    .from("simple_transfers")
    .select("id, deposit_type")
    .eq("user_id", userId)
    .in("id", checkIds);
  if (!typedError) {
    const { data: profile } = await admin.from("simple_profiles").select("*").eq("id", userId).single();
    const kinds = new Set(typeOptionsFor(profile).map((t) => (t === "self_employed" || t === "owner_draw" ? "biz" : t)));
    if (kinds.size > 1 && (typed || []).some((t) => !t.deposit_type)) {
      return { error: "Pick what kind of money each deposit is before marking its transfers as sent.", status: 409 };
    }
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

// Undo for "Mark as transferred": puts lines the person marked by mistake (or
// before actually sending) back on the checklist ('in_transit' ->
// 'needs_approval'). Only lines still waiting to land can be undone; a line
// that has already landed ('completed') is real money that moved and stays.
export async function unconfirmAllocations(admin, userId, allocationIds) {
  const ids = Array.from(new Set((allocationIds || []).filter(Boolean)));
  if (!ids.length) return { error: "Nothing to undo.", status: 400 };

  const { data: rows, error } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, transfer_id, simple_transfers!inner(user_id)")
    .in("id", ids)
    .eq("simple_transfers.user_id", userId);
  if (error) return { error: error.message, status: 500 };
  if (!rows || rows.length !== ids.length) return { error: "Transfer not found.", status: 404 };
  if (rows.some((r) => r.status !== "in_transit")) {
    return { error: "Only transfers that are still on the way can be undone.", status: 400 };
  }

  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({
      status: "needs_approval",
      confirmed_at: null,
      confirm_batch_id: null,
      reconcile_checked_at: null,
      candidate_transaction_id: null,
      candidate_amount: null,
      candidate_date: null,
      candidate_dismissed: false,
    })
    .in("id", ids)
    .eq("status", "in_transit");
  if (updateError) return { error: updateError.message, status: 500 };

  const transferIds = Array.from(new Set(rows.map((r) => r.transfer_id)));
  for (const transferId of transferIds) await recomputeTransferStatus(admin, transferId);
  return { ok: true, transferIds };
}
