import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Powers the Dashboard's "Transfers waiting on you" checklist (see
// components/PendingTransfers.js). Returns individual allocation rows,
// not transfers -- previously this selected whole transfers still sitting
// at status='needs_approval', but that broke the moment an allocation
// moved to 'in_transit': once every line on a transfer is off
// 'needs_approval', the parent transfer flips to 'completed' (see
// confirm/skip routes), which would silently drop an in-transit line from
// the checklist before it's actually settled. Selecting allocations
// directly, filtered on their OWN status, keeps 'in_transit' rows visible
// until lib/reconcileTransfers.js (or a manual override) settles them.
//
// This also naturally supports combining the same category across
// multiple still-open deposits into one running total -- see
// components/PendingTransfers.js's groupByCategory, which is what the flat
// shape here is for (grouping by transfer_id would fight that).
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: allocations, error } = await admin
    .from("simple_transfer_allocations")
    .select("id, label, amount, status, dest_account_id, confirmed_at, simple_transfers!inner(id, source_amount, created_at, user_id)")
    .eq("simple_transfers.user_id", user.id)
    .in("status", ["needs_approval", "in_transit"]);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ allocations: allocations || [] });
}
