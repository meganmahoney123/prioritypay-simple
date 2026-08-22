import { dwollaClient, fundingSourceUrl } from "@/lib/dwolla";
import { computeAllocations } from "@/lib/allocations";
import { isReadOnly, getBillingProfile } from "@/lib/subscription";
import { sendDepositAlertSms } from "@/lib/sms";

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// 'manual_approval' (the default) is what lets PriorityPay ship and work
// across ANY connected bank today, without waiting on Dwolla/any ACH
// originator's approval: PriorityPay calculates the split and tells the
// user exactly what to send and where, but never originates a transfer or
// holds standing authority over anyone's account. The user makes each
// transfer themselves and confirms it (see
// app/api/transfer-allocations/[id]/confirm/route.js). Flip to
// 'dwolla_auto' once Dwolla's platform approval comes through -- that's
// the ONLY thing that needs to change; everything upstream (webhook
// detection, computeAllocations, the UI) is identical either way, it's
// only what happens to a cross-account allocation that differs.
const EXECUTION_MODE = process.env.TRANSFER_EXECUTION_MODE === "dwolla_auto" ? "dwolla_auto" : "manual_approval";

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
    // Money only needs to actually move if there's somewhere for it to go
    // that isn't where it already landed. This check doesn't depend on
    // Dwolla at all -- in manual_approval mode we never touch Dwolla, so a
    // connected account with no dwolla_funding_source_id (e.g. Dwolla
    // isn't approved yet, or never will be for this account) still works
    // fine as a checklist destination.
    const needsMove = !readOnly && destAccount && destAccount.id !== sourceAccountId;

    let dwollaTransferId = null;
    let destAccountId = null;
    let status = "reserved";

    if (needsMove && EXECUTION_MODE === "dwolla_auto") {
      if (destAccount?.dwolla_funding_source_id) {
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
          destAccountId = destAccount.id;
        } catch (err) {
          status = "failed";
          failures.push({ label: rule.label, detail: err?.body || err?.message || String(err) });
        }
      }
    } else if (needsMove && EXECUTION_MODE === "manual_approval") {
      // No origination happens here -- PriorityPay never touches ACH in
      // this mode. This row just records what the split calculated so the
      // "Transfers waiting on you" checklist (see PendingTransfers
      // component) can tell the user what to send and where, and so this
      // becomes real, provable transaction history once we're ready to
      // hand it to a bank/ACH provider as proof of demand.
      status = "needs_approval";
      destAccountId = destAccount.id;
    }

    allocationRows.push({
      transfer_id: transfer.id,
      category_type: categoryType,
      label: rule.label,
      amount: amt,
      reserved_only: !needsMove,
      dwolla_transfer_id: dwollaTransferId,
      dest_account_id: destAccountId,
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

  // A transfer with nothing needing manual action (everything stayed put,
  // e.g. no accounts connected yet) is complete the instant it's recorded.
  // One with any 'needs_approval' row stays open until the user confirms
  // every line (see app/api/transfer-allocations/[id]/confirm/route.js,
  // which flips this to 'completed' once none remain).
  const hasPending = allocationRows.some((r) => r.status === "needs_approval");
  const finalStatus = failures.length ? "failed" : hasPending ? "needs_approval" : "completed";
  await admin.from("simple_transfers").update({ status: finalStatus }).eq("id", transfer.id);

  // Deposit-threshold text alert -- opt-in, set in Settings > Notifications.
  // Fires once per deposit, only when there's actually something waiting on
  // the user (hasPending), so someone doesn't get texted for a deposit that
  // needed no manual action (e.g. nothing connected yet, or it all stayed
  // in the account it landed in). Never allowed to fail the split itself --
  // a bad Twilio config or network blip here shouldn't turn a successful
  // split into an error response.
  if (hasPending) {
    try {
      const { data: notifyProfile } = await admin
        .from("simple_profiles")
        .select("phone_number, sms_notifications_enabled, sms_threshold")
        .eq("id", userId)
        .single();
      const threshold = Number(notifyProfile?.sms_threshold);
      const meetsThreshold = notifyProfile?.sms_threshold === null || notifyProfile?.sms_threshold === undefined
        ? false
        : total >= threshold;
      if (notifyProfile?.sms_notifications_enabled && notifyProfile?.phone_number && meetsThreshold) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prioritypay.co";
        await sendDepositAlertSms({
          phoneNumber: notifyProfile.phone_number,
          depositAmount: total,
          dashboardUrl: `${appUrl}/dashboard`,
        });
      }
    } catch (err) {
      console.error("[runSplit] deposit alert SMS failed (non-fatal)", err?.message || err);
    }
  }

  return { transferId: transfer.id, status: finalStatus, failures };
}
