import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Forward-looking infrastructure: nothing renders a receipt viewer yet
// (no Tax Summary receipt viewer exists as of this writing), but this is
// the endpoint anything doing so later should call. The "receipts"
// Supabase Storage bucket is private (see app/api/withdrawals/receipt/route.js),
// so simple_withdrawals.receipt_url now holds a storage *path*, not a
// fetchable URL. This route resolves that path into a short-lived signed
// URL (5 minutes) on demand, after verifying the withdrawal belongs to
// the requesting user.
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { withdrawalId } = await params;
  const admin = supabaseAdmin();

  const { data: withdrawal, error } = await admin
    .from("simple_withdrawals")
    .select("id, user_id, receipt_url")
    .eq("id", withdrawalId)
    .single();
  if (error || !withdrawal) {
    return Response.json({ error: "Withdrawal not found." }, { status: 404 });
  }
  if (withdrawal.user_id !== user.id) {
    return Response.json({ error: "Not found." }, { status: 404 });
  }
  if (!withdrawal.receipt_url) {
    return Response.json({ error: "No receipt attached to this withdrawal." }, { status: 404 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from("receipts")
    .createSignedUrl(withdrawal.receipt_url, 300);
  if (signError || !signed?.signedUrl) {
    return Response.json({ error: signError?.message || "Could not generate signed URL." }, { status: 500 });
  }

  return Response.json({ url: signed.signedUrl });
}
