import { dwollaClient, fundingSourceUrl } from "@/lib/dwolla";
import { computeAllocations } from "@/lib/allocations";
import { isReadOnly, getBillingProfile } from "@/lib/subscription";
import { sendDepositAlertSms } from "@/lib/sms";
import { sendDepositAlertPush } from "@/lib/push";
import { sendDepositAlertEmail } from "@/lib/email";
import { TRANSFER_EXECUTION_MODE as EXECUTION_MODE } from "@/lib/executionMode";

// Text alerts are on hold while Twilio's A2P 10DLC business verification
// is stuck (see the "Deposit email alerts" card in app/(app)/settings/
// page.js, which replaced the phone-number UI for the time being) --
// email alerts (see sendDepositAlertEmail below) are standing in as the
// non-app notification channel until then. Flip this back to true the
// moment Twilio clears -- everything else (sendDepositAlertSms, the
// phone_number/sms_notifications_enabled columns, the onboarding/Settings
// phone UI) was left fully intact, not deleted, specifically so this is a
// one-line revert rather than rebuilding the feature.
const SMS_ALERTS_ENABLED = false;

function monthStart(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// See lib/executionMode.js for the full explanation of 'manual_approval'
// vs. 'dwolla_auto' -- the constant now lives there so the Plaid
// link-token routes can check it too, without pulling in everything this
// file imports.

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

  // Minimum deposit-split threshold (see PHASE I/PHASE N, supabase/schema.sql) --
  // only gates the AUTOMATIC Plaid-deposit path. Someone clicking "Split $X
  // now" has already decided this specific amount is worth splitting, so
  // the manual button always runs regardless of their threshold. This is
  // intentionally a skip, not a $0 transfer record -- a $20 refund below
  // threshold shouldn't clutter history with a no-op split.
  if (trigger === "auto_deposit") {
    const { data: thresholdProfile } = await admin
      .from("simple_profiles")
      .select("min_deposit_threshold")
      .eq("id", userId)
      .single();
    const threshold = Number(thresholdProfile?.min_deposit_threshold ?? 50);
    if (total < threshold) {
      return { skipped: true, reason: `Below minimum split threshold ($${threshold}).` };
    }
  }

  // No split_rules_fixed table in this project -- PriorityPay Simple is
  // percent-only, always.
  const [{ data: percentRows }, { data: accounts }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("*").eq("user_id", userId),
    admin.from("simple_accounts").select("id, dwolla_funding_source_id, current_balance").eq("user_id", userId),
  ]);

  const sourceAccount = (accounts || []).find((a) => a.id === sourceAccountId);
  if (!sourceAccount) {
    return { error: "That account is no longer connected.", status: 400 };
  }
  // dwolla_funding_source_id is only ever read below when actually
  // originating a real ACH transfer (EXECUTION_MODE === "dwolla_auto").
  // In manual_approval mode (the default -- see lib/executionMode.js)
  // PriorityPay never touches Dwolla for any account, so every real
  // account has a null dwolla_funding_source_id by design. Requiring it
  // here unconditionally used to block every split, automatic and
  // manual, for every account -- this only enforces it when the mode
  // that actually needs it is active.
  if (EXECUTION_MODE === "dwolla_auto" && !sourceAccount.dwolla_funding_source_id) {
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
        .select("phone_number, sms_notifications_enabled, sms_threshold, email_notifications_enabled, alert_email")
        .eq("id", userId)
        .single();
      // Deposit alerts are on by default (sms_notifications_enabled/
      // email_notifications_enabled both default to true -- see PHASE M
      // and PHASE Q, supabase/schema.sql), since this is the notification
      // that actually gets someone back into the app to act on their
      // split checklist. Still a real, respected toggle though -- Settings
      // lets someone turn it off. A never-configured (null) threshold
      // means every qualifying deposit alerts once enabled, same as a
      // literal $0 threshold. Both channels share this one threshold
      // column -- one dollar figure gates whichever channel(s) are
      // currently active, rather than tracking two separately.
      const threshold = notifyProfile?.sms_threshold === null || notifyProfile?.sms_threshold === undefined
        ? 0
        : Number(notifyProfile.sms_threshold);
      const meetsThreshold = total >= threshold;

      if (SMS_ALERTS_ENABLED && notifyProfile?.sms_notifications_enabled && notifyProfile?.phone_number && meetsThreshold) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prioritypay.co";
        await sendDepositAlertSms({
          phoneNumber: notifyProfile.phone_number,
          depositAmount: total,
          dashboardUrl: `${appUrl}/dashboard`,
        });
      }

      // Email alert -- standing in for SMS while Twilio's stuck (see
      // SMS_ALERTS_ENABLED above). Sent to alert_email if someone's set one
      // (see PHASE R, supabase/schema.sql -- e.g. a bookkeeper or
      // assistant's inbox instead of their own), otherwise falls back to
      // the account's own login email (auth.users, fetched via the admin
      // API since simple_profiles doesn't duplicate it) -- same
      // zero-required-typing default as before.
      if (notifyProfile?.email_notifications_enabled && meetsThreshold) {
        let toEmail = notifyProfile?.alert_email || null;
        if (!toEmail) {
          const { data: authUser } = await admin.auth.admin.getUserById(userId);
          toEmail = authUser?.user?.email;
        }
        if (toEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prioritypay.co";
          await sendDepositAlertEmail({
            toEmail,
            depositAmount: total,
            dashboardUrl: `${appUrl}/dashboard`,
          });
        }
      }
    } catch (err) {
      console.error("[runSplit] deposit alert SMS/email failed (non-fatal)", err?.message || err);
    }

    // Phase 3 push notification -- same trigger (hasPending), but its own
    // independent gate: no SMS toggle or threshold to respect here, since
    // registering a device token in the app (lib/native.js's
    // registerForPushNotifications) is itself the opt-in. Sends one push
    // per registered device -- someone can be signed into the app on more
    // than one phone. simple_push_tokens only has rows once both the
    // Aug 2026 migration has been run (see
    // supabase/migrations/20260826_simple_push_tokens.sql) and someone has
    // actually opened the app, so this is a genuine no-op everywhere else.
    try {
      const { data: pushTokens } = await admin.from("simple_push_tokens").select("token").eq("user_id", userId);
      if (pushTokens?.length) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prioritypay.co";
        await Promise.all(
          pushTokens.map((row) =>
            sendDepositAlertPush({
              token: row.token,
              depositAmount: total,
              dashboardUrl: `${appUrl}/dashboard`,
            })
          )
        );
      }
    } catch (err) {
      // Expected (and harmless) until the simple_push_tokens migration has
      // been run -- Postgres "relation does not exist" (42P01), same
      // tolerance app/api/push/register/route.js already has for this.
      console.error("[runSplit] deposit alert push failed (non-fatal)", err?.message || err);
    }
  }

  return { transferId: transfer.id, status: finalStatus, failures };
}
