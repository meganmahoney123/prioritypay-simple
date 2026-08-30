import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Answers the prompt shown on the Accounts page (components/
// AccountCategoryBreakdown.js) when a category has been spent past zero:
// "where did the extra money come from?" Two possible answers --
//   1. Another category -- anywhere in the person's accounts, not just
//      the one the overdrawn category happens to live in (money can move
//      between accounts; the category the extra came from doesn't have
//      to share a bank account with the one that's overdrawn). `fromLabel`
//      is that category's label. We debit it and credit `toLabel` by the
//      same amount, both logged as simple_manual_contributions rows
//      (negative for the source, positive for the destination) so the
//      money is still accounted for somewhere rather than appearing from
//      nowhere. This is exactly what it sounds like: a category-to-
//      category transfer, not a new deposit.
//   2. "Unallocated" cash sitting in the SAME account as the overdrawn
//      category -- `fromLabel` is null. This is NOT a no-op: that cash
//      was real, uncommitted money sitting in the account, and once it's
//      designated as covering this category, it's no longer uncommitted
//      -- so it needs to actually move from Unallocated to the category,
//      the same way it would if a person consciously decided "I'll use
//      that leftover cash for this." We record it as a single positive
//      simple_manual_contributions row crediting `toLabel`; nothing is
//      debited (there's no ledger row for "unallocated" to debit from --
//      it's derived on the fly in account-balances as accountBalance minus
//      whatever's categorized, so crediting the category is sufficient to
//      make Unallocated shrink by the same amount on the next fetch).
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const toLabel = (body.toLabel || "").trim();
  const fromLabel = body.fromLabel ? String(body.fromLabel).trim() : null;
  const amount = Number(body.amount) || 0;

  if (!toLabel) return Response.json({ error: "Missing destination category." }, { status: 400 });
  if (amount <= 0) return Response.json({ error: "Amount must be greater than $0." }, { status: 400 });

  const admin = supabaseAdmin();

  if (fromLabel && fromLabel === toLabel) {
    return Response.json({ error: "Source and destination categories must be different." }, { status: 400 });
  }

  const labelsToCheck = fromLabel ? [fromLabel, toLabel] : [toLabel];
  const { data: ruleRows } = await admin
    .from("simple_split_rules_percent")
    .select("label")
    .eq("user_id", user.id)
    .in("label", labelsToCheck);
  const found = new Set((ruleRows || []).map((r) => r.label));
  if (!found.has(toLabel) || (fromLabel && !found.has(fromLabel))) {
    return Response.json({ error: "One of those categories no longer exists." }, { status: 404 });
  }

  const occurredAt = body.occurredAt || new Date().toISOString();

  if (!fromLabel) {
    const { error } = await admin.from("simple_manual_contributions").insert({
      user_id: user.id,
      label: toLabel,
      amount,
      note: body.note || "Covered by unallocated cash in the account",
      occurred_at: occurredAt,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, source: "unallocated" });
  }

  const note = body.note || `Transferred from ${fromLabel}`;
  const { error } = await admin.from("simple_manual_contributions").insert([
    { user_id: user.id, label: fromLabel, amount: -amount, note, occurred_at: occurredAt },
    { user_id: user.id, label: toLabel, amount, note, occurred_at: occurredAt },
  ]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, source: "category" });
}
