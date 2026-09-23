// Shared by both PHASE B close-out money-moving actions: the one-click
// "send this to my real Solo 401k/SEP IRA" button (app/api/closeout/[period]/contribute)
// and the generic "pull more into an account" top-up (app/api/closeout/[period]/transfer,
// e.g. adding extra to Tax Reserve), plus the One-Time Transfer tab's
// cross-account flow (app/api/allocations/execute-real-transfer). All three
// are a single ad-hoc transfer between two of the user's own already-linked
// accounts -- PriorityPay never originates it itself, it just records what
// was requested, the same way lib/runSplit.js records a split leg -- one
// `transfers` row (trigger: 'closeout') and one `transfer_allocations` row
// -- so anything already built to total up transfer_allocations by
// retirement_type or label (monthly reminders, YTD contribution tracking)
// picks these up for free with no special-casing.
export async function fireCloseoutTransfer({
  admin,
  userId,
  fromAccountId,
  toAccountId,
  amount,
  label,
  retirementType = null,
  // Every transfer through here is something the user needs to actually
  // go send themselves -- PriorityPay only calculates and records it, it
  // never moves the money -- so this always lands as "needs_approval":
  // every balance-reading route already excludes needs_approval rows (see
  // lib/categoryRoom.js), and it's exactly the status that flips to
  // "completed" the moment the person clicks "I sent this" on the
  // Dashboard's Pending Transfers card (see
  // app/api/transfer-allocations/[id]/confirm/route.js).
  initialStatus = "needs_approval",
  categoryType = "closeout",
}) {
  const amt = Number(amount);
  if (!amt || amt <= 0) return { error: "Enter an amount greater than $0.", status: 400 };
  if (!fromAccountId || !toAccountId) return { error: "Choose both accounts.", status: 400 };
  if (fromAccountId === toAccountId) return { error: "Choose two different accounts.", status: 400 };

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask")
    .eq("user_id", userId)
    .in("id", [fromAccountId, toAccountId]);
  const accountsById = Object.fromEntries((accounts || []).map((a) => [a.id, a]));
  if (!accountsById[fromAccountId] || !accountsById[toAccountId]) {
    return { error: "One of these accounts is no longer connected.", status: 400 };
  }

  const { data: transfer, error: transferError } = await admin
    .from("simple_transfers")
    .insert({ user_id: userId, source_amount: amt, status: initialStatus, trigger: "closeout" })
    .select("id")
    .single();
  if (transferError) return { error: transferError.message, status: 500 };

  const sourceAccount = accountsById[fromAccountId];

  await admin.from("simple_transfer_allocations").insert({
    transfer_id: transfer.id,
    category_type: categoryType,
    label: label || "Close-out transfer",
    amount: amt,
    reserved_only: false,
    dwolla_transfer_id: null,
    status: initialStatus,
    retirement_type: retirementType,
    dest_account_id: toAccountId,
    source_account_id: fromAccountId,
    // Snapshotted here, once, same reasoning/pattern as dest_account_label
    // in lib/runSplit.js -- so the "which bank do I log into to send
    // this" popup/banner can still say exactly where a real transfer came
    // from even after simple_accounts.id goes null (source_account_id is
    // "on delete set null", same as dest_account_id) because the account
    // was later disconnected or replaced. See
    // supabase/migrations/20260923_source_account_label.sql.
    source_account_label: `${sourceAccount.institution_name} ${sourceAccount.account_name} •••• ${sourceAccount.mask}`,
  });

  return { ok: true, transferId: transfer.id };
}
