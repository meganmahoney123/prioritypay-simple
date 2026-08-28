import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

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

  const admin = supabaseAdmin();
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

  return Response.json({ withdrawal });
}
