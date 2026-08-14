import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Sibling of the [period] route -- Next.js matches this static "range"
// segment before falling through to the dynamic one, so both can coexist.
//
// Powers the Dashboard's "last 6 months" / "last 12 months" aggregate pie
// chart views: sums every real transfer_allocations row across a trailing
// window of N months (including the current, still-in-progress month), by
// category label. Same real-data source as the single-month [period] route,
// just widened to a rolling window instead of one calendar month.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const months = Math.max(1, Math.min(24, Number(url.searchParams.get("months")) || 6));
  const categoryType = url.searchParams.get("categoryType");

  const now = new Date();
  // End is the start of *next* month, so the current in-progress month is
  // fully included. Start is (months - 1) whole calendar months before the
  // current month's start, so months=6 covers this month plus the 5 before it.
  const endIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  const startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)).toISOString();

  const admin = supabaseAdmin();
  let query = admin
    .from("transfer_allocations")
    .select("label, amount, category_type, transfers!inner(user_id, created_at, status)")
    .eq("transfers.user_id", user.id)
    .neq("status", "failed")
    .gte("transfers.created_at", startIso)
    .lt("transfers.created_at", endIso);
  if (categoryType) query = query.eq("category_type", categoryType);

  const { data: allocRows, error } = await query;
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
