import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fireCloseoutTransfer } from "@/lib/closeoutTransfer";
import { checkAccountRoomForLabel } from "@/lib/categoryRoom";

// The One-Time Transfer tab (app/(app)/transfers/page.js) mostly does pure
// bookkeeping through /api/allocations/category-transfer -- fine when the
// source and destination category both live in the SAME bank account,
// since no real money needs to go anywhere. But when they live in
// DIFFERENT accounts (e.g. Wedding lives in Ally Savings, Maintenance
// lives in Capital One Savings), bookkeeping alone would leave the real
// bank balances unchanged while the ledger says the money moved -- exactly
// the "categorized total doesn't match the real account balance" problem
// this app is trying to prevent (see lib/categoryRoom.js). So this route
// is the real-money counterpart: it fires an actual Dwolla ACH transfer
// between the two real accounts (same mechanism as Close-Out's "top up"
// button, see lib/closeoutTransfer.js), THEN keeps the ledger accurate to
// what's ACTUALLY landed, not what was merely requested:
//   - Crediting `toLabel` does NOT happen immediately. ACH settlement
//     takes real banks 1-3 business days, and this app has already
//     learned the hard way that counting money before it's confirmed
//     causes a category's balance to say more than the real account has
//     -- the exact "over the real balance" bug lib/categoryRoom.js exists
//     to prevent. So the transfer_allocations row this creates starts at
//     status "needs_approval" (see initialStatus on fireCloseoutTransfer)
//     -- the SAME status every other pending-transfer row in this app
//     already uses, meaning it's automatically excluded from every
//     balance calculation until it flips to "completed", which happens
//     either the moment Dwolla's webhook confirms real settlement
//     (app/api/dwolla/webhook/route.js) or the person clicks "I sent
//     this" on the Dashboard's "Transfers waiting on you" card
//     (components/PendingTransfers.js, app/api/transfer-allocations/[id]/
//     confirm/route.js) -- both paths already existed for the automatic
//     paycheck-split flow; this reuses them as-is. If toLabel is null
//     (destination is Unallocated), no category is credited at all either
//     way -- the receiving account's real balance rising is enough for
//     Unallocated to reflect it once Plaid syncs.
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

  // Even though the credit won't count toward balances until confirmed
  // (see the file comment above), still check room against what's
  // ALREADY confirmed/settled for that account -- otherwise someone could
  // queue up several needs_approval transfers that, once they all settle,
  // push the account over its real balance anyway. This just moves the
  // same protection lib/categoryRoom.js provides everywhere else to the
  // moment before the ACH is even requested, not after.
  if (toLabel) {
    const room = await checkAccountRoomForLabel(admin, user.id, toLabel, amount);
    if (!room.ok) {
      return Response.json(
        {
          error: `That would put ${toLabel}'s account $${(amount - room.room).toFixed(2)} over its real balance ($${room.accountBalance.toFixed(2)}). Only $${room.room.toFixed(2)} is available to move in right now.`,
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

  return Response.json({ ok: true, transferId: result.transferId, dwollaTransferId: result.dwollaTransferId });
}
