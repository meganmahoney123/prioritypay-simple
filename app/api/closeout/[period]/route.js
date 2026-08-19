import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { getTransactionsForRange } from "@/lib/plaidSync";

// `period` in the URL is "YYYY-MM" (e.g. "2026-07"); stored/queried as the
// first-of-month date Postgres expects.
function periodToDate(period) {
  return `${period}-01`;
}

function periodBounds(period) {
  const [y, m] = period.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0)); // day 0 of next month = last day of this month
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

// Best-effort auto-tag, purely a starting point -- the person reviews and
// can change every single one before confirming (see PATCH
// /api/closeout/transactions/[id]). Plaid's personal_finance_category
// already flags transfers between someone's own accounts reasonably well
// (TRANSFER_IN/TRANSFER_OUT), which matters here specifically because a lot
// of what shows up in a PriorityPay user's transaction history is
// PriorityPay's own split money moving between their own linked accounts --
// that's not real income or a real expense, just money that already got
// counted once when the original deposit landed. Falls back to a plain
// sign-based guess (Plaid convention: negative amount = money in) when PFC
// isn't present, which can happen for some institutions/sandbox data.
//
// W2 paychecks get their own guess too (w2_income, distinct from plain
// income) -- Plaid tags a regular payroll deposit's personal_finance_category
// as INCOME_WAGES, which is about as reliable a signal as PFC gets. Falls
// back to matching common payroll-processor/paycheck naming when PFC is
// missing or unclear (sandbox data especially). Either way this is only a
// starting suggestion -- the W2 popup (see app/(app)/closeout/page.js)
// walks the person through confirming or correcting every one before
// anything downstream (retirement room, tax reserve) trusts it.
const PAYROLL_NAME_PATTERN = /\b(payroll|direct ?dep(osit)?|salary|bi-?weekly pay|adp|gusto|paychex|justworks|rippling|paylocity|workday|tri ?net|insperity)\b/i;

function suggestCategory(txn, accountType) {
  const pfc = txn.personal_finance_category?.primary || "";
  const pfcDetailed = txn.personal_finance_category?.detailed || "";
  if (pfc === "TRANSFER_IN" || pfc === "TRANSFER_OUT") return "exclude";
  // On a credit card, a negative amount is a payment/credit reducing the
  // balance -- your own money moving, same as a transfer -- never income.
  if (accountType === "credit" && txn.amount < 0) return "exclude";
  if (txn.amount < 0) {
    const name = txn.merchant_name || txn.name || "";
    if (pfcDetailed === "INCOME_WAGES" || PAYROLL_NAME_PATTERN.test(name)) return "w2_income";
    return "income";
  }
  return "expense";
}

// GET creates the draft close-out for this period if it doesn't exist yet
// (pulling and auto-tagging every transaction across every linked account
// for that date range from Plaid), or just returns what's already there --
// re-fetching only while still a draft, so re-tagging on a later visit
// picks up anything that posted late, without ever touching a period
// that's already been confirmed and acted on.
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const period = params.period;
  const periodDate = periodToDate(period);
  const admin = supabaseAdmin();

  let { data: closeout } = await admin
    .from("simple_monthly_closeouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("period", periodDate)
    .maybeSingle();

  if (!closeout) {
    const { data: created, error } = await admin
      .from("simple_monthly_closeouts")
      .insert({ user_id: user.id, period: periodDate })
      .select("*")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    closeout = created;
  }

  if (closeout.status === "draft") {
    const { data: accounts } = await admin
      .from("simple_accounts")
      .select("id, plaid_access_token, account_type")
      .eq("user_id", user.id)
      .not("plaid_access_token", "is", null);

    const { startDate, endDate } = periodBounds(period);
    const rows = [];
    for (const acc of accounts || []) {
      try {
        const txns = await getTransactionsForRange(acc.plaid_access_token, startDate, endDate);
        txns
          .filter((t) => !t.pending)
          .forEach((t) => {
            rows.push({
              closeout_id: closeout.id,
              user_id: user.id,
              account_id: acc.id,
              plaid_transaction_id: t.transaction_id,
              txn_date: t.date,
              name: t.merchant_name || t.name || "Transaction",
              amount: Math.abs(t.amount),
              direction: t.amount < 0 ? "in" : "out",
              suggested_category: suggestCategory(t, acc.account_type),
            });
          });
      } catch (err) {
        console.error("Close-out transaction fetch failed for account", acc.id, err?.response?.data || err);
      }
    }
    if (rows.length) {
      // ignoreDuplicates so a re-visit doesn't clobber confirmed_category
      // on a transaction the person already reviewed.
      await admin
        .from("simple_closeout_transactions")
        .upsert(rows, { onConflict: "closeout_id,plaid_transaction_id", ignoreDuplicates: true });
    }
  }

  const { data: transactions } = await admin
    .from("simple_closeout_transactions")
    .select("*")
    .eq("closeout_id", closeout.id)
    .order("txn_date", { ascending: false });

  return Response.json({ closeout, transactions: transactions || [] });
}
