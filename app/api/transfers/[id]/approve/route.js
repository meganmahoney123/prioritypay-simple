import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { confirmAllocations, loadOwnTransfer } from "@/lib/depositChecklist";

// "Approve split" on one deposit card: marks every line on this deposit
// that's still waiting on the user as transferred. Lines that stay in the
// deposit account were never waiting, so they're untouched.
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { id } = await params;

  const transfer = await loadOwnTransfer(admin, user.id, id);
  if (!transfer) return Response.json({ error: "Deposit not found." }, { status: 404 });
  if (transfer.skipped_at) return Response.json({ error: "This deposit is skipped. Undo the skip first." }, { status: 400 });

  const waitingIds = (transfer.simple_transfer_allocations || []).filter((a) => a.status === "needs_approval").map((a) => a.id);
  if (!waitingIds.length) return Response.json({ ok: true, confirmed: 0 });

  const result = await confirmAllocations(admin, user.id, waitingIds);
  if (result.error) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true, confirmed: waitingIds.length });
}
