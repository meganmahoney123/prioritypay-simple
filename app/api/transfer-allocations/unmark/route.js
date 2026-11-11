import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { unconfirmAllocations } from "@/lib/depositChecklist";

// "Undo" on the On the way list: puts transfers that were marked as
// transferred (but have not landed) back on the Split My Deposits checklist.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.allocationIds) ? body.allocationIds.filter((x) => typeof x === "string") : [];
  if (!ids.length || ids.length > 200) {
    return Response.json({ error: "Choose which transfers to undo." }, { status: 400 });
  }

  const result = await unconfirmAllocations(admin, user.id, ids);
  if (result.error) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true });
}
