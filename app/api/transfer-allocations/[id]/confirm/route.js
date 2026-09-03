import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Marks a single manual-approval allocation line as sent -- BY THE USER,
// not by PriorityPay (see TRANSFER_EXECUTION_MODE in lib/runSplit.js;
// PriorityPay never originates the transfer itself in manual_approval
// mode). This lands on 'in_transit', not 'completed' -- the user has
// attested the money is moving, but nothing here has actually seen it
// arrive yet. lib/reconcileTransfers.js (run opportunistically from
// GET /api/accounts) checks the destination account's real Plaid
// transactions and flips the status to 'completed' + sets settled_at the
// moment a matching deposit shows up there; app/api/transfer-allocations/
// [id]/settle/route.js is the manual override if reconciliation misses it.
// 'in_transit' counts toward every totals query exactly like 'completed'
// does (see PHASE S, supabase/schema.sql) -- this is about giving an
// honest "still in transit" signal in the UI, not about excluding it from
// the numbers.
//
// Allocations have no user_id column of their own -- ownership is enforced
// the same way the "own transfer allocations" RLS policy in schema.sql
// does it, by joining through the parent transfer's user_id.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  // Dynamic route params are a Promise as of Next.js 15 -- must be awaited.
  const { id: allocationId } = await params;

  const { data: allocation, error: fetchError } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, transfer_id, simple_transfers!inner(user_id)")
    .eq("id", allocationId)
    .eq("simple_transfers.user_id", user.id)
    .single();

  if (fetchError || !allocation) {
    return Response.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (allocation.status !== "needs_approval") {
    return Response.json({ error: "This transfer isn't awaiting confirmation." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({ status: "in_transit", confirmed_at: new Date().toISOString() })
    .eq("id", allocationId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  // If this was the last 'needs_approval' line on its parent transfer,
  // the whole transfer is done -- flip it so History/Dashboard stop
  // treating it as something still waiting on the user.
  const { data: remaining } = await admin
    .from("simple_transfer_allocations")
    .select("id")
    .eq("transfer_id", allocation.transfer_id)
    .eq("status", "needs_approval");

  if (!remaining || remaining.length === 0) {
    await admin.from("simple_transfers").update({ status: "completed" }).eq("id", allocation.transfer_id);
  }

  return Response.json({ ok: true });
}
