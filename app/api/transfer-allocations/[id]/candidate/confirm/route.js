import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { markAllocationCompleted } from "@/lib/reconcileTransfers";

// User confirms a near-miss candidate transaction IS their transfer (see
// lib/reconcileTransfers.js's findNearMissCandidate/
// maybeRecordNearMissCandidate, and .../candidate/dismiss/route.js for the
// opposite action). candidate_amount becomes the new permanent `amount`
// for this allocation -- `amount` keeps its existing meaning everywhere
// else (the real/actual figure used for balances, history, reporting,
// and what reconciliation matches against) -- exactly like the manual
// pre-confirm override in .../amount/route.js, just happening after
// confirming instead of before. `calculated_amount` is never touched,
// same audit reasoning as that route and
// supabase/migrations/20260925_calculated_amount.sql.
//
// Reuses markAllocationCompleted (status -> completed, settled_at, "your
// transfer landed" notification, and now also clearing any candidate_*
// columns) instead of duplicating that logic -- this is the exact same
// finalization the hourly sweep and the webhook already perform on an
// automatic exact match, just triggered by the user's own confirmation.
//
// Same ownership shape as every other allocation route: allocations have
// no user_id column of their own, so ownership is enforced by joining
// through the parent transfer's user_id.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  // Dynamic route params are a Promise as of Next.js 15 -- must be awaited.
  const { id: allocationId } = await params;

  const { data: allocation, error: fetchError } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, transfer_id, dest_account_label, candidate_transaction_id, candidate_amount, simple_transfers!inner(user_id)")
    .eq("id", allocationId)
    .eq("simple_transfers.user_id", user.id)
    .single();

  if (fetchError || !allocation) {
    return Response.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (allocation.status !== "in_transit") {
    return Response.json({ error: "This transfer isn't in transition." }, { status: 400 });
  }
  if (!allocation.candidate_transaction_id || allocation.candidate_amount == null) {
    return Response.json({ error: "There's no pending match to confirm." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({ amount: allocation.candidate_amount })
    .eq("id", allocationId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  const settledAtIso = new Date().toISOString();
  await markAllocationCompleted(
    admin,
    {
      id: allocation.id,
      transfer_id: allocation.transfer_id,
      dest_account_label: allocation.dest_account_label,
      amount: allocation.candidate_amount,
    },
    settledAtIso
  );

  return Response.json({ ok: true });
}
