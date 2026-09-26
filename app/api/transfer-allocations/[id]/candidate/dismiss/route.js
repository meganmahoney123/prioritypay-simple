import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { maybeRecordNearMissCandidate } from "@/lib/reconcileTransfers";
import { runSplit } from "@/lib/runSplit";

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
// A dismissed transaction doesn't just vanish, though: the whole reason
// it was withheld from runSplit in the first place (see
// maybeRecordNearMissCandidate's call sites in app/api/plaid/webhook and
// lib/reconcileTransfers.js's hourly sweep) was "this money might already
// be accounted for." Once the user says it isn't, that reasoning no
// longer holds, so this route picks up exactly where the webhook/sweep
// left off for that one transaction:
//   1. First, check whether a DIFFERENT in-transit row on the same
//      destination account could still explain it (findNearMissCandidate
//      requires there be exactly one eligible row, so excluding the one
//      just dismissed may reveal a different single match). If so,
//      propose that instead -- same "is this your transfer?" prompt,
//      just pointed at a different allocation.
//   2. If no other row could explain it, this transaction really is
//      unaccounted-for new income, so it goes through the exact same
//      split logic a brand-new, never-flagged deposit would have gotten
//      (runSplit, trigger "auto_deposit", plaidTransactionId set for the
//      usual duplicate-delivery idempotency guard) -- closing the gap
//      instead of leaving it silently unsplit forever.
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
    .select(
      "id, status, candidate_transaction_id, candidate_amount, candidate_date, dest_account_id, simple_transfers!inner(user_id)"
    )
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

  // Capture what's being dismissed before it gets cleared below -- this is
  // the only place these values live once the update runs.
  const dismissedTransactionId = allocation.candidate_transaction_id;
  const dismissedAmount = allocation.candidate_amount;
  const dismissedDate = allocation.candidate_date;
  const destAccountId = allocation.dest_account_id;

  const { error: updateError } = await admin
    .from("simple_transfer_allocations")
    .update({
      candidate_dismissed: true,
      candidate_last_dismissed_transaction_id: dismissedTransactionId,
      candidate_transaction_id: null,
      candidate_amount: null,
      candidate_date: null,
    })
    .eq("id", allocationId);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  // Step 1: could a different in-transit row on this same account still
  // explain this transaction? Scoped the same way both existing call
  // sites scope it (per destination account), excluding the row we just
  // dismissed it from -- findNearMissCandidate only ever proposes a match
  // when exactly one row qualifies, so it never guesses between two.
  let reassigned = null;
  if (destAccountId) {
    const { data: otherRows } = await admin
      .from("simple_transfer_allocations")
      .select("id, amount, confirmed_at, candidate_transaction_id, candidate_last_dismissed_transaction_id")
      .eq("dest_account_id", destAccountId)
      .eq("status", "in_transit")
      .neq("id", allocationId);

    reassigned = await maybeRecordNearMissCandidate(admin, {
      transactionId: dismissedTransactionId,
      amount: dismissedAmount,
      date: dismissedDate,
      candidateRows: otherRows || [],
    });
  }

  if (reassigned) {
    return Response.json({ ok: true, reassignedTo: reassigned.id });
  }

  // Step 2: no other row could explain it, so this is unaccounted-for
  // income -- run it through the same split logic a fresh, never-flagged
  // deposit would get, rather than leaving it invisible.
  if (destAccountId && dismissedAmount) {
    const result = await runSplit({
      admin,
      userId: user.id,
      amount: Math.abs(Number(dismissedAmount)),
      sourceAccountId: destAccountId,
      trigger: "auto_deposit",
      plaidTransactionId: dismissedTransactionId,
    });
    if (result.error) {
      console.error("Auto-split failed after candidate dismiss for transaction", dismissedTransactionId, result.error);
    } else {
      return Response.json({ ok: true, splitRun: true });
    }
  }

  return Response.json({ ok: true });
}
