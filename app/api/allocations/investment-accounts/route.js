import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { GROUPED_BUCKETS } from "@/lib/allocations";

// Powers the per-account view on the Projections tab
// (components/InvestmentAccounts.js). One entry per investable split-rule
// row (Investments, Retirement, Retirement (Side Income)):
//   balance  -- tracked balance: starting_balance + lifetime transfer
//               allocations - lifetime category withdrawals (same math as
//               /api/allocations/investment-projection).
//   months   -- contributions made through PrioritySave, summed per
//               calendar month (YYYY-MM), oldest first, from the person's
//               first contribution through the current month.
// Contributions only count transfers that actually went through (not
// failed / needs_approval / skipped).
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("label, group_name, starting_balance").eq("user_id", user.id),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, created_at)")
      .eq("simple_transfers.user_id", user.id)
      .neq("status", "failed")
      .neq("status", "needs_approval")
      .neq("status", "skipped"),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
  ]);

  const grouped = (rules || []).filter((r) => GROUPED_BUCKETS.includes(r.group_name));
  const byLabel = {};
  grouped.forEach((r) => {
    byLabel[r.label] = byLabel[r.label] || { label: r.label, group: r.group_name, balance: 0, perMonth: {} };
    byLabel[r.label].balance += Number(r.starting_balance) || 0;
  });

  (allocRows || []).forEach((r) => {
    const acct = byLabel[r.label];
    if (!acct) return;
    const amt = Number(r.amount) || 0;
    acct.balance += amt;
    const created = r.simple_transfers?.created_at;
    if (!created) return;
    const key = String(created).slice(0, 7);
    acct.perMonth[key] = (acct.perMonth[key] || 0) + amt;
  });
  (withdrawalRows || []).forEach((r) => {
    const acct = r.label ? byLabel[r.label] : null;
    if (acct) acct.balance -= Number(r.amount) || 0;
  });

  const now = new Date();
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const accounts = Object.values(byLabel).map((a) => {
    const keys = Object.keys(a.perMonth).sort();
    const months = [];
    if (keys.length) {
      let [y, m] = keys[0].split("-").map(Number);
      for (;;) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        months.push({ month: key, amount: a.perMonth[key] || 0 });
        if (key >= thisKey) break;
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }
    return { label: a.label, group: a.group, balance: a.balance, months };
  });

  return Response.json({ thisMonth: thisKey, accounts });
}
