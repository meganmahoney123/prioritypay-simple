import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient } from "@/lib/stripe";

// Called once, right after Stripe Checkout redirects back to onboarding
// with ?paid=1&session_id=... -- confirms the payment actually succeeded
// and finalizes onboarding (onboarded: true) server-side, rather than
// waiting on the checkout.session.completed webhook (app/api/stripe/webhook)
// to eventually flip subscription_status, which can lag by several
// seconds and would otherwise leave someone staring at a blocked
// dashboard right after they just paid. The webhook still fires and
// performs the same update -- this is just the fast path, and both are
// idempotent against the same Stripe IDs, so there's no harm if both run.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { sessionId } = await request.json();
  if (!sessionId) return Response.json({ error: "Missing sessionId." }, { status: 400 });

  const stripe = stripeClient();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    return Response.json({ error: "Could not verify that checkout session." }, { status: 400 });
  }

  // client_reference_id was set to this user's id when the session was
  // created (see /api/onboarding/checkout) -- confirms this specific
  // session actually belongs to the signed-in user, not just any
  // syntactically valid Stripe session id someone happened to pass in.
  if (session.client_reference_id !== user.id) {
    return Response.json({ error: "This checkout session doesn't belong to your account." }, { status: 403 });
  }

  if (session.payment_status !== "paid" || !session.subscription) {
    return Response.json({ error: "Payment hasn't completed yet." }, { status: 402 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("simple_profiles")
    .update({
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_status: "active",
      onboarded: true,
    })
    .eq("id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
