import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { checkAccountRoomForLabel } from "@/lib/categoryRoom";

// Moves money between any two of: a tracked category, or "Unallocated"
// cash in a specific account. Both `fromLabel` and `toLabel` are nullable
// -- null means that side is Unallocated -- but not both at once (moving
// uncommitted cash from one account to another isn't a category event
// this app tracks; see the check below). This single route now powers:
//   1. The Accounts page's "where did the extra money come from?" prompt
//      on an overdrawn category (components/AccountCategoryBreakdown.js)
//      -- always toLabel = the overdrawn category, fromLabel either
//      another category or null (Unallocated).
//   2. The One-Time Transfer tab (app/(app)/transfers/page.js) -- either
//      side can be a category or Unallocated, in any combination.
//
// A category side debits/credits a simple_manual_contributions row for
// that label (negative for the source, positive for the destination), so
// the money stays accounted for rather than appearing from or vanishing
// into nowhere. An Unallocated side has no ledger row of its own to
// touch at all -- Unallocated is always derived on the fly elsewhere
// (accountBalance minus whatever's categorized in that account, see
// /api/allocations/account-balances and /api/allocations/total-
// allocation), so crediting/debiting the OTHER (category) side is
// sufficient: crediting a category shrinks Unallocated in that account on
// the next fetch, and debiting one grows it back, with zero extra
// bookkeeping needed for the Unallocated side itself. `fromAccountId`/
// `toAccountId` are accepted purely for the note text when that side is
// Unallocated (which account's cash it is), since there's nothing else to
// record against.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const toLabel = body.toLabel ? String(body.toLabel).trim() : null;
  const fromLabel = body.fromLabel ? String(body.fromLabel).trim() : null;
  const amount = Number(body.amount) || 0;

  if (!fromLabel && !toLabel) {
    return Response.json({ error: "Pick at least one tracked category — moving cash between accounts isn't tracked here." }, { status: 400 });
  }
  if (fromLabel && fromLabel === toLabel) {
    return Response.json({ error: "Source and destination categories must be different." }, { status: 400 });
  }
  if (amount <= 0) return Response.json({ error: "Amount must be greater than $0." }, { status: 400 });

  const admin = supabaseAdmin();

  const labelsToCheck = [fromLabel, toLabel].filter(Boolean);
  const { data: ruleRows } = await admin
    .from("simple_split_rules_percent")
    .select("label, account_id")
    .eq("user_id", user.id)
    .in("label", labelsToCheck);
  const ruleByLabel = Object.fromEntries((ruleRows || []).map((r) => [r.label, r]));
  if ((toLabel && !ruleByLabel[toLabel]) || (fromLabel && !ruleByLabel[fromLabel])) {
    return Response.json({ error: "One of those categories no longer exists." }, { status: 404 });
  }

  // Never let a credit push the destination category's account past its
  // real, connected bank balance -- whether the credit came from another
  // category or from "Unallocated" cash, see lib/categoryRoom.js. Skipped
  // when fromLabel and toLabel share the same account: debiting one and
  // crediting the other there is a net-zero move for that account's
  // categorized total, so it can never be the cause of over-categorization
  // and shouldn't be blocked by a snapshot taken before the debit lands.
  // (A pure debit, toLabel === null, only ever removes money from the
  // ledger, so it never needs this check either.)
  const sameAccount = fromLabel && toLabel && ruleByLabel[fromLabel]?.account_id && ruleByLabel[fromLabel].account_id === ruleByLabel[toLabel]?.account_id;
  if (toLabel && !sameAccount) {
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

  const occurredAt = body.occurredAt || new Date().toISOString();
  const note =
    body.note ||
    (fromLabel && toLabel
      ? `Transferred from ${fromLabel}`
      : toLabel
      ? "Covered by unallocated cash in the account"
      : `Moved to unallocated cash in the account`);

  const rows = [];
  if (fromLabel) rows.push({ user_id: user.id, label: fromLabel, amount: -amount, note, occurred_at: occurredAt });
  if (toLabel) rows.push({ user_id: user.id, label: toLabel, amount, note, occurred_at: occurredAt });

  const { error } = await admin.from("simple_manual_contributions").insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true, source: fromLabel && toLabel ? "category" : fromLabel ? "to_unallocated" : "unallocated" });
}
