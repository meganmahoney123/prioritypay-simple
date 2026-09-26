import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient } from "@/lib/stripe";

// Stripe's own hosted billing portal -- lets a subscribed user update
// their card or cancel, without PriorityPay needing to build that UI
// itself. Requires a stripe_customer_id to already exist, which only
// happens after someone has been through /api/billing/checkout at least
// once.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("simple_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: "No billing account yet -- subscribe first." }, { status: 400 });
  }

  const origin = request.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://www.prioritypay.co";

  // Previously uncaught: if Stripe rejects this (most commonly because the
  // Customer Portal hasn't been activated/configured yet for this Stripe
  // account at https://dashboard.stripe.com/settings/billing/portal),
  // Stripe's client throws and this route returned a bare 500 HTML error
  // page instead of JSON -- the "Manage billing" button's res.json() call
  // then threw too, silently, so clicking it looked like it did nothing.
  // Catching it here and returning the real message lets the button show
  // what actually went wrong instead of failing invisibly.
  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/settings`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json(
      { error: err?.message || "Could not open the billing portal. Check that it's configured in Stripe." },
      { status: 500 }
    );
  }
}
