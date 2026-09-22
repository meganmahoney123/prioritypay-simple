import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient } from "@/lib/stripe";

// PHASE V: undoes a scheduled cancellation (app/api/billing/cancel) any
// time before the period actually ends -- Stripe still has the
// subscription live in that window (cancel_at_period_end just means "at
// the next renewal, don't"), so this is a plain update, not a new
// checkout/resubscribe.
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
    return Response.json({ error: "No subscription to resume." }, { status: 400 });
  }

  try {
    await stripeClient().subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  } catch (err) {
    // Only a failure here means the resume itself didn't happen.
    console.error("[billing/resume] Stripe update failed", err.message);
    return Response.json({ error: "Couldn't resume your subscription. Please try again or contact support." }, { status: 500 });
  }

  // Stripe already reflects the resume at this point. Same reasoning as
  // billing/cancel: don't report failure to the user over a local sync
  // issue -- the webhook will reconcile simple_profiles shortly after.
  const { error: dbError } = await admin
    .from("simple_profiles")
    .update({ cancel_at_period_end: false })
    .eq("id", user.id);

  if (dbError) {
    console.error("[billing/resume] Stripe resume succeeded but local profile sync failed -- webhook will reconcile", dbError.message);
  }

  return Response.json({ ok: true });
}
