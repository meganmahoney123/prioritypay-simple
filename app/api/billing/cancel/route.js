import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient } from "@/lib/stripe";

// PHASE V: schedules cancellation at the end of the current billing
// period -- deliberately NOT an immediate cancel (Megan's call: someone
// already paid for this period, so access shouldn't be cut off early) and
// deliberately NOT account deletion (see app/api/account/delete for that
// separate, destructive flow). The account and all its data are untouched;
// only billing stops renewing.
//
// The Stripe update is the source of truth -- we also write
// cancel_at_period_end/subscription_status/current_period_end here
// (rather than waiting on the customer.subscription.updated webhook) so
// Settings reflects the change immediately instead of racing the webhook.
// The webhook (app/api/stripe/webhook) still fires and writes the same
// values shortly after, which is fine -- it's the same data either way.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("simple_profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return Response.json({ error: "No active subscription to cancel." }, { status: 400 });
  }

  try {
    const subscription = await stripeClient().subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    await admin
      .from("simple_profiles")
      .update({
        cancel_at_period_end: true,
        current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("id", user.id);

    return Response.json({ ok: true, currentPeriodEnd: subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null });
  } catch (err) {
    console.error("[billing/cancel] Stripe update failed", err.message);
    return Response.json({ error: "Couldn't cancel your subscription. Please try again or contact support." }, { status: 500 });
  }
}
