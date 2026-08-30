import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the "match this to a credit card transaction" picker on the
// Withdrawals tab (app/(app)/withdrawals/page.js) -- every credit-card
// account this user has connected, plus every transaction PriorityPay has
// ever synced for those accounts (see lib/closeoutSync.js -- credit
// accounts get pulled into simple_closeout_transactions the same as
// depository ones, across every month's close-out, not just the current
// one). There's no real "statement" concept in this app (Plaid billing-
// cycle data was never fetched), so this is framed as recent card
// activity grouped by account and by month instead of a true statement.
//
// Each transaction reports whether it's already matched to a withdrawal
// (joined against simple_withdrawals.closeout_transaction_id) so the
// picker can show "Already logged: Wedding $82.50" instead of letting the
// same real expense get recorded twice.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: creditAccounts } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask")
    .eq("user_id", user.id)
    .eq("account_type", "credit");

  const accountIds = (creditAccounts || []).map((a) => a.id);
  if (!accountIds.length) {
    return Response.json({ accounts: [], transactions: [] });
  }

  const [{ data: txnRows }, { data: linkedWithdrawals }] = await Promise.all([
    admin
      .from("simple_closeout_transactions")
      .select("id, account_id, name, amount, direction, txn_date, confirmed_category, suggested_category")
      .eq("user_id", user.id)
      .in("account_id", accountIds)
      .order("txn_date", { ascending: false })
      .limit(500),
    admin
      .from("simple_withdrawals")
      .select("closeout_transaction_id, category_label, amount, simple_withdrawal_allocations(label, amount)")
      .eq("user_id", user.id)
      .not("closeout_transaction_id", "is", null),
  ]);

  const linkedByTxnId = {};
  (linkedWithdrawals || []).forEach((w) => {
    linkedByTxnId[w.closeout_transaction_id] = {
      categoryLabel: w.category_label,
      amount: Number(w.amount) || 0,
      allocations: (w.simple_withdrawal_allocations || []).map((a) => ({ label: a.label, amount: Number(a.amount) || 0 })),
    };
  });

  return Response.json({
    accounts: creditAccounts || [],
    transactions: (txnRows || []).map((t) => ({
      id: t.id,
      accountId: t.account_id,
      name: t.name,
      amount: Number(t.amount) || 0,
      direction: t.direction,
      txnDate: t.txn_date,
      confirmedCategory: t.confirmed_category,
      suggestedCategory: t.suggested_category,
      linkedWithdrawal: linkedByTxnId[t.id] || null,
    })),
  });
}
