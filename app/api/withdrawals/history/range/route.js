import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Sibling of app/api/allocations/history/range/route.js, for spending --
// see the comment on the [period] route in this same directory for why
// only source_type='category' rows are summed here.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const months = Math.max(1, Math.min(24, Number(url.searchParams.get("months")) || 6));

  const now = new Date();
  const endIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)).toISOString();

  const admin = supabaseAdmin();
  const { data: allocRows, error } = await admin
    .from("simple_withdrawal_allocations")
    .select("label, amount, source_type, simple_withdrawals!inner(user_id, occurred_at)")
    .eq("simple_withdrawals.user_id", user.id)
    .eq("source_type", "category")
    .gte("simple_withdrawals.occurred_at", startIso)
    .lt("simple_withdrawals.occurred_at", endIso);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const byLabel = {};
  let total = 0;
  (allocRows || []).forEach((r) => {
    const amt = Number(r.amount) || 0;
    byLabel[r.label] = (byLabel[r.label] || 0) + amt;
    total += amt;
  });

  const categories = Object.entries(byLabel)
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  return Response.json({ months, startIso, endIso, total, categories });
}
