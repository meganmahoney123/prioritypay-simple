import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Uploads a Close-Out expense receipt (image or PDF) to Supabase Storage
// and returns its storage path, to be stored as simple_withdrawals.receipt_url.
// PriorityPay Simple has no existing Supabase Storage usage anywhere else
// in the app to mirror -- this is the first. Requires a PRIVATE bucket
// named "receipts" to exist in the Supabase project already (create it
// once via the Supabase dashboard: Storage -> New bucket -> "receipts",
// NOT public); this route does not (and, with only the JS client
// available, reasonably cannot) create the bucket itself. If the bucket
// doesn't exist, upload fails with a clear error surfaced to the UI
// rather than silently dropping the receipt.
//
// NOTE: the bucket is private, so we intentionally do NOT call
// getPublicUrl here -- a "public" URL for a private bucket either 404s or
// requires auth anyway, and stashing it would be misleading. Instead we
// return (and the client stores, via simple_withdrawals.receipt_url) the
// raw storage path. The `receipt_url` column name is legacy; its content
// is now a storage path, not a URL. Fetch a short-lived signed URL on
// demand via GET /api/withdrawals/receipt/[withdrawalId] whenever the
// receipt actually needs to be displayed.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return Response.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = (file.name || "").split(".").pop() || "bin";
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from("receipts").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) {
    return Response.json({ error: `Receipt upload failed: ${uploadError.message}. (Does the "receipts" Storage bucket exist yet?)` }, { status: 500 });
  }

  // `url` here is the storage path, not a public URL -- kept as `url` for
  // client compatibility (the client just treats it as an opaque token to
  // pass through when saving the withdrawal), but it is NOT directly
  // fetchable. See GET /api/withdrawals/receipt/[withdrawalId] for signed
  // access.
  return Response.json({ url: path, path });
}
