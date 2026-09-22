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

  let subscription;
  try {
    subscription = await stripeClient().subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    // Only a failure here means the cancellation itself didn't happen --
    // this is the one case where it's correct to tell the user it failed.
    console.error("[billing/cancel] Stripe update failed", err.message);
    return Response.json({ error: "Couldn't cancel your subscription. Please try again or contact support." }, { status: 500 });
  }

  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  // Stripe is already the source of truth at this point -- the
  // subscription IS canceled. This local write is just so Settings
  // reflects it immediately instead of waiting on the webhook. If it
  // fails, don't tell the user the cancellation failed (it didn't); the
  // customer.subscription.updated webhook will still land shortly after
  // and write the same values, so the account self-corrects on its own.
  const { error: dbError } = await admin
    .from("simple_profiles")
    .update({
      cancel_at_period_end: true,
      current_period_end: currentPeriodEnd,
    })
    .eq("id", user.id);

  if (dbError) {
    console.error("[billing/cancel] Stripe cancellation succeeded but local profile sync failed -- webhook will reconcile", dbError.message);
  }

  return Response.json({ ok: true, currentPeriodEnd });
}
