import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the Dashboard's "Transfers waiting on you" checklist (see
// components/PendingTransfers.js) -- every transfer that still has at
// least one allocation sitting in 'needs_approval' (see
// TRANSFER_EXECUTION_MODE in lib/runSplit.js). Returns dest_account_id per
// allocation rather than embedding the joined account row, matching the
// existing accountsById pattern used by AccountBalances/Dashboard -- the
// component is passed the same /api/accounts list it already fetches and
// merges the two client-side.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: transfers, error } = await admin
    .from("simple_transfers")
    .select(
      "id, source_amount, created_at, status, simple_transfer_allocations(id, label, amount, status, dest_account_id)"
    )
    .eq("user_id", user.id)
    .eq("status", "needs_approval")
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ transfers: transfers || [] });
}
