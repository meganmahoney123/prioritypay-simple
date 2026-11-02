import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient, planForPriceId } from "@/lib/stripe";

// Register this URL (https://prioritysave.com/api/stripe/webhook) as a
// webhook endpoint in the Stripe dashboard (Developers > Webhooks),
// listening for the four events below. Verifies Stripe's signature
// before trusting the payload, using Stripe's own SDK helper instead of
// doing the HMAC comparison by hand.
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
        let subscription = null;
        try {
          subscription = await stripe.subscriptions.retrieve(session.subscription);
          // Look at every item on the subscription, not just the first one.
          const priceIds = (subscription.items?.data || []).map((i) => i?.price?.id).filter(Boolean);
          plan = priceIds.some((id) => planForPriceId(id) === "business") ? "business" : "simple";
          console.log("Stripe webhook: checkout completed", session.id, "prices", priceIds.join(","), "plan", plan);
        } catch (err) {
          console.error("Stripe webhook: could not resolve plan for session", session.id, err?.message);
        }

        // If this account already had a different Stripe subscription (for
        // example a standard plan, now upgrading to Business), end the old
        // one so the customer is not billed twice.
        try {
          const { data: existing } = await admin
            .from("simple_profiles")
            .select("stripe_subscription_id")
            .eq("stripe_customer_id", session.customer)
            .maybeSingle();
          const oldId = existing?.stripe_subscription_id;
          if (oldId && oldId !== session.subscription && String(oldId).startsWith("sub_")) {
            await stripe.subscriptions.cancel(oldId, { prorate: true });
            console.log("Stripe webhook: canceled replaced subscription", oldId);
          }
        } catch (err) {
          console.error("Stripe webhook: could not cancel previous subscription", err?.message);
        }

        const profileUpdate = {
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
          cancel_at_period_end: false,
        };
        if (plan) profileUpdate.plan = plan;
        // Newer Stripe API versions keep the period end on the item, older ones on the subscription.
        const periodEnd = subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end;
        if (periodEnd) {
          profileUpdate.current_period_end = new Date(periodEnd * 1000).toISOString();
        }

        const { error: updateError } = await admin
          .from("simple_profiles")
          .update(profileUpdate)
          .eq("stripe_customer_id", session.customer);
        if (updateError) {
          console.error("Stripe webhook: profile update failed", session.id, updateError.message);
          return Response.json({ error: "profile update failed" }, { status: 500 });
        }
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
      // Ignore events for a subscription that is no longer the account's current one
      // (e.g. the standard plan that was just replaced by Business).
      {
        const { data: current } = await admin
          .from("simple_profiles")
          .select("stripe_subscription_id")
          .eq("stripe_customer_id", subscription.customer)
          .maybeSingle();
        if (current?.stripe_subscription_id && current.stripe_subscription_id !== subscription.id) break;
      }
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
          current_period_end: (subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end)
            ? new Date((subscription.current_period_end ?? subscription.items.data[0].current_period_end) * 1000).toISOString()
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
