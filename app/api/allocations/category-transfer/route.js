import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Answers the prompt shown on the Accounts page (components/
// AccountCategoryBreakdown.js) when a category has been spent past zero:
// "where did the extra money come from?" Two possible answers --
//   1. Another category in the same account -- `fromLabel` is that
//      category's label. We debit it and credit `toLabel` by the same
//      amount, both logged as simple_manual_contributions rows (negative
//      for the source, positive for the destination) so the money is
//      still accounted for somewhere rather than appearing from nowhere.
//      This is exactly what it sounds like: a category-to-category
//      transfer, not a new deposit.
//   2. "Unallocated" cash sitting in the account -- `fromLabel` is null.
//      Per spec this is a no-op: the extra money came from cash in the
//      account that was never claimed by any category, so no category's
//      balance needs to move. We still record nothing (there's no ledger
//      row for "unallocated"), and the destination category keeps
//      whatever its real balance is -- the Accounts page pie already
//      clamps a negative category balance to $0/0% for display.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const toLabel = (body.toLabel || "").trim();
  const fromLabel = body.fromLabel ? String(body.fromLabel).trim() : null;
  const amount = Number(body.amount) || 0;

  if (!toLabel) return Response.json({ error: "Missing destination category." }, { status: 400 });
  if (amount <= 0) return Response.json({ error: "Amount must be greater than $0." }, { status: 400 });

  // Unallocated cash covering the overdraft -- nothing to move.
  if (!fromLabel) return Response.json({ ok: true, source: "unallocated" });

  if (fromLabel === toLabel) {
    return Response.json({ error: "Source and destination categories must be different." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: ruleRows } = await admin
    .from("simple_split_rules_percent")
    .select("label")
    .eq("user_id", user.id)
    .in("label", [fromLabel, toLabel]);
  const found = new Set((ruleRows || []).map((r) => r.label));
  if (!found.has(fromLabel) || !found.has(toLabel)) {
    return Response.json({ error: "One of those categories no longer exists." }, { status: 404 });
  }

  const note = body.note || `Transferred from ${fromLabel}`;
  const occurredAt = body.occurredAt || new Date().toISOString();

  const { error } = await admin.from("simple_manual_contributions").insert([
    { user_id: user.id, label: fromLabel, amount: -amount, note, occurred_at: occurredAt },
    { user_id: user.id, label: toLabel, amount, note: body.note || `Transferred from ${fromLabel}`, occurred_at: occurredAt },
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, source: "category" });
}
