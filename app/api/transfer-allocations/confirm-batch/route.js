import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { confirmAllocations } from "@/lib/depositChecklist";

// "Mark as transferred" from the multi-deposit summary: one bank transfer
// covering the same category across several deposits. Each underlying
// line is confirmed individually (so every deposit records its own part)
// and all of them share one confirm_batch_id.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.allocationIds) ? body.allocationIds.filter((x) => typeof x === "string") : [];
  if (!ids.length || ids.length > 200) {
    return Response.json({ error: "Choose which transfers to mark." }, { status: 400 });
  }

  const result = await confirmAllocations(admin, user.id, ids);
  if (result.error) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true, batchId: result.batchId, deposits: result.transferIds.length });
}
