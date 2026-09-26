import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Opposite of .../candidate/confirm/route.js -- the user says a near-miss
// candidate transaction ISN'T their transfer. Leaves status as
// 'in_transit' (still open, still waiting on a real match), but clears
// candidate_transaction_id/candidate_amount/candidate_date so
// lib/reconcileTransfers.js's findNearMissCandidate doesn't treat this row
// as "already has a live candidate" forever -- a different, genuinely
// unrelated future transaction can still become a new candidate for it.
// candidate_last_dismissed_transaction_id remembers specifically WHICH
// transaction just got dismissed, so that exact same transaction (which
// is often still sitting there, still unmatched, on the very next
// reconciliation pass) isn't immediately re-proposed -- only a different
// transaction_id can become the next candidate.
//
// Same ownership shape as every other allocation route.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  // Dynamic route params are a Promise as of Next.js 15 -- must be awaited.
  const { id: allocationId } = await params;

  const { data: allocation, error: fetchError } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, candidate_transaction_id, simple_transfers!inner(user_id)")
    .eq("id", allocationId)
    .eq("simple_transfers.user_id", user.id)
    .single();

  if (fetchError || !allocation) {
    return Response.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (allocation.status !== "in_transit") {
    return Response.json({ error: "This transfer isn't in transition." }, { status: 400 });
  }
  if (!allocation.candidate_transaction_id) {
    return Response.json({ error: "There's no pending match to dismiss." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({
      candidate_dismissed: true,
      candidate_last_dismissed_transaction_id: allocation.candidate_transaction_id,
      candidate_transaction_id: null,
      candidate_amount: null,
      candidate_date: null,
    })
    .eq("id", allocationId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({ ok: true });
}
