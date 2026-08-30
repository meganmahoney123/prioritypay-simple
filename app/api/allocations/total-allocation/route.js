import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Live, whole-picture view of every dollar PriorityPay is tracking for this
// person right now -- unlike /api/allocations/category-summary (one
// month's deposits) or /api/allocations/account-balances (per bank
// account), this sums EVERYTHING at once, across every connected account,
// including real retirement accounts.
//
// The tricky part this route exists to solve: a Retirement category's
// tracked ledger balance (starting_balance + contributions - withdrawals,
// same math as /api/allocations/balances) only represents money still
// sitting in the person's SAVINGS-side holding account, waiting to
// actually be moved into the real 401k/IRA. The real invested balance
// lives in a separate, real Plaid-connected account (simple_
// retirement_accounts.account_id -> simple_accounts.current_balance).
// Both are real money that belongs to that category -- so for any category
// with a retirement_type, this route reports ledger + real invested as one
// combined total, per explicit product decision.
//
// Categories currently spent past zero (negative combined balance) are
// pulled out into `overdrawn` instead of appearing as a pie slice --
// a negative number can't be a slice of a pie.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: rules }, { data: allocRows }, { data: manualRows }, { data: withdrawalRows }, { data: accountRows }, { data: retirementRows }] =
    await Promise.all([
      admin
        .from("simple_split_rules_percent")
        .select("label, account_id, starting_balance, retirement_type, color, group_name")
        .eq("user_id", user.id),
      admin
        .from("simple_transfer_allocations")
        .select("label, amount, simple_transfers!inner(user_id, status)")
        .eq("simple_transfers.user_id", user.id)
        .neq("status", "failed")
        .neq("status", "needs_approval"),
      admin.from("simple_manual_contributions").select("label, amount").eq("user_id", user.id),
      admin
        .from("simple_withdrawal_allocations")
        .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
        .eq("simple_withdrawals.user_id", user.id)
        .eq("source_type", "category"),
      admin
        .from("simple_accounts")
        .select("id, institution_name, account_name, mask, current_balance, account_type")
        .eq("user_id", user.id),
      admin.from("simple_retirement_accounts").select("retirement_type, account_id").eq("user_id", user.id),
    ]);

  const accountBalanceById = {};
  (accountRows || []).forEach((a) => {
    accountBalanceById[a.id] = Number(a.current_balance) || 0;
  });

  // Ledger balance per category label -- money already tracked/split into
  // this category, whether or not it's physically moved to a "real" real
  // retirement/investment account yet.
  const ledgerByLabel = {};
  (rules || []).forEach((r) => {
    ledgerByLabel[r.label] = (ledgerByLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
  });
  (allocRows || []).forEach((r) => {
    ledgerByLabel[r.label] = (ledgerByLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (manualRows || []).forEach((r) => {
    ledgerByLabel[r.label] = (ledgerByLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label) return;
    ledgerByLabel[r.label] = (ledgerByLabel[r.label] || 0) - (Number(r.amount) || 0);
  });

  // Real, already-invested balance per retirement_type, from the actual
  // linked 401k/IRA account (never the same account as the category's own
  // savings-side account_id above).
  const realBalanceByRetirementType = {};
  const realAccountIds = new Set();
  (retirementRows || []).forEach((r) => {
    realBalanceByRetirementType[r.retirement_type] = accountBalanceById[r.account_id] || 0;
    realAccountIds.add(r.account_id);
  });

  const overdrawn = [];
  const slices = [];
  (rules || []).forEach((r) => {
    const real = r.retirement_type ? realBalanceByRetirementType[r.retirement_type] || 0 : 0;
    const combined = (ledgerByLabel[r.label] || 0) + real;
    if (combined < -0.005) {
      overdrawn.push({ label: r.label, amount: Math.round(combined * 100) / 100, color: r.color || null });
    } else if (combined > 0.005) {
      slices.push({ label: r.label, amount: Math.round(combined * 100) / 100, color: r.color || null });
    }
  });

  // Whatever's sitting in a connected account but not yet claimed by any
  // category -- same categorized-vs-real-balance math as /api/allocations/
  // account-balances, just summed across every account at once instead of
  // shown per account. Real retirement accounts are skipped here entirely
  // (never treated as "unallocated cash") since their whole balance is
  // already folded into the matching category's slice above.
  const categorizedByAccount = {};
  (rules || []).forEach((r) => {
    if (!r.account_id) return;
    const amt = Math.max(0, ledgerByLabel[r.label] || 0);
    categorizedByAccount[r.account_id] = (categorizedByAccount[r.account_id] || 0) + amt;
  });

  let unallocated = 0;
  (accountRows || []).forEach((a) => {
    if (realAccountIds.has(a.id)) return;
    if (a.account_type === "credit" || a.account_type === "business") return;
    const balance = Number(a.current_balance) || 0;
    const categorized = categorizedByAccount[a.id] || 0;
    unallocated += Math.max(0, balance - categorized);
  });
  unallocated = Math.round(unallocated * 100) / 100;

  const total = Math.round((slices.reduce((s, c) => s + c.amount, 0) + unallocated) * 100) / 100;

  return Response.json({ slices, unallocated, overdrawn, total });
}
