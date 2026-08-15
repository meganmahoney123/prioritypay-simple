import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getTransactionsForRange } from "@/lib/plaidSync";
import { detectRecurringCharges, upcomingWithin, monthlyEstimate } from "@/lib/subscriptions";

// Looks back far enough to reliably catch at least two occurrences of a
// monthly (or slower) charge without making every request scan someone's
// entire multi-year transaction history.
const LOOKBACK_DAYS = 180;

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// GET pulls the last ~6 months of transactions across every connected
// account, runs recurring-charge detection, and returns both the full list
// (for "everything we found recurring") and just what's predicted to hit in
// the next 30 days (the actual "what's charging next month" headline).
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();
  const { data: accounts, error } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask, plaid_access_token")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (!accounts || accounts.length === 0) {
    return Response.json({ subscriptions: [], upcoming: [], monthlyEstimate: 0, connectedAccounts: 0 });
  }

  const startDate = isoDaysAgo(LOOKBACK_DAYS);
  const endDate = todayIso();

  let allTxns = [];
  for (const acc of accounts) {
    try {
      const txns = await getTransactionsForRange(acc.plaid_access_token, startDate, endDate);
      const accountLabel = `${acc.institution_name} ${acc.account_name} •••• ${acc.mask}`;
      allTxns = allTxns.concat(txns.map((t) => ({ ...t, accountId: acc.id, accountLabel })));
    } catch (err) {
      console.error("Subscription transaction fetch failed for account", acc.id, err?.response?.data || err);
    }
  }

  const subscriptions = detectRecurringCharges(allTxns);
  const upcoming = upcomingWithin(subscriptions, 30);

  return Response.json({
    subscriptions,
    upcoming,
    monthlyEstimate: Math.round(monthlyEstimate(subscriptions) * 100) / 100,
    connectedAccounts: accounts.length,
  });
}
