import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Dismisses a single manual-approval allocation line from the pending
// checklist WITHOUT sending money and WITHOUT touching the underlying
// split-rule category (see lib/allocations.js / app/(app)/splits/page.js --
// that's the only place a category itself can be deleted). This exists for
// the "I don't want this specific split from this specific deposit" case --
// mirrors confirm/route.js almost exactly, just lands on 'skipped' instead
// of 'completed' and never sets confirmed_at (nothing was actually sent).
//
// 'skipped' is excluded from every totals query the same way 'needs_approval'
// already is -- see app/api/allocations/history/[period]/route.js,
// app/api/allocations/history/range/route.js, and
// app/api/allocations/account-balances/route.js.
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
    .update({ status: "skipped" })
    .eq("id", allocationId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  // Same "was this the last line still waiting?" check as confirm/route.js --
  // a transfer whose remaining lines are a mix of completed/skipped (or all
  // skipped) is just as done as one that's fully completed.
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
