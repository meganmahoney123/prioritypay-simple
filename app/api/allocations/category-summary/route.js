import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the redesigned "How your money has been distributed" section on
// the Dashboard (components/CategoryDistributionSection.js): one call that
// returns everything needed for the month's pie (including the
// "Unallocated" slice -- the part of each deposit no percentage category
// claimed) AND the per-category detail cards underneath it (this month's
// contribution, the category's running balance, its most recent
// withdrawal if any, and its goal cap if the user set one).
//
// "Balance" here means the category's own running total, NOT any
// connected account's balance -- starting_balance (whatever the person
// declared they already had saved before joining PriorityPay) plus every
// dollar ever split into that category, minus every dollar ever withdrawn
// FROM that category via Close Out. Two categories can share one physical
// account (a savings account holding both an Emergency Fund and a Wedding
// Fund) and still track separately here, same math as
// /api/allocations/account-balances just grouped by label instead of by
// account_id.
function periodBounds(period) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
function monthKey(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
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
    { data: periodAllocRows },
    { data: allTimeAllocRows },
    { data: allTimeWithdrawalRows },
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
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, category_type, simple_transfers!inner(user_id, created_at, status)")
      .eq("simple_transfers.user_id", user.id)
      .eq("category_type", "percent")
      .neq("status", "failed")
      .neq("status", "needs_approval")
      .gte("simple_transfers.created_at", startIso)
      .lt("simple_transfers.created_at", endIso),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, status)")
      .eq("simple_transfers.user_id", user.id)
      .neq("status", "failed")
      .neq("status", "needs_approval"),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
    // Separate from the all-time sum above -- this one keeps each row
    // individually (with its date) instead of summing, and is ordered
    // newest-first, so the reduce below can grab just the single most
    // recent withdrawal per category label.
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id, occurred_at)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category")
      .order("occurred_at", { ascending: false, referencedTable: "simple_withdrawals" }),
    admin.from("simple_profiles").select("created_at").eq("id", user.id).single(),
  ]);

  const totalDeposited = (periodTransfers || []).reduce((s, t) => s + (Number(t.source_amount) || 0), 0);

  const monthlyByLabel = {};
  let totalAllocated = 0;
  (periodAllocRows || []).forEach((r) => {
    const amt = Number(r.amount) || 0;
    monthlyByLabel[r.label] = (monthlyByLabel[r.label] || 0) + amt;
    totalAllocated += amt;
  });

  const balanceByLabel = {};
  (rules || []).forEach((r) => {
    balanceByLabel[r.label] = (balanceByLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
  });
  (allTimeAllocRows || []).forEach((r) => {
    if (!(r.label in balanceByLabel)) balanceByLabel[r.label] = 0;
    balanceByLabel[r.label] += Number(r.amount) || 0;
  });
  (allTimeWithdrawalRows || []).forEach((r) => {
    if (!r.label || !(r.label in balanceByLabel)) return;
    balanceByLabel[r.label] -= Number(r.amount) || 0;
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

  const categories = (rules || []).map((r) => ({
    label: r.label,
    group: r.group_name,
    color: r.color,
    monthlyContribution: monthlyByLabel[r.label] || 0,
    balance: balanceByLabel[r.label] || 0,
    cap: r.balance_cap === null || r.balance_cap === undefined ? null : Number(r.balance_cap),
    lastWithdrawal: lastWithdrawalByLabel[r.label] || null,
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
