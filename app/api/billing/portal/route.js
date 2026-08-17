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
  const session = await stripeClient().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/settings`,
  });

  return Response.json({ url: session.url });
}
