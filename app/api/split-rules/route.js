import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { investmentTypeFromLabel } from "@/lib/allocations";

// PriorityPay Simple has no fixed-minimums layer at all -- every category is
// a percentage of each deposit, full stop. `fixed` is kept as an always-empty
// array in the response shape purely so shared components ported from the
// original app (AccountBalances, etc.) that still read `splitRules.fixed`
// keep working with zero special-casing -- there is no split_rules_fixed
// table in this project's database, and PUT silently ignores any `fixed`
// payload a caller might send.
function rowToPercent(r) {
  return {
    id: r.id,
    label: r.label,
    group: r.group_name,
    pct: Number(r.pct),
    max: r.cap === null || r.cap === undefined ? null : Number(r.cap),
    balanceCap: r.balance_cap === null || r.balance_cap === undefined ? null : Number(r.balance_cap),
    color: r.color,
    accountId: r.account_id,
    retirementType: r.retirement_type || null,
    investmentType: r.investment_type || null,
    startingBalance: r.starting_balance === null || r.starting_balance === undefined ? null : Number(r.starting_balance),
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: percent, error } = await admin
    .from("simple_split_rules_percent")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    splitRules: {
      fixed: [],
      percent: (percent || []).map(rowToPercent),
    },
  });
}

// Replaces the user's whole rule set. Insert the new rows FIRST and only
// delete the previous ones once that insert has actually succeeded --
// deliberately not "delete then insert": if the insert ever fails partway
// (a schema mismatch, a bad value, a dropped connection), deleting first
// would leave someone with zero split rules and no way back except
// re-entering everything by hand. Old and new rows briefly coexist under
// the same user_id in between, which is fine since only their own `id`s
// (captured up front) get removed at the end.
export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { percent } = await request.json();
  // Guard against exactly what let a malformed QA request wipe a real
  // user's split rules with zero replacement and no error: this used to
  // silently treat a missing/malformed `percent` field as "delete
  // everything, insert nothing." Reject instead -- an update should never
  // be able to zero out someone's rules by accident. To genuinely delete
  // all rules, a caller must explicitly send percent: [].
  if (!Array.isArray(percent)) {
    return Response.json({ error: "Request body must include a 'percent' array." }, { status: 400 });
  }
  const admin = supabaseAdmin();

  // A starting balance is someone declaring "I already had this much saved
  // in this category before PriorityPay." That can't exceed what's
  // actually sitting in the bank account it's linked to -- two categories
  // sharing one account (Savings + Wedding, say) can't each separately
  // claim more of that account's real balance than the account holds in
  // total. Since PUT replaces the whole rule set in one shot, `percent`
  // here already contains every row (unchanged ones included), so summing
  // startingBalance per accountId across just this payload is a complete
  // picture -- no need to merge with what's currently in the DB.
  const accountIds = [...new Set(percent.map((r) => r.accountId).filter(Boolean))];
  if (accountIds.length) {
    const { data: accountRows } = await admin
      .from("simple_accounts")
      .select("id, institution_name, account_name, mask, current_balance")
      .in("id", accountIds);
    const accountsById = Object.fromEntries((accountRows || []).map((a) => [a.id, a]));

    const startingByAccount = {};
    percent.forEach((r) => {
      if (!r.accountId) return;
      const sb = r.startingBalance === null || r.startingBalance === undefined || r.startingBalance === "" ? 0 : Number(r.startingBalance) || 0;
      if (!startingByAccount[r.accountId]) startingByAccount[r.accountId] = [];
      startingByAccount[r.accountId].push({ label: r.label, startingBalance: sb });
    });

    for (const [accountId, rows] of Object.entries(startingByAccount)) {
      const acct = accountsById[accountId];
      if (!acct) continue;
      const total = rows.reduce((s, r) => s + r.startingBalance, 0);
      const accountBalance = Number(acct.current_balance) || 0;
      if (total > accountBalance) {
        const overBy = total - accountBalance;
        const acctLabel = `${acct.institution_name} ${acct.account_name} •••• ${acct.mask}`;
        const others = rows.filter((r) => r.startingBalance > 0).map((r) => r.label).join(", ");
        return Response.json(
          {
            error:
              `Starting balances for ${acctLabel} add up to ${overBy > 0 ? "$" + overBy.toFixed(2) : ""} more than that ` +
              `account actually holds (${"$" + accountBalance.toFixed(2)} available, ${"$" + total.toFixed(2)} claimed across ` +
              `${others || "these categories"}). Lower one category's starting balance by that amount -- or move it from ` +
              `another category already linked to this account -- before saving.`,
          },
          { status: 400 }
        );
      }
    }
  }

  const { data: existingRows } = await admin
    .from("simple_split_rules_percent")
    .select("id")
    .eq("user_id", user.id);
  const oldIds = (existingRows || []).map((r) => r.id);

  if (percent?.length) {
    const rows = percent.map((r) => ({
      user_id: user.id,
      label: r.label,
      group_name: r.group || null,
      pct: Number(r.pct) || 0,
      cap: r.max === null || r.max === undefined || r.max === "" ? null : Number(r.max),
      balance_cap: r.balanceCap === null || r.balanceCap === undefined || r.balanceCap === "" ? null : Number(r.balanceCap),
      color: r.color,
      account_id: r.accountId || null,
      retirement_type: r.retirementType || null,
      starting_balance: r.startingBalance === null || r.startingBalance === undefined || r.startingBalance === "" ? null : Number(r.startingBalance),
      // Derived server-side from group + retirementType + label, same
      // reasoning as the original app: multiple distinct investment-flavored
      // categories (a brokerage AND a crypto exchange, say) get separate
      // tracking buckets instead of colliding under one generic type.
      investment_type: r.group === "Investments" && !r.retirementType ? investmentTypeFromLabel(r.label) : null,
    }));
    const { error } = await admin.from("simple_split_rules_percent").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (oldIds.length) {
    await admin.from("simple_split_rules_percent").delete().in("id", oldIds);
  }

  return Response.json({ ok: true });
}
