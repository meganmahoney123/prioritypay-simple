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

    await admin
      .from("simple_profiles")
      .update({ cancel_at_period_end: false })
      .eq("id", user.id);

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[billing/resume] Stripe update failed", err.message);
    return Response.json({ error: "Couldn't resume your subscription. Please try again or contact support." }, { status: 500 });
  }
}
