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
        // PHASE T: figure out which plan this checkout was for by
        // reading the Price id off the underlying subscription's line
        // items -- the session payload itself doesn't include it.
        // Anything not the Business price falls back to "simple", which
        // also covers every pre-PHASE-T subscriber replaying this event
        // (e.g. a Stripe retry) without ever downgrading a real Business
        // subscriber by accident, since their price id still resolves
        // correctly either way.
        let plan = null;
        // PHASE V: hoisted out of the try block (was declared with `const`
        // inside it) so current_period_end below can still read it even
        // when the block itself did nothing but resolve `plan`.
        let subscription = null;
        try {
          subscription = await stripe.subscriptions.retrieve(session.subscription);
          const subscribedPriceId = subscription.items?.data?.[0]?.price?.id;
          plan = planForPriceId(subscribedPriceId);
        } catch (err) {
          console.error("Stripe webhook: could not resolve plan for session", session.id, err);
        }

        const profileUpdate = {
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
          // PHASE V: a fresh checkout is never mid-cancellation, and this
          // also covers someone re-subscribing after a previous
          // cancel_at_period_end -- see app/api/billing/cancel.
          cancel_at_period_end: false,
        };
        // Only write `plan` when it actually resolved -- a transient Stripe
        // API error must never silently downgrade a Business subscriber to
        // "simple". planForPriceId() already maps a genuine Simple checkout
        // to "simple", so skipping it here only affects the rare
        // couldn't-look-it-up case, leaving any existing plan untouched.
        if (plan) profileUpdate.plan = plan;
        // PHASE V: current_period_end mirrors Stripe's own field so
        // Settings can show the actual renewal/end date without a live API
        // call -- see supabase/migrations/20260908_cancel_at_period_end.sql.
        // Guarded the same way as `plan` above: a transient lookup failure
        // just leaves this column stale rather than writing garbage.
        if (subscription?.current_period_end) {
          profileUpdate.current_period_end = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await admin
          .from("simple_profiles")
          .update(profileUpdate)
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
      // PHASE V: cancel_at_period_end and current_period_end let the
      // Settings UI show "ending <date>" the whole stretch between someone
      // confirming cancellation (app/api/billing/cancel) and the period
      // actually running out -- subscription_status alone stays 'active'
      // that entire time. A `deleted` event means Stripe already tore the
      // subscription down, so cancel_at_period_end is meaningless by then;
      // hardcoding it false just keeps the column from being stuck `true`
      // forever on a canceled row.
      await admin
        .from("simple_profiles")
        .update({
          subscription_status: subscription.status,
          cancel_at_period_end: event.type === "customer.subscription.deleted" ? false : !!subscription.cancel_at_period_end,
          current_period_end: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null,
        })
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
