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
// button, see lib/closeoutTransfer.js), THEN keeps the ledger in sync:
//   - Crediting `toLabel` happens automatically as part of the real
//     transfer (a simple_transfer_allocations row, same as any other real
//     money movement) -- if toLabel is null (destination is Unallocated),
//     no category is credited at all; the receiving account's real balance
//     rising is enough for Unallocated to reflect it once Plaid syncs.
//   - Debiting `fromLabel`, if it's a tracked category, is recorded as a
//     manual_contributions row here (real money verifiably just left that
//     account for real, so there's no "room" check needed on a debit --
//     see checkAccountRoomForLabel's use only for credits).
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
