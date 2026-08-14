import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// "YYYY-MM" -> UTC month bounds, same convention as the close-out routes.
function periodBounds(period) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Powers the Dashboard's "how did my money actually get split" pie chart --
// unlike the "Preview a split" card (which simulates today's split rules
// against a hypothetical deposit amount), this sums up every real
// transfer_allocations row for the selected month, grouped by whatever that
// category was labeled at the time it ran. That means a category renamed or
// removed since still shows up correctly for past months -- this is a
// historical record, not a live view of current split rules.
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const period = params.period;
  const admin = supabaseAdmin();
  // Optional -- Fixed and Percent categories can share the same label text
  // (both have a "Tax Reserve" row, for instance), so anything that needs a
  // month-to-date total scoped to just one side (e.g. the Percentage Splits
  // bucket simulator tracking real progress toward a Monthly Cap, which is
  // computed server-side in lib/runSplit.js off category_type = 'percent'
  // only) must filter here too, or the two would get summed together and
  // inflate the total.
  const categoryType = new URL(request.url).searchParams.get("categoryType");

  const { startIso, endIso } = periodBounds(period);

  let query = admin
    .from("transfer_allocations")
    .select("label, amount, category_type, transfers!inner(user_id, created_at, status)")
    .eq("transfers.user_id", user.id)
    .neq("status", "failed")
    .gte("transfers.created_at", startIso)
    .lt("transfers.created_at", endIso);
  if (categoryType) query = query.eq("category_type", categoryType);

  const [{ data: allocRows }, { data: profile }] = await Promise.all([
    query,
    admin.from("profiles").select("created_at").eq("id", user.id).single(),
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
