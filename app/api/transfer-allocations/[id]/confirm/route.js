import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Marks a single manual-approval allocation line as sent. This is the only
// place an allocation's status ever moves off 'needs_approval' while
// TRANSFER_EXECUTION_MODE is 'manual_approval' (see lib/runSplit.js) --
// PriorityPay never originates the transfer itself in that mode, so this
// route exists purely to record that the *user* went and made the
// transfer themselves in their own bank or app.
//
// Allocations have no user_id column of their own -- ownership is enforced
// the same way the "own transfer allocations" RLS policy in schema.sql
// does it, by joining through the parent transfer's user_id.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const allocationId = params.id;

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
    .update({ status: "completed", confirmed_at: new Date().toISOString() })
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
