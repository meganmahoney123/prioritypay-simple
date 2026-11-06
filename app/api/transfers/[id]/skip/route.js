import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { SKIP_REASONS, loadOwnTransfer } from "@/lib/depositChecklist";

// "Skip this deposit": removes the whole deposit from every total by
// marking each of its lines 'skipped' (every totals query excludes
// 'skipped'), remembering each line's previous status in
// status_before_skip so the unskip route can restore it exactly.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const reason = SKIP_REASONS.includes(body?.reason) ? body.reason : "Other";

  const transfer = await loadOwnTransfer(admin, user.id, id);
  if (!transfer) return Response.json({ error: "Deposit not found." }, { status: 404 });
  if (transfer.skipped_at) return Response.json({ ok: true, alreadySkipped: true });

  // Record the transfer-level skip first, so a failure partway through the
  // line updates below still leaves the deposit out of the checklist and
  // out of the deposit totals (both check skipped_at / status).
  const { error: transferError } = await admin
    .from("simple_transfers")
    .update({ status: "skipped", skipped_at: new Date().toISOString(), skip_reason: reason })
    .eq("id", transfer.id);
  if (transferError) return Response.json({ error: transferError.message }, { status: 500 });

  // Group lines by current status so each group is one update.
  const byStatus = {};
  (transfer.simple_transfer_allocations || []).forEach((a) => {
    if (a.status === "skipped") return; // deleted individually earlier: leave as is, nothing to restore
    (byStatus[a.status] ||= []).push(a.id);
  });
  for (const [status, ids] of Object.entries(byStatus)) {
    const { error } = await admin
      .from("simple_transfer_allocations")
      .update({ status: "skipped", status_before_skip: status })
      .in("id", ids);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
