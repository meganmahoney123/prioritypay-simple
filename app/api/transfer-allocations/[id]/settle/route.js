import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Manual override for an 'in_transit' allocation -- lets someone say "this
// already landed" themselves instead of waiting on
// lib/reconcileTransfers.js to find a matching Plaid transaction. Exists
// because reconciliation can miss a match (a fee shaved a few cents off,
// the bank posted it a day later than expected, etc.) -- this is the
// escape hatch so a real, already-landed transfer never gets stuck showing
// "in transition" forever. Same ownership/shape as confirm and skip.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { id: allocationId } = await params;

  const { data: allocation, error: fetchError } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, simple_transfers!inner(user_id)")
    .eq("id", allocationId)
    .eq("simple_transfers.user_id", user.id)
    .single();

  if (fetchError || !allocation) {
    return Response.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (allocation.status !== "in_transit") {
    return Response.json({ error: "This transfer isn't in transition." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({ status: "completed", settled_at: new Date().toISOString() })
    .eq("id", allocationId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({ ok: true });
}
