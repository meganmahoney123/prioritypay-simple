import { dwollaClient, fundingSourceUrl } from "@/lib/dwolla";

// Shared by both PHASE B close-out money-moving actions: the one-click
// "send this to my real Solo 401k/SEP IRA" button (app/api/closeout/[period]/contribute)
// and the generic "pull more into an account" top-up (app/api/closeout/[period]/transfer,
// e.g. adding extra to Tax Reserve). Both are a single ad-hoc Dwolla
// transfer between two of the user's own already-linked accounts, recorded
// the same way lib/runSplit.js records a split leg -- one `transfers` row
// (trigger: 'closeout') and one `transfer_allocations` row -- so anything
// already built to total up transfer_allocations by retirement_type or
// label (monthly reminders, YTD contribution tracking) picks these up for
// free with no special-casing.
export async function fireCloseoutTransfer({
  admin,
  userId,
  fromAccountId,
  toAccountId,
  amount,
  label,
  retirementType = null,
  // "needs_approval" instead of the default "processing" lets a caller
  // fire the real ACH transfer immediately WITHOUT the destination
  // category's ledger counting it yet -- every balance-reading route
  // already excludes needs_approval rows (see lib/categoryRoom.js), and
  // this status is already exactly what flips to "completed" the moment
  // either the Dwolla webhook confirms settlement or the person clicks
  // "I sent this" on the Dashboard's Pending Transfers card. Used by the
  // One-Time Transfer tab's cross-account real-transfer flow so the
  // Dashboard never shows money as landed before it actually has (see
  // app/api/allocations/execute-real-transfer/route.js).
  initialStatus = "processing",
  categoryType = "closeout",
}) {
  const amt = Number(amount);
  if (!amt || amt <= 0) return { error: "Enter an amount greater than $0.", status: 400 };
  if (!fromAccountId || !toAccountId) return { error: "Choose both accounts.", status: 400 };
  if (fromAccountId === toAccountId) return { error: "Choose two different accounts.", status: 400 };

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, dwolla_funding_source_id")
    .eq("user_id", userId);
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]));
  const source = accountsById[fromAccountId];
  const dest = accountsById[toAccountId];
  if (!source?.dwolla_funding_source_id || !dest?.dwolla_funding_source_id) {
    return { error: "One of these accounts isn't fully linked with Dwolla yet.", status: 400 };
  }

  const { data: transfer, error: transferError } = await admin
    .from("simple_transfers")
    .insert({ user_id: userId, source_amount: amt, status: initialStatus, trigger: "closeout" })
    .select("id")
    .single();
  if (transferError) return { error: transferError.message, status: 500 };

  let dwollaTransferId = null;
  let status = initialStatus;
  try {
    const res = await dwollaClient().post("transfers", {
      _links: {
        source: { href: fundingSourceUrl(source.dwolla_funding_source_id) },
        destination: { href: fundingSourceUrl(dest.dwolla_funding_source_id) },
      },
      amount: { currency: "USD", value: amt.toFixed(2) },
    });
    const location = res.headers.get("location");
    dwollaTransferId = location ? location.split("/").pop() : null;
  } catch (err) {
    await admin.from("simple_transfers").update({ status: "failed" }).eq("id", transfer.id);
    return { error: err?.body || err?.message || String(err), status: 500 };
  }

  await admin.from("simple_transfer_allocations").insert({
    transfer_id: transfer.id,
    category_type: categoryType,
    label: label || "Close-out transfer",
    amount: amt,
    reserved_only: false,
    dwolla_transfer_id: dwollaTransferId,
    status,
    retirement_type: retirementType,
    dest_account_id: toAccountId,
  });
  await admin.from("simple_transfers").update({ status }).eq("id", transfer.id);

  return { ok: true, transferId: transfer.id, dwollaTransferId };
}
