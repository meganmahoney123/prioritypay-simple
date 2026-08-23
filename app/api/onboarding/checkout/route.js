import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient, priceId } from "@/lib/stripe";

// The onboarding-specific counterpart to /api/billing/checkout -- same
// mechanics (create-or-reuse a Stripe Customer, start a Checkout Session
// for the $7/mo Price), just with success/cancel URLs that land back on
// the onboarding flow's Review step instead of Settings. `client_reference_id`
// is set to this user's id so /api/onboarding/confirm-payment can verify,
// server-side, that the session it's being asked to confirm actually
// belongs to whoever's asking -- not just any valid Stripe session id.
//
// New signups now pay before finishing onboarding at all (no more 30-day
// free trial for anyone who signs up from here on -- see the Review step
// in app/onboarding/page.js and PHASE C's comment in supabase/schema.sql
// for how existing trialing users are unaffected).
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("simple_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = stripeClient();
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("simple_profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://www.prioritypay.co";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId(), quantity: 1 }],
    success_url: `${origin}/onboarding?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/onboarding?paid=cancelled`,
  });

  return Response.json({ url: session.url });
}
