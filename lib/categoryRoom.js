// Guards the ONE invariant that actually matters for the "Categories here
// add up to $X more than this account's real balance" warning (see
// overCategorizedBy in app/api/allocations/account-balances/route.js): a
// category's ledger balance is supposed to represent real money sitting in
// its linked bank account, so the categorized total for any one account
// should never be allowed to exceed that account's real Plaid
// current_balance in the first place. Before this existed, only
// app/api/split-rules/route.js (starting balances) enforced that -- two
// other write paths could silently manufacture ledger money with nothing
// backing it:
//   1. POST /api/allocations/manual-contribution -- a one-time top-up to a
//      single category, previously accepted any positive amount with zero
//      check against the linked account's real balance.
//   2. POST /api/allocations/category-transfer -- crediting a destination
//      category (whether the source was another category or "Unallocated"
//      cash) with no check that the destination account actually had that
//      much real, uncategorized room left.
// Both now call checkAccountRoomForLabel before inserting a credit row.
// This can't catch every possible drift (a real bank balance can still
// drop on its own between Plaid syncs, from spending outside this app --
// see the comment on overCategorizedBy itself), but it closes off every
// write path THIS app controls from ever being the cause.
export async function checkAccountRoomForLabel(admin, userId, label, amountToAdd) {
  const { data: targetRule } = await admin
    .from("simple_split_rules_percent")
    .select("account_id")
    .eq("user_id", userId)
    .eq("label", label)
    .maybeSingle();

  // No linked account (e.g. a category never assigned a destination
  // account) -- nothing real to check the credit against, so let it
  // through same as before. Only categories tied to a real account can
  // ever trigger the "over the real balance" warning in the first place.
  if (!targetRule?.account_id) return { ok: true };
  const accountId = targetRule.account_id;

  const { data: account } = await admin
    .from("simple_accounts")
    .select("current_balance")
    .eq("id", accountId)
    .maybeSingle();
  if (!account || account.current_balance === null || account.current_balance === undefined) return { ok: true };
  const accountBalance = Number(account.current_balance) || 0;

  const { data: rules } = await admin
    .from("simple_split_rules_percent")
    .select("label, starting_balance")
    .eq("user_id", userId)
    .eq("account_id", accountId);
  const labels = (rules || []).map((r) => r.label);
  if (!labels.length) return { ok: true };

  const [{ data: allocRows }, { data: manualRows }, { data: withdrawalRows }] = await Promise.all([
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id, status)")
      .eq("simple_transfers.user_id", userId)
      .neq("status", "failed")
      .neq("status", "needs_approval")
      .in("label", labels),
    admin.from("simple_manual_contributions").select("label, amount").eq("user_id", userId).in("label", labels),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, source_type, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", userId)
      .eq("source_type", "category")
      .in("label", labels),
  ]);

  const byLabel = {};
  (rules || []).forEach((r) => {
    byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.starting_balance) || 0);
  });
  (allocRows || []).forEach((r) => {
    byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (manualRows || []).forEach((r) => {
    byLabel[r.label] = (byLabel[r.label] || 0) + (Number(r.amount) || 0);
  });
  (withdrawalRows || []).forEach((r) => {
    if (!r.label) return;
    byLabel[r.label] = (byLabel[r.label] || 0) - (Number(r.amount) || 0);
  });

  // Same clamp-at-zero convention as account-balances -- an already
  // overdrawn OTHER category in this account doesn't free up extra room,
  // it just doesn't count negatively against the total either.
  const categorized = Object.values(byLabel).reduce((s, v) => s + Math.max(0, v), 0);
  const room = Math.round((accountBalance - categorized) * 100) / 100;

  if (amountToAdd > room + 0.005) {
    return { ok: false, accountBalance, categorized: Math.round(categorized * 100) / 100, room: Math.max(0, room) };
  }
  return { ok: true };
}
