import { supabaseAdmin } from "@/lib/supabaseServer";
import { planForProductId, statusForRevenueCatEvent } from "@/lib/revenuecat";

// Register this URL (https://www.prioritypay.co/api/revenuecat/webhook)
// in RevenueCat (Project Settings > Integrations > Webhooks), with the
// "Authorization header value" set to REVENUECAT_WEBHOOK_SECRET below --
// RevenueCat sends that exact string back as the Authorization header on
// every webhook call, which is what's checked here instead of an HMAC
// signature (RevenueCat doesn't sign payloads the way Stripe does; a
// shared-secret header is their documented verification method).
//
// This is the Apple-side counterpart to app/api/stripe/webhook/route.js
// and follows the same shape: event.app_user_id is our own Supabase user
// id (see lib/revenuecat.js), so there's no customer-id lookup needed the
// way the Stripe handler looks up by stripe_customer_id.
export async function POST(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return Response.json({ error: "Invalid webhook authorization." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const event = body?.event;
  if (!event) return Response.json({ error: "Malformed payload." }, { status: 400 });

  const userId = event.app_user_id;
  const status = statusForRevenueCatEvent(event.type);

  // Events we don't map to a status change (e.g. TEST, TRANSFER,
  // SUBSCRIPTION_PAUSED) are acknowledged and ignored rather than treated
  // as an error -- RevenueCat retries on anything but a 2xx.
  if (!userId || !status) return Response.json({ ok: true, ignored: true });

  const profileUpdate = {
    subscription_status: status,
    subscription_source: "apple",
    // PHASE V parity: a cancellation scheduled for period-end is still
    // "active" until EXPIRATION actually fires -- same as Stripe's
    // cancel_at_period_end handling in app/api/stripe/webhook.
    cancel_at_period_end: event.type === "CANCELLATION",
  };
  if (event.product_id) profileUpdate.plan = planForProductId(event.product_id);
  if (event.expiration_at_ms) {
    profileUpdate.current_period_end = new Date(event.expiration_at_ms).toISOString();
  }

  const admin = supabaseAdmin();
  await admin.from("simple_profiles").update(profileUpdate).eq("id", userId);

  return Response.json({ ok: true });
}
