import { computeAllocations } from "@/lib/allocations";
import { isReadOnly, getBillingProfile } from "@/lib/subscription";
import { accountLabel } from "@/lib/accountLabel";
import { applyDepositType, guessDepositType, isDepositType } from "@/lib/depositTypes";

// A never-matching uuid, so ".neq('transfer_id', x)" is always valid.
const NO_ID = "00000000-0000-0000-0000-000000000000";

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// Works out what a deposit splits into, without writing anything. Shared by
// runSplit (new deposits) and the deposit-type route (re-splitting a deposit
// after its type changes). `excludeTransferId` leaves one deposit's own lines
// out of the month and running totals so a re-split doesn't count itself.
export async function planSplit({ admin, userId, total, sourceAccountId, depositType = null, depositName = null, pfcDetailed = null, excludeTransferId = null }) {
  const { data: profile } = await admin.from("simple_profiles").select("*").eq("id", userId).single();
  const chosenType = isDepositType(depositType)
    ? depositType
    : guessDepositType({ profile, name: depositName, pfcDetailed });

  // No split_rules_fixed table in this project -- PrioritySave Simple is
  // percent-only, always.
  const [{ data: percentRows }, { data: accounts }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("*").eq("user_id", userId),
    admin.from("simple_accounts").select("id, current_balance, institution_name, account_name, mask").eq("user_id", userId),
  ]);

  const sourceAccount = (accounts || []).find((a) => a.id === sourceAccountId);
  if (!sourceAccount) {
    return { error: "That account is no longer connected.", status: 400 };
  }
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]));

  // Read-only trial gate (see lib/subscription.js): a lapsed, unpaid trial
  // doesn't fail the deposit outright -- the money already landed in the
  // user's own bank account regardless of what PrioritySave does next, so
  // there's nothing to "reject." Instead every category is forced through
  // the same reserved_only path already used for self-transfers below
  // (money stays exactly where it was deposited, nothing moves, but the
  // deposit and its would-be split are still recorded so the dashboard/
  // history stay accurate once they subscribe). The manual "Split $X now"
  // button (app/api/transfers/run) checks this same gate itself first, so
  // a person clicking it sees a real "please subscribe" message instead of
  // a transfer that quietly did nothing -- this check here is what also
  // covers the automatic Plaid-deposit webhook path, which has no one
  // watching for an error in real time.
  const billingProfile = await getBillingProfile(admin, userId);
  const readOnly = isReadOnly(billingProfile);

  // PHASE A redesign: Solo 401k / SEP IRA are now plain fixed/percent
  // categories, same as Rent or Savings -- no more IRS/income-based cap
  // clamping here. That money holds in whatever account is picked (see
  // lib/allocations.js) until the monthly close-out flow confirms real net
  // income and sends what's affordable to the real retirement account.
  // retirement_type is still tagged on every allocation row below purely
  // for bookkeeping, so close-out can see how much has piled up earmarked
  // for each type.
  const monthStartIso = monthStart();

  const { data: monthPercentAllocations } = await admin
    // Percent-category "Cap" is a MONTHLY TOTAL cap, not a per-deposit one
    // -- every deposit this month chips away at the same cap. Percent rows
    // don't have a stable type field the way retirement/investment rows do
    // (their `id` gets regenerated on every "Save split rules"), so this
    // matches on `label` instead, same anchor already used elsewhere in the
    // app (SavingsCapFields, PERCENT_MINIMUM_NOTE_LABELS) for exactly that
    // reason.
    .from("simple_transfer_allocations")
    .select("amount, label, simple_transfers!inner(user_id, created_at)")
    .eq("simple_transfers.user_id", userId)
    .gte("simple_transfers.created_at", monthStartIso)
    .neq("transfer_id", excludeTransferId || NO_ID)
    .neq("status", "failed")
    .neq("status", "skipped")
    .eq("category_type", "percent");

  const percentAllocatedThisMonthByLabel = {};
  (monthPercentAllocations || []).forEach((a) => {
    percentAllocatedThisMonthByLabel[a.label] = (percentAllocatedThisMonthByLabel[a.label] || 0) + (Number(a.amount) || 0);
  });

  const splitRules = {
    fixed: [],
    percent: applyDepositType((percentRows || []).map((r) => ({
      id: r.id,
      tier: r.tier === 1 || r.tier === 2 ? r.tier : null,
      pct: r.pct,
      max: r.cap,
      balanceCap: r.balance_cap,
      categoryCap: r.category_cap,
      accountId: r.account_id,
      label: r.label,
      retirementType: r.retirement_type || null,
      investmentType: r.investment_type || null,
    })), chosenType),
  };
  // `accountsById` (built earlier, from the same `accounts` fetch used to
  // validate `sourceAccount`) doubles as the lookup computeAllocations
  // needs for the balance-keyed cap below -- same Plaid balance freshness
  // this route already relies on elsewhere.

  // Translate the label-keyed monthly totals above into the id-keyed shape
  // computeAllocations expects (it only ever sees this deposit's rows, keyed
  // by their current id).
  const percentAllocatedThisMonth = {};
  splitRules.percent.forEach((r) => {
    percentAllocatedThisMonth[r.id] = percentAllocatedThisMonthByLabel[r.label] || 0;
  });

  // Running total per category (for the Total Category Cap), same math as
  // /api/allocations/balances: starting balance + every recorded allocation
  // (pending ones included, so two deposits before confirming can't overshoot)
  // + manual top-ups - withdrawals taken from the category. Only fetched when
  // some category actually has a Total Category Cap.
  const categoryTotals = {};
  if (splitRules.percent.some((r) => r.categoryCap !== null && r.categoryCap !== undefined)) {
    const byLabel = {};
    (percentRows || []).forEach((r) => {
      byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
    });
    const [{ data: allAllocs }, { data: manualRows }, { data: wdRows }] = await Promise.all([
      admin
        .from("simple_transfer_allocations")
        .select("label, amount, simple_transfers!inner(user_id)")
        .eq("simple_transfers.user_id", userId)
        .neq("transfer_id", excludeTransferId || NO_ID)
        .neq("status", "failed")
        .neq("status", "skipped"),
      admin.from("simple_manual_contributions").select("label, amount").eq("user_id", userId),
      admin
        .from("simple_withdrawal_allocations")
        .select("label, amount, simple_withdrawals!inner(user_id)")
        .eq("simple_withdrawals.user_id", userId)
        .eq("source_type", "category"),
    ]);
    (allAllocs || []).forEach((a) => { byLabel[a.label] = (byLabel[a.label] || 0) + (Number(a.amount) || 0); });
    (manualRows || []).forEach((a) => { byLabel[a.label] = (byLabel[a.label] || 0) + (Number(a.amount) || 0); });
    (wdRows || []).forEach((a) => { if (a.label) byLabel[a.label] = (byLabel[a.label] || 0) - (Number(a.amount) || 0); });
    splitRules.percent.forEach((r) => { categoryTotals[r.id] = byLabel[r.label] || 0; });
  }

  const { allocated } = computeAllocations(splitRules, total, percentAllocatedThisMonth, accountsById, categoryTotals);
  return { splitRules, allocated, accountsById, sourceAccount, readOnly, depositType: chosenType };
}

// Turns a plan into the allocation rows to store for one transfer.
export function buildAllocationRows({ plan, transferId, sourceAccountId }) {
  const { splitRules, allocated, accountsById, sourceAccount, readOnly } = plan;
  const allocationRows = [];

  function processCategory(rule, categoryType) {
    const amt = allocated[rule.id] || 0;
    if (amt <= 0) return;

    const destAccount = rule.accountId ? accountsById[rule.accountId] : null;
    // Money only needs to actually move if there's somewhere for it to go
    // that isn't where it already landed. PrioritySave never originates
    // that move itself in any case -- it just calculates it and records
    // it, so a connected account works fine as a checklist destination
    // with nothing further required of it.
    const needsMove = !readOnly && destAccount && destAccount.id !== sourceAccountId;

    let destAccountId = null;
    let status = "reserved";

    if (needsMove) {
      // This row just records what the split calculated so the
      // "Transfers waiting on you" checklist (see PendingTransfers
      // component) can tell the user what to send and where, and so this
      // becomes real, provable transaction history the user confirms
      // themselves once they've actually sent it.
      status = "needs_approval";
      destAccountId = destAccount.id;
    }

    allocationRows.push({
      transfer_id: transferId,
      category_type: categoryType,
      label: rule.label,
      amount: amt,
      // Snapshot of the split-rule-computed amount, kept even if `amount`
      // is later overridden by the user (see
      // app/api/transfer-allocations/[id]/amount/route.js) -- see
      // supabase/migrations/20260925_calculated_amount.sql.
      calculated_amount: amt,
      reserved_only: !needsMove,
      dwolla_transfer_id: null,
      dest_account_id: destAccountId,
      // Snapshotted here, once, so PendingTransfers.js's "Transfers
      // waiting on you" checklist can still say where this was headed
      // even after simple_accounts.id goes null (dest_account_id is "on
      // delete set null" -- PHASE G) because the account was later
      // disconnected or replaced. See PHASE U, supabase/schema.sql.
      dest_account_label: destAccountId ? accountLabel(destAccount) : null,
      // Same snapshot pattern as dest_account_label above, for the
      // account this deposit actually landed in -- the bank someone
      // needs to log into to send this category's slice of it onward.
      // See supabase/migrations/20260923_source_account_label.sql.
      source_account_id: sourceAccountId,
      source_account_label: sourceAccount
        ? accountLabel(sourceAccount)
        : null,
      status,
      retirement_type: rule.retirementType || null,
      investment_type: rule.investmentType || null,
    });
  }

  for (const r of splitRules.fixed) processCategory(r, "fixed");
  for (const r of splitRules.percent) processCategory(r, "percent");
  return allocationRows;
}
