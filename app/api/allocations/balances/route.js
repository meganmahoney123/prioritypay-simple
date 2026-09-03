import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Current, spendable balance per category label -- NOT the same number as
// the Dashboard's "Total saved since joining PriorityPay" (allTimeTotal,
// see app/api/allocations/history/range/route.js), which is deliberately
// gross/never-netted. This route is the netted view: starting_balance
// (a one-time, user-declared opening balance set on the category itself,
// see simple_split_rules_percent.starting_balance) plus every real
// transfer_allocations dollar ever routed to that label, minus every real
// withdrawal_allocations dollar ever drawn from that label
// (source_type='category' only -- 'external' withdrawals never touched a
// tracked category's balance in the first place). Powers the Close-Out
// shortfall cascade (components/WithdrawalAllocator.js) and can be reused
// anywhere else a category's real spendable balance is needed.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: rules }, { data: allocRows }, { data: withdrawalRows }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("label, starting_balance").eq("user_id", user.id),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, status)")
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

  const byLabel = {};
  (rules || []).forEach((r) => {
    byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
  });
  (allocRows || []).forEach((r) => {
    byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label) return;
    byLabel[r.label] = (byLabel[r.label] || 0) - (Number(r.amount) || 0);
  });

  return Response.json({ balances: byLabel });
}
