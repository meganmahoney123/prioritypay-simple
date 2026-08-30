import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Backs the Withdrawals tab's own history list (app/(app)/withdrawals/
// page.js) -- every withdrawal this user has ever recorded, newest first,
// each with its allocations (which category/categories it actually drew
// from -- see simple_withdrawal_allocations) folded in so the tab can show
// "Wedding $500" or "Wedding $400 + Savings $100" in one line without a
// second round-trip per row.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: withdrawals, error } = await admin
    .from("simple_withdrawals")
    .select("*, simple_withdrawal_allocations(label, amount, source_type)")
    .eq("user_id", user.id)
    .order("occurred_at", { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    withdrawals: (withdrawals || []).map((w) => ({
      id: w.id,
      amount: Number(w.amount) || 0,
      description: w.description,
      occurredAt: w.occurred_at,
      categoryLabel: w.category_label,
      receiptUrl: w.receipt_url,
      sourceType: w.source_type || "cash",
      closeoutTransactionId: w.closeout_transaction_id,
      allocations: (w.simple_withdrawal_allocations || []).map((a) => ({
        label: a.label,
        amount: Number(a.amount) || 0,
        sourceType: a.source_type,
      })),
    })),
  });
}

// Records one expense/withdrawal event, confirmed through Close-Out (see
// app/(app)/closeout/page.js) -- the reverse of a deposit split. `allocations`
// is the already-resolved list of { label, amount, sourceType } rows (see
// components/WithdrawalAllocator.js for how the client builds this,
// including any shortfall-cascade rows once a category's real balance --
// see /api/allocations/balances -- can't cover the whole amount). The
// server trusts the client's math here for the same reason
// computeAllocations' server-side caller does elsewhere in this app: the
// user is spending their own already-in-their-account money, not moving
// funds through Dwolla, so there's no external transfer to protect against
// double-submission the way runSplit.js guards deposits. It does still
// enforce that the allocations sum to the withdrawal amount, since that's
// the one invariant the whole cascade UI exists to guarantee.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const amount = Number(body.amount) || 0;
  const allocations = Array.isArray(body.allocations) ? body.allocations : [];

  if (amount <= 0) {
    return Response.json({ error: "Amount must be greater than 0." }, { status: 400 });
  }
  const allocSum = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  if (Math.abs(allocSum - amount) > 0.01) {
    return Response.json({ error: "Allocations must add up to the full withdrawal amount." }, { status: 400 });
  }

  // Matching a withdrawal to a specific bank/card transaction (from the
  // Withdrawals tab -- app/(app)/withdrawals/page.js) is optional: someone
  // can instead mark it a plain cash expense. When a closeoutTransactionId
  // IS given, confirm up front that it's really this user's row before
  // writing anything -- avoids either an orphaned FK or, worse, someone
  // accidentally/maliciously marking another user's transaction confirmed.
  const closeoutTransactionId = body.closeoutTransactionId || null;
  const admin = supabaseAdmin();

  if (closeoutTransactionId) {
    const { data: txnRow } = await admin
      .from("simple_closeout_transactions")
      .select("id")
      .eq("id", closeoutTransactionId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!txnRow) {
      return Response.json({ error: "That transaction couldn't be found." }, { status: 404 });
    }
  }

  const { data: withdrawal, error } = await admin
    .from("simple_withdrawals")
    .insert({
      user_id: user.id,
      amount,
      description: body.description || null,
      occurred_at: body.occurredAt || new Date().toISOString(),
      category_label: body.categoryLabel || null,
      // receipt_url now stores a private Supabase Storage *path* (not a
      // public URL) -- see app/api/withdrawals/receipt/route.js for why the
      // "receipts" bucket is private, and app/api/withdrawals/receipt/[withdrawalId]/route.js
      // for how to turn this path into a short-lived signed URL on demand.
      receipt_url: body.receiptUrl || null,
      mileage_miles: body.mileageMiles === undefined || body.mileageMiles === "" ? null : Number(body.mileageMiles),
      mileage_purpose: body.mileagePurpose || null,
      meal_purpose: body.mealPurpose || null,
      meal_attendees: body.mealAttendees || null,
      source_type: body.sourceType === "card" ? "card" : "cash",
      closeout_transaction_id: closeoutTransactionId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (allocations.length) {
    const rows = allocations.map((a) => ({
      withdrawal_id: withdrawal.id,
      label: a.sourceType === "external" ? a.label || null : a.label,
      amount: Number(a.amount) || 0,
      source_type: a.sourceType === "external" ? "external" : "category",
    }));
    const { error: allocError } = await admin.from("simple_withdrawal_allocations").insert(rows);
    if (allocError) return Response.json({ error: allocError.message }, { status: 500 });
  }

  // Matching this withdrawal to a real card transaction means Close-Out
  // already has the answer for that row -- confirm it the same way the
  // Close-Out page itself would (see setCategory/saveExpense in
  // app/(app)/closeout/page.js), so the person never has to categorize the
  // same expense twice.
  if (closeoutTransactionId) {
    await admin
      .from("simple_closeout_transactions")
      .update({ confirmed_category: "expense" })
      .eq("id", closeoutTransactionId)
      .eq("user_id", user.id);
  }

  return Response.json({ withdrawal });
}
