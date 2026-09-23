import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { computeAllocations, investmentTypeFromLabel, PERSONA_SELF_EMPLOYED } from "@/lib/allocations";

// DEMO ONLY -- unlike the sibling /api/dev/seed-* routes (which require
// PLAID_ENV=sandbox and mint real Plaid Sandbox items, so they only work
// against a local/dev environment), this one is meant to run against
// production, against exactly ONE account: Megan's own
// megan@ignitemysite.com, a separate, essentially-unused account she wants
// to turn into a sales demo for prospective customers (confirmed to have
// zero real linked bank accounts and no real transfer history before this
// was written -- never intended for, and never touches, any other user's
// data). Hardcoded to that one email rather than gated by an env var,
// since there's no "demo mode" flag in this app and the point is to run
// this exactly once, deliberately, from that account's own logged-in
// session, not to leave a generally-reachable seeding endpoint live in
// production.
//
// Every account, split rule, and transfer this creates is 100% fake and
// manually-added -- no plaid_access_token/plaid_account_id/plaid_item_id,
// no Dwolla funding source, so nothing here can ever move real money or
// attempt a real ACH transfer, however it's clicked around in the UI.
//
// Idempotent: reruns fully replace this account's split rules and
// demo-seeded accounts/transfers, so this can be safely re-run to refresh
// the numbers (e.g. to roll the deposit dates forward) without piling up
// duplicates.
const ALLOWED_EMAIL = "megan@ignitemysite.com";

const DEMO_ACCOUNTS = [
  { key: "tax_reserve", institution_name: "Ally Bank", account_name: "Tax Reserve Savings", mask: "7756", subtype: "savings", current_balance: 4820.0 },
  { key: "investments", institution_name: "Vanguard", account_name: "Cash Reserve", mask: "5510", subtype: "savings", current_balance: 6218.4 },
  { key: "solo_401k", institution_name: "Fidelity", account_name: "Solo 401k Contributions", mask: "3391", subtype: "savings", current_balance: 9102.55 },
  { key: "emergency_fund", institution_name: "Marcus by Goldman Sachs", account_name: "Emergency Fund", mask: "2290", subtype: "savings", current_balance: 12340.0 },
  { key: "opex", institution_name: "Chase", account_name: "Business Checking", mask: "4821", subtype: "checking", current_balance: 3120.55 },
  { key: "savings", institution_name: "Capital One", account_name: "Online Savings", mask: "6094", subtype: "savings", current_balance: 2450.0 },
];

// Same six categories/percentages as DEFAULT_SPLIT_RULES (lib/allocations.js)
// -- the Self Employed persona's own real defaults, just with every row
// connected to one of the fake accounts above and two of them (Investments,
// Solo 401k) given a starting balance so the new Investment Projections tab
// has a non-zero "Pre-PriorityPay" bar to show off. Both starting balances
// are comfortably under their account's fake balance, so the starting-
// balance over-allocation warning stays quiet for the default demo.
const DEMO_SPLIT_RULES = [
  { label: "Tax Reserve", group: null, pct: 20, color: "#a3a3a3", accountKey: "tax_reserve", startingBalance: null },
  { label: "Investments", group: "Investments", pct: 10, color: "#14b8a6", accountKey: "investments", startingBalance: 5000 },
  { label: "Solo 401k", group: "Retirement", pct: 15, color: "#8b5cf6", accountKey: "solo_401k", retirementType: "solo_401k", startingBalance: 7000 },
  { label: "Emergency Fund", group: "Savings", pct: 10, color: "#f59e0b", accountKey: "emergency_fund", startingBalance: null },
  { label: "Business Expenses (OPEX)", group: null, pct: 10, color: "#7c3aed", accountKey: "opex", startingBalance: null },
  { label: "Savings", group: "Savings", pct: 10, color: "#ef4444", accountKey: "savings", startingBalance: null },
];

// Three months of deposits ending in the current (partial) month, sized
// like a modestly successful creator/freelancer business -- enough to make
// the Dashboard's MTD/YTD/all-time totals and pie charts, and the
// Investment Projections contributions, all look like a real, lived-in
// account instead of an empty one.
const DEPOSITS = [
  { isoDate: "2026-07-03T15:00:00Z", amount: 6200 },
  { isoDate: "2026-07-16T15:00:00Z", amount: 5400 },
  { isoDate: "2026-07-29T15:00:00Z", amount: 4800 },
  { isoDate: "2026-08-04T15:00:00Z", amount: 6800 },
  { isoDate: "2026-08-18T15:00:00Z", amount: 5200 },
  { isoDate: "2026-09-05T15:00:00Z", amount: 7100 },
  { isoDate: "2026-09-19T15:00:00Z", amount: 5600 },
];

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if ((user.email || "").toLowerCase() !== ALLOWED_EMAIL) {
    return Response.json({ error: "This demo-seeding endpoint only runs against one specific account." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const accountNames = DEMO_ACCOUNTS.map((a) => a.account_name);

  // 1) Fake, manually-added accounts -- no Plaid/Dwolla fields at all, so
  // these can never be used to move real money.
  await admin.from("simple_accounts").delete().eq("user_id", user.id).in("account_name", accountNames);
  const { data: insertedAccounts, error: accountsError } = await admin
    .from("simple_accounts")
    .insert(
      DEMO_ACCOUNTS.map((a) => ({
        user_id: user.id,
        institution_name: a.institution_name,
        account_name: a.account_name,
        mask: a.mask,
        subtype: a.subtype,
        account_type: "depository",
        current_balance: a.current_balance,
      }))
    )
    .select("id, account_name");
  if (accountsError) return Response.json({ error: accountsError.message }, { status: 500 });

  const accountIdByKey = {};
  DEMO_ACCOUNTS.forEach((a) => {
    const row = insertedAccounts.find((r) => r.account_name === a.account_name);
    if (row) accountIdByKey[a.key] = row.id;
  });

  // 2) Split rules -- wholesale replace, same as onboarding/Split Rules'
  // own Save does; this account has no real rules worth preserving.
  await admin.from("simple_split_rules_percent").delete().eq("user_id", user.id);
  const { data: insertedRules, error: rulesError } = await admin
    .from("simple_split_rules_percent")
    .insert(
      DEMO_SPLIT_RULES.map((r) => ({
        user_id: user.id,
        label: r.label,
        group_name: r.group,
        pct: r.pct,
        color: r.color,
        account_id: accountIdByKey[r.accountKey] || null,
        retirement_type: r.retirementType || null,
        investment_type: r.group === "Investments" && !r.retirementType ? investmentTypeFromLabel(r.label) : null,
        starting_balance: r.startingBalance,
      }))
    )
    .select("id, label, pct, retirement_type, investment_type");
  if (rulesError) return Response.json({ error: rulesError.message }, { status: 500 });

  // 3) Deposit history -- reuses the exact same computeAllocations math the
  // real split engine runs (see /api/dev/seed-history, which this mirrors),
  // against the rules just inserted above, so the seeded per-category
  // amounts always match today's percentages exactly.
  const splitRules = {
    fixed: [],
    percent: insertedRules.map((r) => ({
      id: r.id,
      pct: r.pct,
      max: null,
      label: r.label,
      retirementType: r.retirement_type || null,
      investmentType: r.investment_type || null,
    })),
  };

  const { data: oldTransfers } = await admin
    .from("simple_transfers")
    .select("id")
    .eq("user_id", user.id)
    .eq("trigger", "demo_seed");
  const oldIds = (oldTransfers || []).map((t) => t.id);
  if (oldIds.length) {
    await admin.from("simple_transfer_allocations").delete().in("transfer_id", oldIds);
    await admin.from("simple_transfers").delete().in("id", oldIds);
  }

  const createdTransfers = [];
  for (const dep of DEPOSITS) {
    const { data: transfer, error: transferError } = await admin
      .from("simple_transfers")
      .insert({
        user_id: user.id,
        source_amount: dep.amount,
        status: "completed",
        trigger: "demo_seed",
        created_at: dep.isoDate,
      })
      .select("id")
      .single();
    if (transferError) return Response.json({ error: transferError.message }, { status: 500 });

    const { allocated } = computeAllocations(splitRules, dep.amount);
    const rows = splitRules.percent
      .filter((r) => (allocated[r.id] || 0) > 0)
      .map((r) => ({
        transfer_id: transfer.id,
        category_type: "percent",
        label: r.label,
        amount: allocated[r.id],
        reserved_only: false,
        dwolla_transfer_id: null,
        status: "completed",
        retirement_type: r.retirementType || null,
        investment_type: r.investmentType || null,
      }));
    if (rows.length) await admin.from("simple_transfer_allocations").insert(rows);
    createdTransfers.push({ id: transfer.id, date: dep.isoDate, amount: dep.amount, categories: rows.length });
  }

  // 4) Profile -- Self Employed persona (matches DEFAULT_SPLIT_RULES above),
  // marked onboarded so it never redirects into the onboarding flow, and
  // backdated to just before the earliest seeded deposit so the Dashboard's
  // chart back-arrow can reach every seeded month.
  const earliestDate = DEPOSITS.map((d) => d.isoDate).sort()[0];
  await admin
    .from("simple_profiles")
    .update({ persona: PERSONA_SELF_EMPLOYED, onboarded: true, created_at: earliestDate })
    .eq("id", user.id);

  return Response.json({
    accounts: insertedAccounts,
    rules: insertedRules,
    transfers: createdTransfers,
  });
}
