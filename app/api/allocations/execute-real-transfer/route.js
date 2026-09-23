import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fireCloseoutTransfer } from "@/lib/closeoutTransfer";
import { checkAccountUnallocatedRoom } from "@/lib/categoryRoom";
import { refreshAccountBalance } from "@/lib/refreshAccountBalance";

// The One-Time Transfer tab (app/(app)/transfers/page.js) mostly does pure
// bookkeeping through /api/allocations/category-transfer -- fine when the
// source and destination category both live in the SAME bank account,
// since no real money needs to go anywhere. But when they live in
// DIFFERENT accounts (e.g. Wedding lives in Ally Savings, Maintenance
// lives in Capital One Savings), bookkeeping alone would leave the real
// bank balances unchanged while the ledger says the money moved -- exactly
// the "categorized total doesn't match the real account balance" problem
// this app is trying to prevent (see lib/categoryRoom.js). So this route
// is the real-money counterpart: it records the cross-account transfer the
// user needs to go make themselves (same mechanism as Close-Out's "top up"
// button, see lib/closeoutTransfer.js), THEN keeps the ledger accurate to
// what's ACTUALLY landed, not what was merely requested:
//   - Crediting `toLabel` does NOT happen immediately. The user still has
//     to actually send this transfer themselves and it can take a bank a
//     day or more to settle, and this app has already learned the hard way
//     that counting money before it's confirmed causes a category's
//     balance to say more than the real account has -- the exact "over the
//     real balance" bug lib/categoryRoom.js exists to prevent. So the
//     transfer_allocations row this creates starts at status
//     "needs_approval" (see initialStatus on fireCloseoutTransfer) -- the
//     SAME status every other pending-transfer row in this app already
//     uses, meaning it's automatically excluded from every balance
//     calculation until the person clicks "I sent this" on the
//     Dashboard's "Transfers waiting on you" card
//     (components/PendingTransfers.js, app/api/transfer-allocations/[id]/
//     confirm/route.js) -- the same path that already existed for the
//     automatic paycheck-split flow; this reuses it as-is. If toLabel is
//     null (destination is Unallocated), no category is credited at all
//     either way -- the receiving account's real balance rising is enough
//     for Unallocated to reflect it once Plaid syncs.
//   - Debiting `fromLabel`, if it's a tracked category, IS recorded
//     immediately as a manual_contributions row. A debit can only ever
//     shrink a category's ledger total, never push an account's
//     categorized total over its real balance, so there's no accuracy
//     risk in reflecting it right away -- and no "room" check is needed
//     on a debit either (checkAccountRoomForLabel only guards credits).
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const { fromAccountId, toAccountId, fromLabel, toLabel } = body;
  const amount = Number(body.amount) || 0;

  if (!fromAccountId || !toAccountId) return Response.json({ error: "Choose both accounts." }, { status: 400 });
  if (fromAccountId === toAccountId) return Response.json({ error: "Choose two different accounts." }, { status: 400 });
  if (amount <= 0) return Response.json({ error: "Amount must be greater than $0." }, { status: 400 });

  const admin = supabaseAdmin();

  // Ask Plaid for the SOURCE account's real balance right now, before the
  // room check below runs -- the user is about to be told to pull real
  // money out of it, so the limit it's checked against has to be the
  // bank's actual current balance, not whatever simple_accounts.
  // current_balance happened to cache the last time someone loaded
  // Accounts or Dashboard. Best-effort (see refreshAccountBalance) -- a
  // failed live check still leaves the room check running against the
  // last known balance rather than blocking the transfer outright.
  //
  // Deliberately NOT done for toAccountId, and NOT paired with a
  // checkAccountRoomForLabel destination check the way category-transfer
  // has one -- a real cross-account transfer can never over-allocate its
  // destination, because the credit and the cash arrive together, in the
  // same amount, from the same event. An account already fully "spoken
  // for" (categorized total == real balance, zero free room) is not a
  // problem for money about to be DEPOSITED into it -- there's nothing to
  // "fit into," the deposit makes its own room. A destination check here
  // was checking whether that room already existed BEFORE this transfer's
  // own cash arrives, which can never be true for a transfer that hasn't
  // landed yet, so it was blocking transfers into any fully-allocated
  // account regardless of amount -- exactly the "$499.50 over its real
  // balance" block a user hit for a routine $500 top-up. category-transfer's
  // destination check stays as-is: there, no new cash is arriving, so the
  // money genuinely has to already be sitting uncommitted in the account.
  await refreshAccountBalance(admin, fromAccountId);

  // The other half of the same protection: when the source is Unallocated
  // cash (fromLabel null) rather than a category, nothing above stops the
  // amount from exceeding what's ACTUALLY sitting uncommitted in
  // fromAccountId -- an account can show a $5,000 real balance with every
  // dollar of it already earmarked ($3,000 Retirement, $2,000 Tax Reserve),
  // leaving $0 truly unallocated, even though this is a real transfer
  // that's about to move real money out of the account. Skipped when the
  // source IS a category (fromLabel set) -- debiting a category can only
  // ever shrink its own balance, never manufacture room that wasn't there.
  if (!fromLabel) {
    const source = await checkAccountUnallocatedRoom(admin, user.id, fromAccountId, amount);
    if (!source.ok) {
      const named = source.otherLabels.length ? ` (${source.otherLabels.join(", ")})` : "";
      return Response.json(
        {
          error: `Only $${source.room.toFixed(2)} is actually unallocated in that account right now -- the rest is already set aside for other categories${named}. Transfer from one of those categories instead of Unallocated cash.`,
        },
        { status: 400 }
      );
    }
  }

  const result = await fireCloseoutTransfer({
    admin,
    userId: user.id,
    fromAccountId,
    toAccountId,
    amount,
    label: toLabel || "Unallocated (One-Time Transfer)",
    initialStatus: "needs_approval",
    categoryType: "one_time_transfer",
  });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });

  if (fromLabel) {
    await admin.from("simple_manual_contributions").insert({
      user_id: user.id,
      label: fromLabel,
      amount: -amount,
      note: body.note || `Sent to ${toLabel || "unallocated cash"} via a real transfer`,
      occurred_at: new Date().toISOString(),
    });
  }

  return Response.json({ ok: true, transferId: result.transferId });
}
