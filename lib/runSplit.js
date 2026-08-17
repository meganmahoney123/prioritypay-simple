import { dwollaClient, fundingSourceUrl } from "@/lib/dwolla";
import { computeAllocations } from "@/lib/allocations";
import { isReadOnly, getBillingProfile } from "@/lib/subscription";

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// Core split-and-transfer logic, shared by two callers:
//  - the manual "Split $X now" button (app/api/transfers/run), which
//    already knows userId from the signed-in session, and
//  - the automatic Plaid deposit webhook (app/api/plaid/webhook), which
//    resolves userId itself by looking up which account a newly-posted
//    transaction belongs to.
// Neither caller's auth mechanism belongs in here -- this just takes an
// already-trusted userId and does the actual work: compute allocations,
// record the deposit, and fire a real Dwolla transfer for every category
// whose account differs from where the deposit landed.
//
// `plaidTransactionId` is set only by the webhook path, and doubles as an
// idempotency key (a unique index on transfers.plaid_transaction_id) so a
// duplicate webhook delivery for the same transaction can't split the same
// deposit twice.
export async function runSplit({
  admin,
  userId,
  amount,
  sourceAccountId,
  trigger = "manual",
  plaidTransactionId = null,
}) {
  const total = Number(amount);
  if (!total || total <= 0) {
    return { error: "Enter an amount greater than $0.", status: 400 };
  }
  if (!sourceAccountId) {
    return { error: "Choose which linked account this deposit landed in.", status: 400 };
  }

  // No split_rules_fixed table in this project -- PriorityPay Simple is
  // percent-only, always.
  const [{ data: percentRows }, { data: accounts }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("*").eq("user_id", userId),
    admin.from("simple_accounts").select("id, dwolla_funding_source_id, current_balance").eq("user_id", userId),
  ]);

  const sourceAccount = (accounts || []).find((a) => a.id === sourceAccountId);
  if (!sourceAccount?.dwolla_funding_source_id) {
    return { error: "That account isn't fully linked with Dwolla yet.", status: 400 };
  }
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]));

  // Read-only trial gate (see lib/subscription.js): a lapsed, unpaid trial
  // doesn't fail the deposit outright -- the money already landed in the
  // user's own bank account regardless of what PriorityPay does next, so
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
    .neq("status", "failed")
    .eq("category_type", "percent");

  const percentAllocatedThisMonthByLabel = {};
  (monthPercentAllocations || []).forEach((a) => {
    percentAllocatedThisMonthByLabel[a.label] = (percentAllocatedThisMonthByLabel[a.label] || 0) + (Number(a.amount) || 0);
  });

  const splitRules = {
    fixed: [],
    percent: (percentRows || []).map((r) => ({
      id: r.id,
      pct: r.pct,
      max: r.cap,
      balanceCap: r.balance_cap,
      accountId: r.account_id,
      label: r.label,
      retirementType: r.retirement_type || null,
      investmentType: r.investment_type || null,
    })),
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

  const { allocated } = computeAllocations(splitRules, total, percentAllocatedThisMonth, accountsById);

  const { data: transfer, error: transferError } = await admin
    .from("simple_transfers")
    .insert({
      user_id: userId,
      source_amount: total,
      status: "processing",
      trigger,
      plaid_transaction_id: plaidTransactionId,
    })
    .select("id")
    .single();
  if (transferError) {
    // Unique violation on plaid_transaction_id means this exact deposit was
    // already processed (e.g. a duplicate webhook delivery) -- not a real
    // error, just a no-op.
    if (transferError.code === "23505") {
      return { skipped: true, reason: "Already processed." };
    }
    return { error: transferError.message, status: 500 };
  }

  const allocationRows = [];
  const failures = [];

  async function processCategory(rule, categoryType) {
    const amt = allocated[rule.id] || 0;
    if (amt <= 0) return;

    const destAccount = rule.accountId ? accountsById[rule.accountId] : null;
    const canMove = !readOnly && destAccount?.dwolla_funding_source_id && destAccount.id !== sourceAccountId;

    let dwollaTransferId = null;
    let status = "reserved";

    if (canMove) {
      try {
        const res = await dwollaClient().post("transfers", {
          _links: {
            source: { href: fundingSourceUrl(sourceAccount.dwolla_funding_source_id) },
            destination: { href: fundingSourceUrl(destAccount.dwolla_funding_source_id) },
          },
          amount: { currency: "USD", value: amt.toFixed(2) },
        });
        const location = res.headers.get("location");
        dwollaTransferId = location ? location.split("/").pop() : null;
        status = "processing";
      } catch (err) {
        status = "failed";
        failures.push({ label: rule.label, detail: err?.body || err?.message || String(err) });
      }
    }

    allocationRows.push({
      transfer_id: transfer.id,
      category_type: categoryType,
      label: rule.label,
      amount: amt,
      reserved_only: !canMove,
      dwolla_transfer_id: dwollaTransferId,
      status,
      retirement_type: rule.retirementType || null,
      investment_type: rule.investmentType || null,
    });
  }

  for (const r of splitRules.fixed) await processCategory(r, "fixed");
  for (const r of splitRules.percent) await processCategory(r, "percent");

  if (allocationRows.length) {
    await admin.from("simple_transfer_allocations").insert(allocationRows);
  }

  const finalStatus = failures.length ? "failed" : "processing";
  await admin.from("simple_transfers").update({ status: finalStatus }).eq("id", transfer.id);

  return { transferId: transfer.id, status: finalStatus, failures };
}
