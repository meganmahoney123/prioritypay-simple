import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { periodToDate } from "@/lib/closeoutSync";
import { isW2NoSideHustle } from "@/lib/allocations";

// DEV/DEMO ONLY -- gives each demo persona account something real to show
// on the Monthly Close-Out page.
//
// Close-Out (lib/closeoutSync.js) never reads simple_transfers -- it reads
// a persisted simple_closeout_transactions table, normally filled by
// fetching live Plaid transactions per linked account. None of the demo
// persona accounts (provision-demo-persona / seed-demo-account) have a
// real plaid_access_token though, so that fetch loop always skips every
// one of their accounts and Close-Out shows "No transactions found" --
// this has nothing to do with which Plaid environment production is
// pointed at, and doesn't require touching that.
//
// The other half of the gap: every account these personas seed is a
// *destination* account for one split category (Tax Reserve, Solo 401k,
// etc.) -- none of them represent a paycheck/income-landing checking
// account, which is what Close-Out expects to find income transactions
// on. Business personas already have one ("Business Checking", subtype
// "checking"); the W2/side-hustle personas don't have any checking
// account at all, so this creates one for them.
//
// This route turns each of this user's own demo_seed simple_transfers
// rows (the same deposit history that already drives the Dashboard) into
// income lines on that checking account, adds a handful of generic
// expense lines per month for texture, and makes sure a draft
// simple_monthly_closeouts row exists for every period touched. No Plaid
// call, no dependency on PLAID_ENV. Idempotent -- reruns delete and
// replace only the rows this route created (plaid_transaction_id prefixed
// "demo-seed-"), never anything a real user's own linked account would
// produce.
const DEMO_EMAILS = new Set([
  "megan@ignitemysite.com",
  "megan+w2only@ignitemysite.com",
  "megan+sidehustle@ignitemysite.com",
  "megan+bizowner@ignitemysite.com",
  "megan+bizsingle@ignitemysite.com",
  "megan+bizmulti@ignitemysite.com",
]);

// Small, generic, and deliberately not tied to any persona's real split
// categories -- just enough recurring texture that a month doesn't read
// as 100% income. Repeats every month touched.
const EXPENSE_TEMPLATE = [
  { name: "Software Subscriptions", amount: 129 },
  { name: "Office Supplies", amount: 84.5 },
  { name: "Business Insurance", amount: 210 },
];

function monthKey(isoDate) {
  return isoDate.slice(0, 7); // "YYYY-MM"
}

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!DEMO_EMAILS.has(user.email)) {
    return Response.json({ error: "This endpoint can only be called from a known demo account." }, { status: 403 });
  }

  const admin = supabaseAdmin();

  const { data: profile } = await admin.from("simple_profiles").select("persona").eq("id", user.id).maybeSingle();
  const incomeCategory = isW2NoSideHustle(profile?.persona) ? "w2_income" : "income";

  // Find (or create) the checking account income lines will attach to.
  const { data: accounts, error: accountsError } = await admin
    .from("simple_accounts")
    .select("id, subtype, account_type, institution_name")
    .eq("user_id", user.id);
  if (accountsError) return Response.json({ error: accountsError.message }, { status: 500 });

  let checkingAccountId = (accounts || []).find((a) => a.subtype === "checking" && a.account_type !== "business")?.id;
  if (!checkingAccountId) {
    const { data: created, error: createError } = await admin
      .from("simple_accounts")
      .insert({
        user_id: user.id,
        institution_name: "Chase",
        account_name: "Everyday Checking",
        mask: "0192",
        subtype: "checking",
        account_type: "depository",
        current_balance: 4250.0,
      })
      .select("id")
      .single();
    if (createError) return Response.json({ error: createError.message }, { status: 500 });
    checkingAccountId = created.id;
  }

  // Pull this account's existing seeded income history -- same rows the
  // Dashboard already reads, reused here instead of re-inventing amounts.
  const { data: transfers, error: transfersError } = await admin
    .from("simple_transfers")
    .select("id, source_amount, created_at")
    .eq("user_id", user.id)
    .eq("trigger", "demo_seed")
    .order("created_at", { ascending: true });
  if (transfersError) return Response.json({ error: transfersError.message }, { status: 500 });
  if (!transfers?.length) {
    return Response.json({ error: "No demo_seed transfers found -- run the persona/account seeder first." }, { status: 400 });
  }

  // Clean up anything this route created before, so reruns don't pile up.
  const { data: existingClose } = await admin.from("simple_monthly_closeouts").select("id").eq("user_id", user.id);
  const closeoutIds = (existingClose || []).map((c) => c.id);
  if (closeoutIds.length) {
    await admin
      .from("simple_closeout_transactions")
      .delete()
      .in("closeout_id", closeoutIds)
      .like("plaid_transaction_id", "demo-seed-%");
  }

  const periods = new Set(transfers.map((t) => monthKey(t.created_at)));
  const closeoutIdByPeriod = {};
  for (const period of periods) {
    const periodDate = periodToDate(period);
    let { data: closeout } = await admin
      .from("simple_monthly_closeouts")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("period", periodDate)
      .maybeSingle();
    if (!closeout) {
      const { data: created, error } = await admin
        .from("simple_monthly_closeouts")
        .insert({ user_id: user.id, period: periodDate })
        .select("id, status")
        .single();
      if (error) return Response.json({ error: error.message }, { status: 500 });
      closeout = created;
    }
    closeoutIdByPeriod[period] = closeout.id;
  }

  const rows = [];
  transfers.forEach((t) => {
    const period = monthKey(t.created_at);
    rows.push({
      closeout_id: closeoutIdByPeriod[period],
      user_id: user.id,
      account_id: checkingAccountId,
      plaid_transaction_id: `demo-seed-income-${t.id}`,
      txn_date: t.created_at.slice(0, 10),
      name: incomeCategory === "w2_income" ? "Payroll Direct Deposit" : "Client Payment",
      amount: Number(t.source_amount),
      direction: "in",
      suggested_category: incomeCategory,
    });
  });
  Object.entries(closeoutIdByPeriod).forEach(([period, closeoutId]) => {
    EXPENSE_TEMPLATE.forEach((exp, i) => {
      rows.push({
        closeout_id: closeoutId,
        user_id: user.id,
        account_id: checkingAccountId,
        plaid_transaction_id: `demo-seed-expense-${period}-${i}`,
        txn_date: `${period}-15`,
        name: exp.name,
        amount: exp.amount,
        direction: "out",
        suggested_category: "expense",
      });
    });
  });

  const { error: insertError } = await admin
    .from("simple_closeout_transactions")
    .upsert(rows, { onConflict: "closeout_id,plaid_transaction_id" });
  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

  return Response.json({ checkingAccountId, periods: Object.keys(closeoutIdByPeriod), transactionsSeeded: rows.length });
}
