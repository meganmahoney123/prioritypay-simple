import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient, businessPriceId } from "@/lib/stripe";

// PHASE Q. Same mechanics as /api/billing/checkout, pointed at the
// Business Price instead -- separate route rather than a `?plan=`
// parameter on the existing one so the two checkout flows can diverge
// later (e.g. Business ever needing seats/quantity) without a branch in
// shared code. See lib/stripe.js's businessPriceId() and PHASE Q's schema
// comment for why plan is decided by the webhook off this Price id, not
// set here.
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
    line_items: [{ price: businessPriceId(), quantity: 1 }],
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
  });

  return Response.json({ url: session.url });
}
