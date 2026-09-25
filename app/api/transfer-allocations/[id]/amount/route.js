import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Lets a user override the dollar amount of a single still-pending
// allocation line -- e.g. the split rule calculated $200 for Wedding Fund
// from this deposit, but they actually want to send $250 this one time.
// Only allowed while status is still 'needs_approval' (same rule confirm/
// skip already enforce -- once a transfer is in_transit/settled/skipped,
// it already happened or was dismissed, so its amount is locked).
//
// This updates `amount` only -- `calculated_amount` (set once at insert
// time in lib/runSplit.js) is left untouched, so the original split-rule
// math is never lost even after an override. See
// supabase/migrations/20260925_calculated_amount.sql for why both columns
// exist.
//
// Same ownership/shape as confirm/skip/settle: allocations have no
// user_id column of their own, so ownership is enforced by joining
// through the parent transfer's user_id.
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  // Dynamic route params are a Promise as of Next.js 15 -- must be awaited.
  const { id: allocationId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "Enter an amount greater than $0." }, { status: 400 });
  }

  const { data: allocation, error: fetchError } = await admin
    .from("simple_transfer_allocations")
    .select("id, status, simple_transfers!inner(user_id)")
    .eq("id", allocationId)
    .eq("simple_transfers.user_id", user.id)
    .single();

  if (fetchError || !allocation) {
    return Response.json({ error: "Transfer not found." }, { status: 404 });
  }
  if (allocation.status !== "needs_approval") {
    return Response.json({ error: "This transfer isn't awaiting confirmation, so its amount can't be edited." }, { status: 409 });
  }

  const { data: updated, error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({ amount })
    .eq("id", allocationId)
    .select()
    .single();
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({ allocation: updated });
}
