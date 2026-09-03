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
//
// Also powers the new Account Balances dashboard's year-to-date and
// all-time numbers via two extra (optional, additive) query params:
//   ?since=<ISO date>  -- explicit lower bound instead of a trailing
//                         N-month window, e.g. Jan 1 of this year for YTD.
//   ?all=true          -- no lower bound at all, i.e. every allocation
//                         ever recorded ("Total Saved since joining").
// `months` stays the default behavior for existing trailing-window callers.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const months = Math.max(1, Math.min(24, Number(url.searchParams.get("months")) || 6));
  const categoryType = url.searchParams.get("categoryType");
  const since = url.searchParams.get("since");
  const all = url.searchParams.get("all") === "true";

  const now = new Date();
  // End is the start of *next* month, so the current in-progress month is
  // fully included. Start is (months - 1) whole calendar months before the
  // current month's start, so months=6 covers this month plus the 5 before it
  // -- unless `since`/`all` override it (see comment above).
  const endIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
  let startIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)).toISOString();
  if (all) {
    startIso = new Date(0).toISOString();
  } else if (since) {
    const parsed = new Date(since);
    if (!Number.isNaN(parsed.getTime())) startIso = parsed.toISOString();
  }

  const admin = supabaseAdmin();
  let query = admin
    .from("simple_transfer_allocations")
    .select("label, amount, category_type, simple_transfers!inner(user_id, created_at, status)")
    .eq("simple_transfers.user_id", user.id)
    .neq("status", "failed")
    // Also exclude 'needs_approval' -- a manual-approval-mode allocation
    // the user hasn't actually confirmed sending yet (see
    // TRANSFER_EXECUTION_MODE in lib/runSplit.js). AccountBalances
    // literally captions this total "every dollar PriorityPay has
    // automatically routed... ever" -- a calculated-but-unconfirmed
    // transfer hasn't happened yet and shouldn't count until the user
    // checks it off (see app/api/transfer-allocations/[id]/confirm).
    .neq("status", "needs_approval")
    .neq("status", "skipped")
    .gte("simple_transfers.created_at", startIso)
    .lt("simple_transfers.created_at", endIso);
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
