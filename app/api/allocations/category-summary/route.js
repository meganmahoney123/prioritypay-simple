import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the redesigned "How your money has been distributed" section on
// the Dashboard (components/CategoryDistributionSection.js): one call that
// returns everything needed for the month's pie (including the
// "Unallocated" slice -- the part of each deposit no percentage category
// claimed) AND the per-category detail cards underneath it (this month's
// contribution, the category's running balance, its most recent
// withdrawal if any, its goal cap if the user set one, and a trailing
// 6-month balance history for the "progress over time" mini chart).
//
// "Balance" here means the category's own running total, NOT any
// connected account's balance -- starting_balance (whatever the person
// declared they already had saved before joining PriorityPay) plus every
// dollar ever split into that category via a real deposit, plus every
// manual one-time contribution logged against it (see
// simple_manual_contributions / POST /api/allocations/manual-contribution),
// minus every dollar ever withdrawn FROM that category via Close Out or
// the Dashboard's quick-withdrawal link. Two categories can share one
// physical account (a savings account holding both an Emergency Fund and
// a Wedding Fund) and still track separately here, same math as
// /api/allocations/account-balances just grouped by label instead of by
// account_id.
const HISTORY_MONTHS = 6;

function periodBounds(period) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function shiftMonthKey(period, delta) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return monthKey(d);
}

export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || monthKey(new Date());
  const { startIso, endIso } = periodBounds(period);

  const [
    { data: rules },
    { data: periodTransfers },
    { data: allTimeAllocRows },
    { data: allTimeWithdrawalRows },
    { data: allTimeManualRows },
    { data: withdrawalHistory },
    { data: profile },
  ] = await Promise.all([
    admin
      .from("simple_split_rules_percent")
      .select("label, group_name, pct, balance_cap, color, starting_balance")
      .eq("user_id", user.id),
    // Every real deposit this month (regardless of whether it's finished
    // splitting yet) -- source_amount is the whole deposit, before any
    // percentage is carved off. This is what "Unallocated" is measured
    // against: source_amount minus whatever actually landed in a category.
    admin
      .from("simple_transfers")
      .select("source_amount, status")
      .eq("user_id", user.id)
      .neq("status", "failed")
      .neq("status", "needs_approval")
    .neq("status", "skipped")
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    // ALL-TIME, with dates -- powers both the running balance AND the
    // trailing 6-month history (bucketed client-side below), so this one
    // dated fetch replaces what used to be two separate queries (an
    // undated all-time sum plus a separate this-month-only sum).
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, category_type, simple_transfers!inner(user_id, created_at, status)")
      .eq("simple_transfers.user_id", user.id)
      .eq("category_type", "percent")
      .neq("status", "failed")
      .neq("status", "needs_approval")
    .neq("status", "skipped"),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id, occurred_at)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
    // One-time manual top-ups a person logs directly against a category
    // from the Dashboard (see POST /api/allocations/manual-contribution)
    // -- separate from real split-triggered transfer_allocations, but
    // counts the same toward balance/monthly-contribution/history.
    admin
      .from("simple_manual_contributions")
      .select("label, amount, occurred_at")
      .eq("user_id", user.id),
    // Separate from the all-time rows above -- ordered newest-first so the
    // reduce below can grab just the single most recent withdrawal per
    // category label for the "Last withdrawal" line.
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id, occurred_at)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category")
      .order("occurred_at", { ascending: false, referencedTable: "simple_withdrawals" }),
    admin.from("simple_profiles").select("created_at").eq("id", user.id).single(),
  ]);

  const totalDeposited = (periodTransfers || []).reduce((s, t) => s + (Number(t.source_amount) || 0), 0);

  // Every dated event, normalized to one shape (label, amount signed +/-,
  // occurred at an ISO date) so balance-as-of-any-date and monthly
  // bucketing below can treat contributions, manual top-ups, and
  // withdrawals identically instead of three separate code paths.
  const events = [];
  (allTimeAllocRows || []).forEach((r) => {
    events.push({ label: r.label, amount: Number(r.amount) || 0, at: r.simple_transfers?.created_at });
  });
  (allTimeManualRows || []).forEach((r) => {
    events.push({ label: r.label, amount: Number(r.amount) || 0, at: r.occurred_at });
  });
  (allTimeWithdrawalRows || []).forEach((r) => {
    if (!r.label) return;
    events.push({ label: r.label, amount: -(Number(r.amount) || 0), at: r.simple_withdrawals?.occurred_at });
  });

  const startingByLabel = {};
  (rules || []).forEach((r) => {
    startingByLabel[r.label] = Number(r.starting_balance) || 0;
  });

  const balanceByLabel = { ...startingByLabel };
  events.forEach((e) => {
    if (!(e.label in balanceByLabel)) balanceByLabel[e.label] = 0;
    balanceByLabel[e.label] += e.amount;
  });

  // "This month's contribution" -- and everything the pie/legend above is
  // built from -- deliberately only counts CONTRIBUTION events (real
  // deposit splits + manual top-ups), never withdrawals and never
  // starting_balance. The pie's job is "where did this month's deposits
  // go," full stop -- a withdrawal happening in the same month isn't a
  // deposit going anywhere, and starting_balance isn't this month's money
  // at all, so neither belongs in monthlyByLabel/totalAllocated even
  // though both DO belong in the running balance above.
  const monthlyByLabel = {};
  let totalAllocated = 0;
  events.forEach((e) => {
    if (e.amount <= 0) return;
    if (!e.at || e.at < startIso || e.at >= endIso) return;
    monthlyByLabel[e.label] = (monthlyByLabel[e.label] || 0) + e.amount;
    totalAllocated += e.amount;
  });

  // First row per label wins, since withdrawalHistory is already sorted
  // newest-first.
  const lastWithdrawalByLabel = {};
  (withdrawalHistory || []).forEach((r) => {
    if (!r.label || lastWithdrawalByLabel[r.label]) return;
    lastWithdrawalByLabel[r.label] = {
      amount: Number(r.amount) || 0,
      occurredAt: r.simple_withdrawals?.occurred_at || null,
    };
  });

  // Trailing HISTORY_MONTHS balance-at-end-of-month per label, oldest
  // first -- e.g. [{period:"2026-03", balance:1200}, ..., {period:
  // "2026-08", balance:1450}]. Computed by replaying `events` up through
  // each month's boundary on top of that label's starting_balance, same
  // running-total idea as balanceByLabel above just snapshotted at more
  // points in time.
  const historyPeriods = [];
  for (let i = HISTORY_MONTHS - 1; i >= 0; i--) historyPeriods.push(shiftMonthKey(period, -i));

  const historyByLabel = {};
  Object.keys(startingByLabel).forEach((label) => {
    historyByLabel[label] = historyPeriods.map((p) => {
      const { endIso: boundary } = periodBounds(p);
      const balance = events.reduce((sum, e) => {
        if (e.label !== label) return sum;
        if (!e.at || e.at >= boundary) return sum;
        return sum + e.amount;
      }, startingByLabel[label]);
      return { period: p, balance };
    });
  });

  const categories = (rules || []).map((r) => ({
    label: r.label,
    group: r.group_name,
    pct: Number(r.pct) || 0,
    color: r.color,
    monthlyContribution: monthlyByLabel[r.label] || 0,
    balance: balanceByLabel[r.label] || 0,
    cap: r.balance_cap === null || r.balance_cap === undefined ? null : Number(r.balance_cap),
    lastWithdrawal: lastWithdrawalByLabel[r.label] || null,
    history: historyByLabel[r.label] || [],
  }));

  const earliestPeriod = profile?.created_at ? monthKey(new Date(profile.created_at)) : period;

  return Response.json({
    period,
    earliestPeriod,
    totalDeposited,
    totalAllocated,
    unallocated: Math.max(0, totalDeposited - totalAllocated),
    categories,
  });
}
