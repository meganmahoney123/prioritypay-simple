import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the "Transfer history" list on Split My Deposits: every deposit
// that has at least one line that actually landed (status completed),
// newest first, with each line's amount, destination and status.
// Skipped deposits are left out (they have their own undo list).
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("simple_transfers")
    .select(
      "id, source_amount, created_at, deposit_name, plaid_transaction_id, skipped_at, " +
        "simple_transfer_allocations(id, label, amount, status, reserved_only, dest_account_id, dest_account_label, confirmed_at)"
    )
    .eq("user_id", user.id)
    .is("skipped_at", null)
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const rows = (data || []).filter((t) =>
    (t.simple_transfer_allocations || []).some((a) => a.status === "completed" && !a.reserved_only)
  );

  const missing = rows.filter((t) => !t.deposit_name && t.plaid_transaction_id).map((t) => t.plaid_transaction_id);
  if (missing.length) {
    const { data: named } = await admin
      .from("simple_closeout_transactions")
      .select("plaid_transaction_id, name")
      .eq("user_id", user.id)
      .in("plaid_transaction_id", missing);
    const byId = Object.fromEntries((named || []).filter((n) => n.name).map((n) => [n.plaid_transaction_id, n.name]));
    rows.forEach((t) => {
      if (!t.deposit_name && byId[t.plaid_transaction_id]) t.deposit_name = byId[t.plaid_transaction_id];
    });
  }

  return Response.json({
    transfers: rows.map((t) => ({
      id: t.id,
      createdAt: t.created_at,
      sourceAmount: Number(t.source_amount) || 0,
      name: t.deposit_name || null,
      lines: (t.simple_transfer_allocations || [])
        .filter((a) => !a.reserved_only && a.status !== "skipped" && a.status !== "failed")
        .map((a) => ({
          id: a.id,
          label: a.label,
          amount: Number(a.amount) || 0,
          status: a.status,
          destAccountId: a.dest_account_id,
          destAccountLabel: a.dest_account_label,
          sentAt: a.confirmed_at,
        })),
    })),
  });
}
