import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { loadOwnTransfer } from "@/lib/depositChecklist";

// Lets someone correct whether a deposit is Business or Other income from
// Split My Deposits. Stored on the transfer (simple_transfers.source_kind).
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { id } = await params;

  const body = await request.json().catch(() => ({}));
  const kind = body?.sourceKind;
  if (kind !== "business" && kind !== "other") {
    return Response.json({ error: "Choose Business or Other." }, { status: 400 });
  }

  const transfer = await loadOwnTransfer(admin, user.id, id);
  if (!transfer) return Response.json({ error: "Deposit not found." }, { status: 404 });

  const { error } = await admin.from("simple_transfers").update({ source_kind: kind }).eq("id", transfer.id).eq("user_id", user.id);
  if (error) {
    const missing = /source_kind/i.test(error.message || "");
    return Response.json(
      { error: missing ? "This needs a one-time database update before it can be saved." : error.message },
      { status: 500 }
    );
  }
  return Response.json({ ok: true });
}
