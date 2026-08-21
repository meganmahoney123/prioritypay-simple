import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Register this URL (https://prioritypay.co/api/dwolla/webhook) as a
// Webhook Subscription in the Dwolla dashboard so transfer status changes
// (settled, failed, cancelled) flow back to us instead of us only ever
// knowing "we asked Dwolla to start a transfer." Verifies Dwolla's HMAC
// signature before trusting the payload.
export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("x-request-signature-sha-256");
  const secret = process.env.DWOLLA_WEBHOOK_SECRET;

  // Fail CLOSED, not open: this endpoint updates transfer status straight
  // from the payload's topic/resourceId with no other check, so an
  // unverified request lets anyone mark a real transfer "completed" (or
  // "failed") from the outside. The previous `if (secret && signature)`
  // guard skipped verification entirely whenever either was missing --
  // meaning if DWOLLA_WEBHOOK_SECRET was ever unset in production, this
  // endpoint would silently accept and trust any payload. Matches how
  // app/api/stripe/webhook/route.js already does this (constructEvent
  // throws on a bad/missing signature) -- same standard, applied here.
  if (!secret) {
    console.error("Dwolla webhook: DWOLLA_WEBHOOK_SECRET is not configured -- rejecting request.");
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 401 });
  }
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (expected !== signature) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const admin = supabaseAdmin();

  if (event.topic === "transfer_completed" || event.topic === "transfer_failed" || event.topic === "transfer_cancelled") {
    const dwollaTransferId = event.resourceId;
    const status = event.topic === "transfer_completed" ? "completed" : "failed";

    const { data: allocation } = await admin
      .from("simple_transfer_allocations")
      .update({ status })
      .eq("dwolla_transfer_id", dwollaTransferId)
      .select("transfer_id")
      .single();

    // Roll the parent deposit up to "completed" once every one of its
    // categories has settled; "failed" if any of them didn't.
    if (allocation) {
      const { data: siblings } = await admin
        .from("simple_transfer_allocations")
        .select("status")
        .eq("transfer_id", allocation.transfer_id);
      const statuses = (siblings || []).map((s) => s.status);
      let parentStatus = "processing";
      if (statuses.some((s) => s === "failed")) parentStatus = "failed";
      else if (statuses.every((s) => s === "completed" || s === "reserved")) parentStatus = "completed";
      await admin.from("simple_transfers").update({ status: parentStatus }).eq("id", allocation.transfer_id);
    }
  }

  return Response.json({ ok: true });
}
