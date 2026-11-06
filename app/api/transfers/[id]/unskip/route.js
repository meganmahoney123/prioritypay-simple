import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { loadOwnTransfer, recomputeTransferStatus } from "@/lib/depositChecklist";

// Undo for "Skip this deposit": puts each line back to the exact status it
// had before the skip (status_before_skip). Lines that were deleted
// individually before the deposit was skipped have no status_before_skip
// and stay deleted.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { id } = await params;

  const transfer = await loadOwnTransfer(admin, user.id, id);
  if (!transfer) return Response.json({ error: "Deposit not found." }, { status: 404 });
  if (!transfer.skipped_at) return Response.json({ ok: true, notSkipped: true });

  const byPrevious = {};
  (transfer.simple_transfer_allocations || []).forEach((a) => {
    if (a.status === "skipped" && a.status_before_skip) (byPrevious[a.status_before_skip] ||= []).push(a.id);
  });
  for (const [status, ids] of Object.entries(byPrevious)) {
    const { error } = await admin
      .from("simple_transfer_allocations")
      .update({ status, status_before_skip: null })
      .in("id", ids);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  const { error: transferError } = await admin
    .from("simple_transfers")
    .update({ skipped_at: null, skip_reason: null })
    .eq("id", transfer.id);
  if (transferError) return Response.json({ error: transferError.message }, { status: 500 });

  await recomputeTransferStatus(admin, transfer.id);
  return Response.json({ ok: true });
}
