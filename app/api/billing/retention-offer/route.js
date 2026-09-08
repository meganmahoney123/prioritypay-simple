import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient } from "@/lib/stripe";

// PHASE V: the one-time discount shown before a cancellation is confirmed
// (see the cancel flow in components/CancelSubscriptionCard.js). Applies a
// coupon created once in the Stripe dashboard (Product catalog > Coupons)
// -- its id lives in STRIPE_RETENTION_COUPON_ID, same "set once, not
// created on the fly" pattern as STRIPE_PRICE_ID (lib/stripe.js). Nothing
// here decides *what* the discount is (percent off, how many months) --
// that's entirely however the coupon itself is configured in Stripe.
//
// retention_offer_used gates this to once per account, ever -- otherwise
// someone could start a cancellation, take the discount, then immediately
// cancel again to fish for another one.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const couponId = process.env.STRIPE_RETENTION_COUPON_ID;
  if (!couponId) {
    console.error("[billing/retention-offer] STRIPE_RETENTION_COUPON_ID is not set");
    return Response.json({ error: "This offer isn't available right now." }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("simple_profiles")
    .select("stripe_subscription_id, retention_offer_used")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return Response.json({ error: "No active subscription to apply this to." }, { status: 400 });
  }
  if (profile.retention_offer_used) {
    return Response.json({ error: "You've already used this offer." }, { status: 400 });
  }

  try {
    await stripeClient().subscriptions.update(profile.stripe_subscription_id, {
      coupon: couponId,
      // Whatever cancellation was in progress is called off -- taking the
      // discount means staying subscribed.
      cancel_at_period_end: false,
    });

    await admin
      .from("simple_profiles")
      .update({ retention_offer_used: true, cancel_at_period_end: false })
      .eq("id", user.id);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/retention-offer] Stripe update failed", err.message);
    return Response.json({ error: "Couldn't apply the discount. Please try again or contact support." }, { status: 500 });
  }
}
