import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient, priceId } from "@/lib/stripe";

// Creates (or reuses) a Stripe Customer for this user, then a Checkout
// Session for the $7/mo PriorityPay Subscription price.
//
// The trial itself is NOT modeled in Stripe (no trial_period_days on the
// subscription) -- PriorityPay's 30-day trial starts at signup
// (trial_ends_at, set once by the handle_new_simple_user() DB trigger,
// see supabase/schema.sql) and runs whether or not someone has ever hit
// this route. If Stripe also ran its own trial clock, the two could
// disagree (e.g. someone subscribes on day 25 of PriorityPay's trial --
// should Stripe give them another 30 days free?). Keeping them
// independent avoids that: checking out here always starts billing right
// away, and lib/subscription.js's isReadOnly() (PriorityPay's own
// trial_ends_at vs. subscription_status) is the only thing that decides
// whether someone actually needs to be here.
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
    line_items: [{ price: priceId(), quantity: 1 }],
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
  });

  return Response.json({ url: session.url });
}
