import { dwollaClient } from "@/lib/dwolla";

// TEMPORARY diagnostic route -- checks whether a webhook subscription is
// actually registered on the Dwolla side for this app, since transfer
// status updates depend on Dwolla calling /api/dwolla/webhook. Gated by a
// throwaway token (not tied to any real secret) rather than a login, since
// this just needs one authenticated curl check. Delete this route file
// once confirmed -- it should not stay in production.
const DIAGNOSTIC_TOKEN = "pp-qa-check-7f2c9a";

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token");
  if (token !== DIAGNOSTIC_TOKEN) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const res = await dwollaClient().get("webhook-subscriptions");
    const subs = res.body?._embedded?.["webhook-subscriptions"] || [];
    return Response.json({
      count: subs.length,
      subscriptions: subs.map((s) => ({ id: s.id, url: s.url, paused: s.paused, created: s.created })),
    });
  } catch (err) {
    return Response.json({ error: err?.body || String(err) }, { status: 500 });
  }
}
