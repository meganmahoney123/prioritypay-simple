import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { periodToDate } from "@/lib/closeoutSync";
import { isW2NoSideHustle } from "@/lib/allocations";
import { loadBusinessRows, typeForBusiness, closeoutCategoryFor } from "@/lib/businesses";
import { SOLE_PROP, SINGLE_LLC, paysByDraw } from "@/lib/entityCopy";

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
  "megan+selfemployed@ignitemysite.com",
  "megan+sidehustle@ignitemysite.com",
  "megan+bizowner@ignitemysite.com",
  "megan+bizsingle@ignitemysite.com",
  "megan+bizmulti@ignitemysite.com",
]);

// Small, generic, and deliberately not tied to any persona's real split
// categories -- just enough recurring texture that a month doesn't read
// as 100% income. Repeats every month touched.
const EXPENSE_TEMPLATE = [
  { name: "Software Subscriptions", amount: 129, pfc: "GENERAL_SERVICES" },
  { name: "Office Supplies", amount: 84.5, pfc: "GENERAL_MERCHANDISE" },
  { name: "Business Insurance", amount: 210, pfc: "GENERAL_SERVICES" },
  { name: "Grocery Store", amount: 312.4, pfc: "FOOD_AND_DRINK" },
  { name: "Restaurants & Coffee", amount: 186.75, pfc: "FOOD_AND_DRINK" },
  { name: "Gas & Rideshare", amount: 142.3, pfc: "TRANSPORTATION" },
  { name: "Streaming & Fun", amount: 64.97, pfc: "ENTERTAINMENT" },
  { name: "Rent & Utilities", amount: 1480, pfc: "RENT_AND_UTILITIES" },
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
  // Also the current and previous two calendar months, so the demo has a
  // filled-in Close Out for whatever month the person opens.
  for (let back = 0; back < 3; back++) {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - back);
    periods.add(d.toISOString().slice(0, 7));
  }
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
        pfc_primary: exp.pfc,
      });
    });
  });

  // Show what it looks like once deposits were tagged on Split My Deposits:
  // most deposits already carry a type (and a business) and flow into Close
  // Out as handled; the last couple of each month are left untagged so the
  // "Needs your attention" list has something in it. Only for people who
  // earn business income (W-2-only personas have nothing to attribute).
  // Sample accounts show a curated month: drop the live (non-seed) rows for
  // the periods filled here. closeoutSync skips the live fetch for these.
  for (const closeoutId of Object.values(closeoutIdByPeriod)) {
    await admin
      .from("simple_closeout_transactions")
      .delete()
      .eq("closeout_id", closeoutId)
      .not("plaid_transaction_id", "like", "demo-seed-%");
  }

  let tagged = 0;
  if (incomeCategory === "income") {
    let businesses = await loadBusinessRows(admin, user.id);
    if (!businesses.length) {
      const seedRows = [
        { user_id: user.id, name: "Ignite My Site", entity_type: SOLE_PROP },
        { user_id: user.id, name: "PriorityPay", entity_type: SINGLE_LLC },
      ];
      const { error: bizErr } = await admin.from("simple_businesses").insert(seedRows);
      if (!bizErr) businesses = await loadBusinessRows(admin, user.id);
    }
    if (businesses.length) {
      // deposit rows grouped by month, oldest first
      const byMonth = {};
      transfers.forEach((t) => {
        const k = monthKey(t.created_at);
        (byMonth[k] = byMonth[k] || []).push(t);
      });
      const pattern = ["biz", "biz", "w2", "misc"]; // cycles; a "biz" alternates between businesses
      let bizTurn = 0;
      for (const list of Object.values(byMonth)) {
        const leaveOpen = 0; // open items come from the curated list below
        for (let i = 0; i < list.length - leaveOpen; i++) {
          const t = list[i];
          const kind = pattern[i % pattern.length];
          let depositType = "misc";
          let businessId = null;
          if (kind === "biz") {
            const biz = businesses[bizTurn++ % businesses.length];
            depositType = typeForBusiness(biz.entityType);
            businessId = biz.id;
          } else if (kind === "w2") depositType = "w2";
          const update = { deposit_type: depositType, business_id: businessId };
          let r = await admin.from("simple_transfers").update(update).eq("id", t.id);
          if (r.error) r = await admin.from("simple_transfers").update({ deposit_type: depositType }).eq("id", t.id);
          const cat = closeoutCategoryFor(depositType);
          const row = rows.find((x) => x.plaid_transaction_id === `demo-seed-income-${t.id}`);
          if (row) {
            row.suggested_category = cat;
            row.confirmed_category = cat;
            row.business_id = businessId;
            row.name = depositType === "w2" ? "Payroll Direct Deposit" : depositType === "misc" ? "Venmo Payment" : "Client Payment";
            tagged += 1;
          }
        }
      }
      // A few expenses already attributed to a business, so profit per business has numbers.
      rows.forEach((r) => {
        if (r.direction === "out" && ["Software Subscriptions", "Office Supplies", "Business Insurance"].includes(r.name)) {
          const biz = businesses[r.name === "Business Insurance" ? businesses.length - 1 : 0];
          r.confirmed_category = "expense";
          r.business_id = biz.id;
        }
        // The everyday personal lines are already marked Personal.
        if (r.direction === "out" && ["Grocery Store", "Restaurants & Coffee", "Gas & Rideshare", "Streaming & Fun", "Rent & Utilities"].includes(r.name)) {
          r.confirmed_category = "exclude";
        }
      });

      // Richer, mostly-sorted month so the Close Out sample looks lived in:
      // lots already handled from Split My Deposits and Withdrawals, a short
      // list of items still needing attention.
      const soleProp = businesses.find((b) => !paysByDraw(b.entityType)) || businesses[0];
      const llc = businesses.find((b) => paysByDraw(b.entityType));
      const extra = [];
      const add = (key, day, name, amount, direction, extraFields) => {
        Object.entries(closeoutIdByPeriod).forEach(([period, closeoutId]) => {
          extra.push({
            closeout_id: closeoutId,
            user_id: user.id,
            account_id: checkingAccountId,
            plaid_transaction_id: `demo-seed-x-${period}-${key}`,
            txn_date: `${period}-${String(day).padStart(2, "0")}`,
            name,
            amount,
            direction,
            ...extraFields,
          });
        });
      };
      // Sample month matches the approved Close Out mockup exactly.
      rows.length = 0; // curated sample replaces the generic template rows
      const inc = (key, day, name, amount, cat, biz) =>
        add(key, day, name, amount, "in", { suggested_category: cat, confirmed_category: cat, ...(biz ? { business_id: biz } : {}) });
      // Income, already sorted: $15,897 across five sources
      inc("inc-biz1", 3, "Client Payment", 4000, "income", soleProp.id);
      inc("inc-biz2", 14, "Client Payment", 3200, "income", soleProp.id);
      inc("inc-biz3", 24, "Client Payment", 2000, "income", soleProp.id);
      if (llc) inc("inc-draw", 15, `${llc.name} Owner Draw`, 3000, "income", llc.id);
      inc("inc-w2", 1, "Acme Corp Payroll", 3200, "w2_income");
      inc("inc-misc", 22, "Venmo from Sam", 85, "misc_income");
      [["div1", 6, "Vanguard Dividend", 112], ["int1", 9, "Schwab Interest", 88], ["div2", 14, "Fidelity Dividend", 142], ["int2", 18, "Ally Savings Interest", 70]].forEach(([k, d, n, a]) =>
        inc(k, d, n, a, "investment_income")
      );
      // Six business expenses already sorted: $1,364 for the sole proprietor
      [["x-ads", 10, "Facebook Ads", 520, "ADVERTISING"], ["x-up", 12, "Upwork Contractor", 450, "GENERAL_SERVICES"], ["x-web", 4, "Webflow", 77, "GENERAL_SERVICES"], ["x-gw", 2, "Google Workspace", 72, "GENERAL_SERVICES"], ["x-qb", 8, "QuickBooks", 35, "GENERAL_SERVICES"], ["x-ins", 15, "Business Insurance", 210, "GENERAL_SERVICES"]].forEach(([k, d, n, a, pfc]) =>
        add(k, d, n, a, "out", { suggested_category: "expense", confirmed_category: "expense", business_id: soleProp.id, pfc_primary: pfc })
      );
      // Still needs attention: two income items and six expenses
      add("n-inc1", 28, "VANGUARD DIVIDEND", 112, "in", { suggested_category: "investment_income" });
      add("n-inc2", 30, "Zelle from Jordan", 60, "in", { suggested_category: "misc_income" });
      [["n-cva", 1, "Canva", 15, "GENERAL_SERVICES"], ["n-ado", 3, "Adobe", 54, "GENERAL_SERVICES"], ["n-zm", 7, "Zoom", 16, "GENERAL_SERVICES"], ["n-ub", 12, "Uber", 23, "TRANSPORTATION"], ["n-wf", 19, "Whole Foods", 68, "FOOD_AND_DRINK"], ["n-sh", 24, "Shell", 41, "TRANSPORTATION"]].forEach(([k, d, n, a, pfc]) =>
        add(k, d, n, a, "out", { suggested_category: "expense", pfc_primary: pfc })
      );
      rows.push(...extra);
    }
  }

  let { error: insertError } = await admin
    .from("simple_closeout_transactions")
    .upsert(rows, { onConflict: "closeout_id,plaid_transaction_id" });
  if (insertError && /business_id/.test(insertError.message || "")) {
    // Biz-attribution SQL not run yet: seed without it.
    ({ error: insertError } = await admin
      .from("simple_closeout_transactions")
      .upsert(rows.map(({ business_id, ...r }) => r), { onConflict: "closeout_id,plaid_transaction_id" }));
  }
  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

  return Response.json({ checkingAccountId, periods: Object.keys(closeoutIdByPeriod), transactionsSeeded: rows.length, depositsTagged: tagged });
}
