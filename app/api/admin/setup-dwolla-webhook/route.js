import { requireUser, unauthorized } from "@/lib/apiAuth";
import { dwollaClient } from "@/lib/dwolla";

// One-time setup utility -- creates the real Dwolla Webhook Subscription
// pointing at this app's own /api/dwolla/webhook route, so transfer status
// changes (settled/failed/cancelled) flow back automatically instead of us
// only ever knowing "we asked Dwolla to start a transfer." Until this
// exists, manual "Split $X now" still works, but the Plaid-deposit-webhook
// -> auto-split -> Dwolla-transfer chain never gets a completion/failure
// callback. Safe to call more than once -- checks for an existing
// subscription at the same URL first instead of creating a duplicate.
//
// Gated behind requireUser() plus a `key` query param that must match
// DWOLLA_WEBHOOK_SECRET itself, since this mutates a shared Dwolla sandbox
// *application* resource (one webhook subscription serves every user), not
// just the signed-in user's own data. Meant to be triggered once by hand,
// not linked from anywhere in the app's UI.
const WEBHOOK_URL = "https://prioritypay-simple.vercel.app/api/dwolla/webhook";

export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const secret = process.env.DWOLLA_WEBHOOK_SECRET;
  if (!secret || key !== secret) {
    return Response.json({ error: "Missing or invalid key." }, { status: 403 });
  }

  try {
    const client = dwollaClient();
    const existing = await client.get("webhook-subscriptions");
    const already = (existing.body._embedded?.["webhook-subscriptions"] || []).find((s) => s.url === WEBHOOK_URL);
    if (already) {
      return Response.json({ ok: true, alreadyExisted: true, id: already.id, paused: already.paused });
    }

    const res = await client.post("webhook-subscriptions", { url: WEBHOOK_URL, secret });
    const subUrl = res.headers.get("location");
    const id = subUrl?.split("/").pop();
    return Response.json({ ok: true, created: true, id, url: subUrl });
  } catch (err) {
    const dwollaError = err?.body || err?.message || String(err);
    console.error("Dwolla webhook-subscription setup failed:", dwollaError);
    return Response.json({ error: "Dwolla rejected the webhook subscription request.", detail: dwollaError }, { status: 400 });
  }
}
