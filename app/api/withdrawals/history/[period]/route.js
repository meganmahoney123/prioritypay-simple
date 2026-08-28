import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Sibling of app/api/allocations/history/[period]/route.js, for spending
// instead of deposits -- powers the Dashboard's "where did this money go"
// pie chart (components/SpendDistributionChart.js). Sums real
// simple_withdrawal_allocations rows for the selected month, grouped by
// label, source_type='category' only -- an 'external' withdrawal (cash,
// or the "from outside savings" shortfall-cascade choice) never came out
// of a tracked category, so it has nothing to attribute to a slice here.
function periodBounds(period) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { period } = await params;
  const admin = supabaseAdmin();
  const { startIso, endIso } = periodBounds(period);

  const [{ data: allocRows }, { data: profile }] = await Promise.all([
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id, occurred_at)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category")
      .gte("simple_withdrawals.occurred_at", startIso)
      .lt("simple_withdrawals.occurred_at", endIso),
    admin.from("simple_profiles").select("created_at").eq("id", user.id).single(),
  ]);

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

  const earliestPeriod = profile?.created_at ? monthKey(new Date(profile.created_at)) : period;

  return Response.json({ period, earliestPeriod, total, categories });
}
