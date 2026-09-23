import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import {
  computeAllocations,
  investmentTypeFromLabel,
  PERSONA_BUSINESS_OWNER,
  PERSONA_W2_NO_SIDE_HUSTLE,
  PERSONA_W2_WITH_SIDE_HUSTLE,
} from "@/lib/allocations";

// DEMO ONLY. Sibling to /api/dev/seed-demo-account (which seeds Megan's
// own already-existing megan@ignitemysite.com account) -- this one
// additionally CREATES the target account first, since the other three
// persona demos (business owner, W2 no side hustle, W2 with side hustle)
// don't have logins yet. Only megan@ignitemysite.com (the verified owner
// of the existing self-employed demo, checked below) can call this, and
// it only ever touches the fixed, hardcoded set of demo emails/personas
// in PERSONAS below -- never an arbitrary email or user id from the
// request. Every account/split-rule/transfer row this creates is fake and
// manually-added, exactly like seed-demo-account: no Plaid or Dwolla
// fields anywhere, so nothing here can ever move real money.
//
// Account creation goes through supabase.auth.admin.createUser with
// email_confirm: true (skips the email-verification click -- there's no
// inbox automation here to click it, and these aren't real people signing
// up) which fires the same on_auth_user_created_simple DB trigger a real
// signup does, so simple_profiles gets created and trial_ends_at gets set
// exactly the normal way.
const CALLER_EMAIL = "megan@ignitemysite.com";
const DEMO_PASSWORD = "PriorityPayDemo2026!";

const PERSONAS = {
  w2_only: {
    email: "megan+w2only@ignitemysite.com",
    personaLabel: PERSONA_W2_NO_SIDE_HUSTLE,
    accounts: [
      { key: "tax_reserve", institution_name: "SoFi", account_name: "Tax Reserve Savings", mask: "1180", subtype: "savings", current_balance: 6100.0 },
      { key: "investments", institution_name: "Charles Schwab", account_name: "Brokerage Cash", mask: "4402", subtype: "savings", current_balance: 4600.0 },
      { key: "401k", institution_name: "Fidelity", account_name: "401k Feeder", mask: "7719", subtype: "savings", current_balance: 5350.0 },
      { key: "ira", institution_name: "Vanguard", account_name: "IRA Feeder", mask: "2846", subtype: "savings", current_balance: 3350.0 },
      { key: "hsa", institution_name: "HealthEquity", account_name: "HSA", mask: "9015", subtype: "savings", current_balance: 1850.0 },
      { key: "emergency_fund", institution_name: "Ally Bank", account_name: "Emergency Fund", mask: "5537", subtype: "savings", current_balance: 8400.0 },
      { key: "savings", institution_name: "Capital One", account_name: "Online Savings", mask: "3312", subtype: "savings", current_balance: 7900.0 },
    ],
    splitRules: [
      { label: "Tax Reserve", group: null, pct: 20, color: "#a3a3a3", accountKey: "tax_reserve", startingBalance: null },
      { label: "Investments", group: "Investments", pct: 10, color: "#14b8a6", accountKey: "investments", startingBalance: 2500 },
      { label: "401k", group: "Retirement", pct: 5, color: "#8b5cf6", accountKey: "401k", retirementType: "traditional_401k", startingBalance: 4000 },
      { label: "IRA", group: "Retirement", pct: 5, color: "#6366f1", accountKey: "ira", retirementType: "traditional_ira", startingBalance: 2000 },
      { label: "HSA", group: "Retirement", pct: 5, color: "#0ea5e9", accountKey: "hsa", retirementType: "hsa", startingBalance: null },
      { label: "Emergency Fund", group: "Savings", pct: 10, color: "#f59e0b", accountKey: "emergency_fund", startingBalance: null },
      { label: "Savings", group: "Savings", pct: 20, color: "#ef4444", accountKey: "savings", startingBalance: null },
    ],
    // Biweekly-paycheck shape (~$83k/yr) rather than the lumpy, irregular
    // deposits the self-employed demo uses -- the point of this persona
    // is showing how the exact same split-rules engine handles a regular
    // W2 paycheck just as well as variable self-employed income.
    deposits: [
      { isoDate: "2026-07-10T15:00:00Z", amount: 3200 },
      { isoDate: "2026-07-24T15:00:00Z", amount: 3200 },
      { isoDate: "2026-08-07T15:00:00Z", amount: 3200 },
      { isoDate: "2026-08-21T15:00:00Z", amount: 3200 },
      { isoDate: "2026-09-04T15:00:00Z", amount: 3200 },
      { isoDate: "2026-09-18T15:00:00Z", amount: 3200 },
    ],
  },
  side_hustle: {
    email: "megan+sidehustle@ignitemysite.com",
    personaLabel: PERSONA_W2_WITH_SIDE_HUSTLE,
    accounts: [
      { key: "tax_reserve", institution_name: "SoFi", account_name: "Tax Reserve Savings", mask: "6620", subtype: "savings", current_balance: 3400.0 },
      { key: "investments", institution_name: "Charles Schwab", account_name: "Brokerage Cash", mask: "8814", subtype: "savings", current_balance: 2700.0 },
      { key: "401k", institution_name: "Fidelity", account_name: "401k Feeder", mask: "1173", subtype: "savings", current_balance: 3200.0 },
      { key: "ira", institution_name: "Vanguard", account_name: "IRA Feeder", mask: "4290", subtype: "savings", current_balance: 1900.0 },
      { key: "hsa", institution_name: "HealthEquity", account_name: "HSA", mask: "7702", subtype: "savings", current_balance: 1100.0 },
      { key: "solo_401k", institution_name: "Fidelity", account_name: "Solo 401k Contributions", mask: "5560", subtype: "savings", current_balance: 3300.0 },
      { key: "emergency_fund", institution_name: "Ally Bank", account_name: "Emergency Fund", mask: "9931", subtype: "savings", current_balance: 5200.0 },
      { key: "savings", institution_name: "Capital One", account_name: "Online Savings", mask: "2287", subtype: "savings", current_balance: 3100.0 },
    ],
    splitRules: [
      { label: "Tax Reserve", group: null, pct: 20, color: "#a3a3a3", accountKey: "tax_reserve", startingBalance: null },
      { label: "Investments", group: "Investments", pct: 10, color: "#14b8a6", accountKey: "investments", startingBalance: 1500 },
      { label: "401k", group: "Retirement", pct: 5, color: "#8b5cf6", accountKey: "401k", retirementType: "traditional_401k", startingBalance: 2500 },
      { label: "IRA", group: "Retirement", pct: 5, color: "#6366f1", accountKey: "ira", retirementType: "traditional_ira", startingBalance: 1200 },
      { label: "HSA", group: "Retirement", pct: 5, color: "#0ea5e9", accountKey: "hsa", retirementType: "hsa", startingBalance: null },
      {
        label: "Solo 401k",
        group: "Retirement (Side Income)",
        pct: 10,
        color: "#ec4899",
        accountKey: "solo_401k",
        retirementType: "solo_401k",
        startingBalance: 1800,
      },
      { label: "Emergency Fund", group: "Savings", pct: 10, color: "#f59e0b", accountKey: "emergency_fund", startingBalance: null },
      { label: "Savings", group: "Savings", pct: 10, color: "#ef4444", accountKey: "savings", startingBalance: null },
    ],
    // Smaller, irregular deposits -- meant to read as side-hustle income
    // landing on top of a day job (the day job's own paycheck never
    // passes through PriorityPay at all, same as any W2 user).
    deposits: [
      { isoDate: "2026-07-08T15:00:00Z", amount: 1400 },
      { isoDate: "2026-07-22T15:00:00Z", amount: 1900 },
      { isoDate: "2026-08-05T15:00:00Z", amount: 1650 },
      { isoDate: "2026-08-19T15:00:00Z", amount: 2100 },
      { isoDate: "2026-09-02T15:00:00Z", amount: 1750 },
      { isoDate: "2026-09-16T15:00:00Z", amount: 2000 },
    ],
  },
  business_owner: {
    email: "megan+bizowner@ignitemysite.com",
    personaLabel: PERSONA_BUSINESS_OWNER,
    businessName: "Sample Creator Studio LLC",
    // Business Owner (With Employees) has no dedicated getDefaultSplitRules
    // branch (see lib/allocations.js) -- it falls through to the same six
    // DEFAULT_SPLIT_RULES categories the Self Employed demo uses. This
    // demo differentiates itself with a business name/entity, larger
    // deposit amounts (representing a business with payroll/overhead
    // rather than one person's income), and separate fake accounts --
    // the Business tab itself (QuickBooks/multi-entity) is a separate
    // to-do, not seeded here.
    accounts: [
      { key: "tax_reserve", institution_name: "Mercury", account_name: "Tax Reserve", mask: "4471", subtype: "savings", current_balance: 28000.0 },
      { key: "investments", institution_name: "Vanguard", account_name: "Cash Reserve", mask: "3390", subtype: "savings", current_balance: 24000.0 },
      { key: "solo_401k", institution_name: "Fidelity", account_name: "Solo 401k Contributions", mask: "8827", subtype: "savings", current_balance: 35000.0 },
      { key: "emergency_fund", institution_name: "Marcus by Goldman Sachs", account_name: "Emergency Fund", mask: "1156", subtype: "savings", current_balance: 22000.0 },
      { key: "opex", institution_name: "Mercury", account_name: "Business Checking", mask: "7745", subtype: "checking", current_balance: 14000.0 },
      { key: "savings", institution_name: "Capital One", account_name: "Online Savings", mask: "6634", subtype: "savings", current_balance: 14000.0 },
    ],
    splitRules: [
      { label: "Tax Reserve", group: null, pct: 20, color: "#a3a3a3", accountKey: "tax_reserve", startingBalance: null },
      { label: "Investments", group: "Investments", pct: 10, color: "#14b8a6", accountKey: "investments", startingBalance: 9000 },
      { label: "Solo 401k", group: "Retirement", pct: 15, color: "#8b5cf6", accountKey: "solo_401k", retirementType: "solo_401k", startingBalance: 14000 },
      { label: "Emergency Fund", group: "Savings", pct: 10, color: "#f59e0b", accountKey: "emergency_fund", startingBalance: null },
      { label: "Business Expenses (OPEX)", group: null, pct: 10, color: "#7c3aed", accountKey: "opex", startingBalance: null },
      { label: "Savings", group: "Savings", pct: 10, color: "#ef4444", accountKey: "savings", startingBalance: null },
    ],
    // Roughly 3x the self-employed demo's deposit sizes -- a business
    // with employees and overhead moves more money through than one
    // person's income does.
    deposits: [
      { isoDate: "2026-07-03T15:00:00Z", amount: 18200 },
      { isoDate: "2026-07-16T15:00:00Z", amount: 15800 },
      { isoDate: "2026-07-29T15:00:00Z", amount: 14200 },
      { isoDate: "2026-08-04T15:00:00Z", amount: 19600 },
      { isoDate: "2026-08-18T15:00:00Z", amount: 16400 },
      { isoDate: "2026-09-05T15:00:00Z", amount: 20800 },
      { isoDate: "2026-09-19T15:00:00Z", amount: 17100 },
    ],
  },

  business_single: {
    email: "megan+bizsingle@ignitemysite.com",
    personaLabel: PERSONA_BUSINESS_OWNER,
    businessName: "Ridgeline Roofing LLC",
    plan: "business",
    // One entity holding every account -- the simplest Business-tab demo:
    // a single-business owner who upgraded mainly for the QuickBooks
    // true-up, not because they need to separate multiple businesses.
    entities: [{ key: "main", name: "Ridgeline Roofing LLC", entity_type: "LLC" }],
    accounts: [
      { key: "tax_reserve", institution_name: "Mercury", account_name: "Tax Reserve", mask: "5511", subtype: "savings", current_balance: 28000.0, entityKey: "main" },
      { key: "investments", institution_name: "Vanguard", account_name: "Cash Reserve", mask: "5512", subtype: "savings", current_balance: 24000.0, entityKey: "main" },
      { key: "solo_401k", institution_name: "Fidelity", account_name: "Solo 401k Contributions", mask: "5513", subtype: "savings", current_balance: 35000.0, entityKey: "main" },
      { key: "emergency_fund", institution_name: "Marcus by Goldman Sachs", account_name: "Emergency Fund", mask: "5514", subtype: "savings", current_balance: 22000.0, entityKey: "main" },
      { key: "opex", institution_name: "Mercury", account_name: "Business Checking", mask: "5515", subtype: "checking", current_balance: 14000.0, entityKey: "main" },
      { key: "savings", institution_name: "Capital One", account_name: "Online Savings", mask: "5516", subtype: "savings", current_balance: 14000.0, entityKey: "main" },
    ],
    // Same split-rule shape and starting balances as the plain Business
    // Owner demo -- already verified against these exact deposit totals
    // (see business_owner below), reused here rather than re-deriving new
    // numbers. Split rules aren't entity-scoped in the schema (only
    // simple_accounts/simple_qbo_* carry entity_id), so this part of the
    // account is identical regardless of how many entities exist.
    splitRules: [
      { label: "Tax Reserve", group: null, pct: 20, color: "#a3a3a3", accountKey: "tax_reserve", startingBalance: null },
      { label: "Investments", group: "Investments", pct: 10, color: "#14b8a6", accountKey: "investments", startingBalance: 9000 },
      { label: "Solo 401k", group: "Retirement", pct: 15, color: "#8b5cf6", accountKey: "solo_401k", retirementType: "solo_401k", startingBalance: 14000 },
      { label: "Emergency Fund", group: "Savings", pct: 10, color: "#f59e0b", accountKey: "emergency_fund", startingBalance: null },
      { label: "Business Expenses (OPEX)", group: null, pct: 10, color: "#7c3aed", accountKey: "opex", startingBalance: null },
      { label: "Savings", group: "Savings", pct: 10, color: "#ef4444", accountKey: "savings", startingBalance: null },
    ],
    deposits: [
      { isoDate: "2026-07-03T15:00:00Z", amount: 18200 },
      { isoDate: "2026-07-16T15:00:00Z", amount: 15800 },
      { isoDate: "2026-07-29T15:00:00Z", amount: 14200 },
      { isoDate: "2026-08-04T15:00:00Z", amount: 19600 },
      { isoDate: "2026-08-18T15:00:00Z", amount: 16400 },
      { isoDate: "2026-09-05T15:00:00Z", amount: 20800 },
      { isoDate: "2026-09-19T15:00:00Z", amount: 17100 },
    ],
  },
  business_multi: {
    email: "megan+bizmulti@ignitemysite.com",
    personaLabel: PERSONA_BUSINESS_OWNER,
    businessName: "Ridgeline Roofing LLC",
    plan: "business",
    // Two entities, each holding half the accounts -- demonstrates the
    // actual multi-entity grouping feature (Businesses card + "Accounts
    // by business" assignment), not just a second business_name string.
    entities: [
      { key: "roofing", name: "Ridgeline Roofing LLC", entity_type: "LLC" },
      { key: "media", name: "Blue Bison Media LLC", entity_type: "LLC" },
    ],
    accounts: [
      { key: "tax_reserve", institution_name: "Mercury", account_name: "Tax Reserve", mask: "6621", subtype: "savings", current_balance: 28000.0, entityKey: "roofing" },
      { key: "opex", institution_name: "Mercury", account_name: "Business Checking", mask: "6622", subtype: "checking", current_balance: 14000.0, entityKey: "roofing" },
      { key: "solo_401k", institution_name: "Fidelity", account_name: "Solo 401k Contributions", mask: "6623", subtype: "savings", current_balance: 35000.0, entityKey: "roofing" },
      { key: "investments", institution_name: "Vanguard", account_name: "Cash Reserve", mask: "6624", subtype: "savings", current_balance: 24000.0, entityKey: "media" },
      { key: "emergency_fund", institution_name: "Marcus by Goldman Sachs", account_name: "Emergency Fund", mask: "6625", subtype: "savings", current_balance: 22000.0, entityKey: "media" },
      { key: "savings", institution_name: "Capital One", account_name: "Online Savings", mask: "6626", subtype: "savings", current_balance: 14000.0, entityKey: "media" },
    ],
    splitRules: [
      { label: "Tax Reserve", group: null, pct: 20, color: "#a3a3a3", accountKey: "tax_reserve", startingBalance: null },
      { label: "Investments", group: "Investments", pct: 10, color: "#14b8a6", accountKey: "investments", startingBalance: 9000 },
      { label: "Solo 401k", group: "Retirement", pct: 15, color: "#8b5cf6", accountKey: "solo_401k", retirementType: "solo_401k", startingBalance: 14000 },
      { label: "Emergency Fund", group: "Savings", pct: 10, color: "#f59e0b", accountKey: "emergency_fund", startingBalance: null },
      { label: "Business Expenses (OPEX)", group: null, pct: 10, color: "#7c3aed", accountKey: "opex", startingBalance: null },
      { label: "Savings", group: "Savings", pct: 10, color: "#ef4444", accountKey: "savings", startingBalance: null },
    ],
    deposits: [
      { isoDate: "2026-07-03T15:00:00Z", amount: 18200 },
      { isoDate: "2026-07-16T15:00:00Z", amount: 15800 },
      { isoDate: "2026-07-29T15:00:00Z", amount: 14200 },
      { isoDate: "2026-08-04T15:00:00Z", amount: 19600 },
      { isoDate: "2026-08-18T15:00:00Z", amount: 16400 },
      { isoDate: "2026-09-05T15:00:00Z", amount: 20800 },
      { isoDate: "2026-09-19T15:00:00Z", amount: 17100 },
    ],
  },
};

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if ((user.email || "").toLowerCase() !== CALLER_EMAIL) {
    return Response.json({ error: "This provisioning endpoint can only be called from the verified demo owner account." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const persona = PERSONAS[body.persona];
  if (!persona) {
    return Response.json({ error: `Unknown persona. Valid keys: ${Object.keys(PERSONAS).join(", ")}` }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // 1) Find or create the target auth user. email_confirm: true skips
  // email verification -- there's no real inbox click happening here.
  let targetUserId = null;
  {
    let page = 1;
    while (!targetUserId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      const found = (data.users || []).find((u) => (u.email || "").toLowerCase() === persona.email);
      if (found) { targetUserId = found.id; break; }
      if (!data.users || data.users.length < 200) break;
      page += 1;
    }
  }
  if (!targetUserId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: persona.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (createError) return Response.json({ error: createError.message }, { status: 500 });
    targetUserId = created.user.id;
  }

  // 2) Fake, manually-added accounts.
  const accountNames = persona.accounts.map((a) => a.account_name);
  await admin.from("simple_accounts").delete().eq("user_id", targetUserId).in("account_name", accountNames);
  const { data: insertedAccounts, error: accountsError } = await admin
    .from("simple_accounts")
    .insert(
      persona.accounts.map((a) => ({
        user_id: targetUserId,
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
  persona.accounts.forEach((a) => {
    const row = insertedAccounts.find((r) => r.account_name === a.account_name);
    if (row) accountIdByKey[a.key] = row.id;
  });

  // 2b) Business-tab entities (PHASE T), only for personas that declare
  // them. Wholesale replace, same pattern as everything else here --
  // deleting first means re-running this endpoint for the same persona
  // never accumulates duplicate businesses. Entities aren't referenced by
  // split rules (only simple_accounts.entity_id), so this is purely about
  // grouping the accounts just inserted above.
  if (persona.entities && persona.entities.length) {
    await admin.from("simple_entities").delete().eq("user_id", targetUserId);
    const { data: insertedEntities, error: entitiesError } = await admin
      .from("simple_entities")
      .insert(persona.entities.map((e) => ({ user_id: targetUserId, name: e.name, entity_type: e.entity_type || null })))
      .select("id, name");
    if (entitiesError) return Response.json({ error: entitiesError.message }, { status: 500 });

    const entityIdByKey = {};
    persona.entities.forEach((e) => {
      const row = insertedEntities.find((r) => r.name === e.name);
      if (row) entityIdByKey[e.key] = row.id;
    });

    for (const a of persona.accounts) {
      if (!a.entityKey) continue;
      const entityId = entityIdByKey[a.entityKey];
      const accountId = accountIdByKey[a.key];
      if (!entityId || !accountId) continue;
      const { error: assignError } = await admin.from("simple_accounts").update({ entity_id: entityId }).eq("id", accountId);
      if (assignError) return Response.json({ error: assignError.message }, { status: 500 });
    }
  }

  // 3) Split rules -- wholesale replace.
  await admin.from("simple_split_rules_percent").delete().eq("user_id", targetUserId);
  const { data: insertedRules, error: rulesError } = await admin
    .from("simple_split_rules_percent")
    .insert(
      persona.splitRules.map((r) => ({
        user_id: targetUserId,
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

  // 4) Deposit history, run through the real computeAllocations math.
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
    .eq("user_id", targetUserId)
    .eq("trigger", "demo_seed");
  const oldIds = (oldTransfers || []).map((t) => t.id);
  if (oldIds.length) {
    await admin.from("simple_transfer_allocations").delete().in("transfer_id", oldIds);
    await admin.from("simple_transfers").delete().in("id", oldIds);
  }

  const createdTransfers = [];
  for (const dep of persona.deposits) {
    const { data: transfer, error: transferError } = await admin
      .from("simple_transfers")
      .insert({
        user_id: targetUserId,
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

  // 5) Profile.
  const earliestDate = persona.deposits.map((d) => d.isoDate).sort()[0];
  await admin
    .from("simple_profiles")
    .update({
      persona: persona.personaLabel,
      onboarded: true,
      created_at: earliestDate,
      ...(persona.businessName ? { business_name: persona.businessName } : {}),
      // Bumping straight to plan:"business" + subscription_status:"active"
      // is the same real-Stripe bypass used everywhere else in this file
      // (isBusinessPlan() in lib/subscription.js checks exactly these two
      // fields) -- no live QuickBooks OAuth connection is faked alongside
      // this, since that would need a real access/refresh token to call
      // Intuit's API; the Business tab's Businesses + "Accounts by
      // business" cards work fully, QuickBooks/true-up correctly show
      // "Not connected".
      ...(persona.plan === "business" ? { plan: "business", subscription_status: "active" } : {}),
    })
    .eq("id", targetUserId);

  return Response.json({
    email: persona.email,
    password: DEMO_PASSWORD,
    accounts: insertedAccounts,
    rules: insertedRules,
    transfers: createdTransfers,
  });
}
