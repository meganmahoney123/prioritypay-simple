import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient, planForPriceId } from "@/lib/stripe";

// Register this URL (https://prioritypay.co/api/stripe/webhook) as a
// webhook endpoint in the Stripe dashboard (Developers > Webhooks),
// listening for the four events below. Verifies Stripe's signature
// before trusting the payload -- same shape as the Dwolla webhook
// handler (app/api/dwolla/webhook/route.js), just using Stripe's own SDK
// helper instead of doing the HMAC comparison by hand.
//
// subscription_status is looked up by stripe_customer_id, not
// stripe_subscription_id, because checkout.session.completed fires before
// simple_profiles.stripe_subscription_id has ever been set (that column
// is written for the first time by *this* handler).
export async function POST(request) {
  const raw = await request.text();
  const signature = request.headers.get("stripe-signature");
  const stripe = stripeClient();
  const admin = supabaseAdmin();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: `Invalid signature: ${err.message}` }, { status: 401 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.mode === "subscription" && session.subscription) {
        // PHASE Q: figure out which plan this checkout was for by
        // reading the Price id off the underlying subscription's line
        // items -- the session payload itself doesn't include it.
        // Anything not the Business price falls back to "simple", which
        // also covers every pre-PHASE-Q subscriber replaying this event
        // (e.g. a Stripe retry) without ever downgrading a real Business
        // subscriber by accident, since their price id still resolves
        // correctly either way.
        let plan = "simple";
        try {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          const subscribedPriceId = subscription.items?.data?.[0]?.price?.id;
          plan = planForPriceId(subscribedPriceId);
        } catch (err) {
          console.error("Stripe webhook: could not resolve plan for session", session.id, err);
        }

        await admin
          .from("simple_profiles")
          .update({
            stripe_subscription_id: session.subscription,
            subscription_status: "active",
            plan,
          })
          .eq("stripe_customer_id", session.customer);
      }
      break;
    }

    // Covers renewals, cancellations-at-period-end taking effect, and
    // dunning outcomes -- Stripe's own `status` field maps directly onto
    // ours (trialing/active/past_due/canceled all mean the same thing on
    // both sides), so no translation table needed.
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      await admin
        .from("simple_profiles")
        .update({ subscription_status: subscription.status })
        .eq("stripe_customer_id", subscription.customer);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;
      if (invoice.customer) {
        await admin
          .from("simple_profiles")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", invoice.customer);
      }
      break;
    }

    default:
      break;
  }

  return Response.json({ ok: true });
}
