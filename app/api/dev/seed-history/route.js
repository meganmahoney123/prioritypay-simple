import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { computeAllocations } from "@/lib/allocations";

// DEV/DEMO ONLY. Backfills realistic-looking past deposit history so the
// Dashboard's money-distribution chart (and the YTD/all-time numbers in
// AccountBalances) have something real to show instead of "$0, no
// transfers found" -- both for the current month and for a prior month
// reachable via the chart's back arrow. Reuses the exact same
// computeAllocations math the real split engine runs (lib/runSplit.js),
// against the user's ACTUAL current split-rule percentages, so these mock
// numbers stay internally consistent with whatever percentages are set at
// the time this is run rather than a hardcoded snapshot that could drift.
//
// Idempotent: every row this endpoint creates is tagged trigger =
// 'demo_seed', and a rerun deletes only its own previously-seeded rows
// (and their allocations, via the FK) before inserting fresh ones -- never
// touches a real transfer.
//
// Also backdates simple_profiles.created_at to the first mock deposit's
// month, purely so the chart's "earliest period" gate (which normally
// stops someone from paging back before they actually joined) doesn't
// hide the seeded prior month. Real user signup dates are never touched by
// anything except actual signup.
const DEPOSITS = [
  // July -- a full prior month.
  { isoDate: "2026-07-03T15:00:00Z", amount: 4800 },
  { isoDate: "2026-07-15T15:00:00Z", amount: 3200 },
  { isoDate: "2026-07-28T15:00:00Z", amount: 2900 },
  // August -- current month, partial (matches "today" being mid-month).
  { isoDate: "2026-08-05T15:00:00Z", amount: 3600 },
  { isoDate: "2026-08-14T15:00:00Z", amount: 2750 },
];

export async function POST() {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();

  const { data: percentRows } = await admin
    .from("simple_split_rules_percent")
    .select("*")
    .eq("user_id", user.id);

  const splitRules = {
    fixed: [],
    percent: (percentRows || []).map((r) => ({
      id: r.id,
      pct: r.pct,
      max: r.cap,
      label: r.label,
      retirementType: r.retirement_type || null,
      investmentType: r.investment_type || null,
    })),
  };

  // Clean up any previous run's seeded rows first (allocations cascade via
  // FK on transfer_id).
  const { data: oldTransfers } = await admin
    .from("simple_transfers")
    .select("id")
    .eq("user_id", user.id)
    .eq("trigger", "demo_seed");
  const oldIds = (oldTransfers || []).map((t) => t.id);
  if (oldIds.length) {
    await admin.from("simple_transfer_allocations").delete().in("transfer_id", oldIds);
    await admin.from("simple_transfers").delete().in("id", oldIds);
  }

  const created = [];
  for (const dep of DEPOSITS) {
    const { data: transfer, error: transferError } = await admin
      .from("simple_transfers")
      .insert({
        user_id: user.id,
        source_amount: dep.amount,
        status: "processing",
        trigger: "demo_seed",
        created_at: dep.isoDate,
      })
      .select("id")
      .single();
    if (transferError) {
      return Response.json({ error: transferError.message }, { status: 500 });
    }

    const { allocated } = computeAllocations(splitRules, dep.amount);
    const rows = splitRules.percent
      .filter((r) => (allocated[r.id] || 0) > 0)
      .map((r) => ({
        transfer_id: transfer.id,
        category_type: "percent",
        label: r.label,
        amount: allocated[r.id],
        reserved_only: false,
        dwolla_transfer_id: null,
        status: "processing",
        retirement_type: r.retirementType || null,
        investment_type: r.investmentType || null,
      }));
    if (rows.length) {
      await admin.from("simple_transfer_allocations").insert(rows);
    }
    created.push({ id: transfer.id, date: dep.isoDate, amount: dep.amount, categories: rows.length });
  }

  const earliestDate = DEPOSITS.map((d) => d.isoDate).sort()[0];
  await admin.from("simple_profiles").update({ created_at: earliestDate }).eq("id", user.id);

  return Response.json({ created });
}
