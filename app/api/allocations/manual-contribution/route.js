import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// One-time, out-of-band top-up to a single category's balance -- e.g.
// someone has extra cash on hand and wants to throw an extra $200 at their
// Wedding fund without waiting for it to come out of a real paycheck
// split. Deliberately NOT modeled as a fake simple_transfers/
// simple_transfer_allocations row (those represent a real Dwolla-moved
// deposit split -- see lib/runSplit.js) -- this is its own small table,
// simple_manual_contributions, so "money PriorityPay actually split out of
// a deposit" and "money a person told us to credit to a category by hand"
// stay distinguishable in the data, even though
// GET /api/allocations/category-summary blends both into one balance/
// history for display.
//
// This only ever increases a category's balance. Recording money coming
// OUT of a category (a real withdrawal/expense) goes through the existing
// POST /api/withdrawals instead -- see the Dashboard's "Record a
// withdrawal" link on each category card.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const label = (body.label || "").trim();
  const amount = Number(body.amount) || 0;

  if (!label) return Response.json({ error: "Missing category label." }, { status: 400 });
  if (amount <= 0) return Response.json({ error: "Amount must be greater than $0." }, { status: 400 });

  const admin = supabaseAdmin();

  // Only allow contributing to a category the user actually has -- avoids
  // a stray typo'd label silently creating an orphaned balance that never
  // shows up on any card.
  const { data: rule } = await admin
    .from("simple_split_rules_percent")
    .select("id")
    .eq("user_id", user.id)
    .eq("label", label)
    .maybeSingle();
  if (!rule) return Response.json({ error: "No category with that label." }, { status: 404 });

  const { error } = await admin.from("simple_manual_contributions").insert({
    user_id: user.id,
    label,
    amount,
    note: body.note || null,
    occurred_at: body.occurredAt || new Date().toISOString(),
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
