import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { estimateRetirementRoom, estimateTaxReserve, DEFAULT_TAX_RESERVE_RATE_PCT } from "@/lib/allocations";

function periodToDate(period) {
  return `${period}-01`;
}
function yearStartIso(period) {
  const [y] = period.split("-");
  return `${y}-01-01T00:00:00.000Z`;
}
function periodStartIso(period) {
  return `${period}-01T00:00:00.000Z`;
}
function periodEndIso(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)).toISOString();
}

// Computes net income from every closeout_transactions row's
// confirmed_category (falling back to suggested_category for anything the
// person never touched), then returns this month's Solo 401k/SEP IRA
// contribution room and a rough tax set-aside estimate based on that real,
// confirmed number -- not a guess derived from raw deposits. Callable
// again after the first confirm (e.g. revisiting to adjust the tax rate or
// having fixed a mis-tagged transaction) -- always recomputes from
// scratch rather than trusting a stale stored total.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { period } = await params;
  const periodDate = periodToDate(period);
  const body = await request.json().catch(() => ({}));
  const taxRatePct = body.taxRatePct === undefined || body.taxRatePct === null || body.taxRatePct === ""
    ? DEFAULT_TAX_RESERVE_RATE_PCT
    : Number(body.taxRatePct);

  const admin = supabaseAdmin();

  const { data: closeout } = await admin
    .from("simple_monthly_closeouts")
    .select("*")
    .eq("user_id", user.id)
    .eq("period", periodDate)
    .maybeSingle();
  if (!closeout) return Response.json({ error: "Start this close-out first." }, { status: 404 });

  const { data: transactions } = await admin
    .from("simple_closeout_transactions")
    .select("amount, confirmed_category, suggested_category")
    .eq("closeout_id", closeout.id);

  // "income" here means business/side-hustle income only -- W2 paycheck
  // deposits get their own category (w2_income) and are deliberately left
  // out of this sum. Retirement contribution room (Solo 401k/SEP IRA) and
  // the tax reserve estimate below are both derived from netIncome, so a
  // W2 paycheck never inflates either: an employer already withholds taxes
  // and may already offer a 401k, and PriorityPay has no way to know what
  // room, if any, is left there. w2Income is tracked and returned purely
  // for transparency -- so the confirmed number visibly excludes it
  // instead of silently doing so.
  let income = 0;
  let expense = 0;
  let w2Income = 0;
  // Transactions the person flagged "Business" (Business Owner With
  // Employees persona, commingled accounts) -- same exclusion as
  // "exclude" for the net income math below, but tracked separately
  // (rather than lumped in silently) so Step 1 can show it back for
  // transparency, same pattern as w2Income.
  let business = 0;
  (transactions || []).forEach((t) => {
    const cat = t.confirmed_category || t.suggested_category;
    const amt = Number(t.amount) || 0;
    if (cat === "income") income += amt;
    if (cat === "expense") expense += amt;
    if (cat === "w2_income") w2Income += amt;
    if (cat === "business") business += amt;
  });
  const netIncome = income - expense;

  await admin
    .from("simple_monthly_closeouts")
    .update({ status: "confirmed", net_income: netIncome, tax_rate_pct: taxRatePct, confirmed_at: new Date().toISOString() })
    .eq("id", closeout.id);

  const { data: profile } = await admin.from("simple_profiles").select("age_bracket").eq("id", user.id).single();
  const ageBracket = profile?.age_bracket || "under50";

  // Every transfer_allocations row tagged with this retirement_type since
  // Jan 1 of the close-out's year, regardless of whether it came from a
  // fixed/percent split or a prior close-out's one-click transfer -- the
  // true year-to-date figure the annual IRS limit needs to be checked
  // against (see estimateRetirementRoom's comment in lib/allocations.js).
  const { data: ytdRows } = await admin
    .from("simple_transfer_allocations")
    .select("amount, retirement_type, simple_transfers!inner(user_id, created_at)")
    .eq("simple_transfers.user_id", user.id)
    .gte("simple_transfers.created_at", yearStartIso(period))
    .neq("status", "failed")
    .not("retirement_type", "is", null);
  const ytdByType = {};
  (ytdRows || []).forEach((r) => {
    ytdByType[r.retirement_type] = (ytdByType[r.retirement_type] || 0) + (Number(r.amount) || 0);
  });

  // No split_rules_fixed table in this project -- retirement categories
  // live directly as percent rows (see DEFAULT_SPLIT_RULES in
  // lib/allocations.js).
  const { data: fixedRetirementRows } = await admin
    .from("simple_split_rules_percent")
    .select("*")
    .eq("user_id", user.id)
    .not("retirement_type", "is", null);

  const { data: realAccountRows } = await admin.from("simple_retirement_accounts").select("*").eq("user_id", user.id);
  const realByType = Object.fromEntries((realAccountRows || []).map((r) => [r.retirement_type, r]));

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask, current_balance")
    .eq("user_id", user.id);
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]));

  const describe = (accountId) => {
    const a = accountId ? accountsById[accountId] : null;
    return a ? `${a.institution_name} ${a.account_name} •••• ${a.mask}` : null;
  };

  const retirement = (fixedRetirementRows || []).map((r) => {
    const room = estimateRetirementRoom({
      retirementType: r.retirement_type,
      netIncomeThisMonth: netIncome,
      ytdContributions: ytdByType[r.retirement_type] || 0,
      ageBracket,
      override: r.retirement_cap_override,
    });
    const holdingAccount = r.account_id ? accountsById[r.account_id] : null;
    const real = realByType[r.retirement_type];
    return {
      retirementType: r.retirement_type,
      label: r.label,
      room,
      ytdContributed: ytdByType[r.retirement_type] || 0,
      holdingAccountId: r.account_id || null,
      holdingAccountBalance: holdingAccount?.current_balance ?? null,
      holdingAccountLabel: describe(r.account_id),
      realAccountId: real?.account_id || null,
      realAccountLabel: describe(real?.account_id),
    };
  });

  const taxEstimate = estimateTaxReserve(netIncome, taxRatePct);

  // "Tax Reserve" has no stable id (split_rules_fixed rows regenerate their
  // id on every save, same as investment rows -- see lib/allocations.js) and
  // no dedicated flag column the way retirement rows have retirement_type,
  // so it's looked up by label instead, same anchor pattern used everywhere
  // else in the app for this kind of row.
  const { data: taxReserveRow } = await admin
    .from("simple_split_rules_percent")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("label", "Tax Reserve")
    .maybeSingle();
  const taxHoldingAccount = taxReserveRow?.account_id ? accountsById[taxReserveRow.account_id] : null;

  // Real money already routed toward taxes so far THIS close-out period
  // (not year-to-date -- Step 3 is a monthly reserve check) -- both the
  // flat Tax Reserve fixed minimum and any "additional Tax Reserve %" on
  // top of it share the label "Tax Reserve" (see PERCENT_MINIMUM_NOTE_LABELS
  // in lib/allocations.js), so a single label match captures both.
  const { data: taxAllocationRows } = await admin
    .from("simple_transfer_allocations")
    .select("amount, simple_transfers!inner(user_id, created_at)")
    .eq("simple_transfers.user_id", user.id)
    .eq("label", "Tax Reserve")
    .gte("simple_transfers.created_at", periodStartIso(period))
    .lt("simple_transfers.created_at", periodEndIso(period))
    .neq("status", "failed");
  const taxSetAsideThisMonth = (taxAllocationRows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

  return Response.json({
    closeout: { ...closeout, status: "confirmed", net_income: netIncome, tax_rate_pct: taxRatePct },
    netIncome,
    income,
    expense,
    w2Income,
    business,
    retirement,
    ageBracket,
    tax: {
      estimate: taxEstimate,
      ratePct: taxRatePct,
      setAsideThisMonth: taxSetAsideThisMonth,
      holdingAccountId: taxReserveRow?.account_id || null,
      holdingAccountLabel: describe(taxReserveRow?.account_id),
      holdingAccountBalance: taxHoldingAccount?.current_balance ?? null,
    },
  });
}
