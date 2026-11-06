import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { confirmAllocations } from "@/lib/depositChecklist";

// "Approve all splits" on the transfer checklist (components/PendingTransfers.js):
// marks every line still waiting on this user as transferred. Confirmed one
// category group at a time (same label + from/to accounts, the same rows the
// card shows), so each group gets its own confirm_batch_id and it stays on
// record which deposits each single bank transfer covered.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: waiting, error } = await admin
    .from("simple_transfer_allocations")
    .select("id, label, dest_account_id, source_account_id, simple_transfers!inner(user_id, skipped_at)")
    .eq("simple_transfers.user_id", user.id)
    .is("simple_transfers.skipped_at", null)
    .eq("status", "needs_approval");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const groups = new Map();
  (waiting || []).forEach((a) => {
    const key = `${a.label}::${a.dest_account_id || ""}::${a.source_account_id || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a.id);
  });

  let confirmed = 0;
  for (const ids of groups.values()) {
    const result = await confirmAllocations(admin, user.id, ids);
    if (result.error) {
      return Response.json({ error: result.error, confirmed }, { status: result.status });
    }
    confirmed += ids.length;
  }
  return Response.json({ ok: true, confirmed, groups: groups.size });
}
