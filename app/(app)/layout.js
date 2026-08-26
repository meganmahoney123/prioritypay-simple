import { redirect } from "next/navigation";
import { getAuthedUser, supabaseAdmin } from "@/lib/supabaseServer";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }) {
  const user = await getAuthedUser();
  if (!user) redirect("/login");

  // Onboarding is the only thing that ever sets `onboarded: true` --
  // for anyone who signed up before payment was required this was already
  // true well before they could reach here, so this is a no-op for them.
  // For a brand-new signup it isn't set until they've actually completed
  // Stripe Checkout (see /api/onboarding/confirm-payment) -- gating here
  // means someone can't dodge that by navigating straight to /dashboard
  // mid-onboarding, before they've paid or finished setting anything up.
  const { data: profile } = await supabaseAdmin().from("simple_profiles").select("onboarded").eq("id", user.id).single();
  if (!profile?.onboarded) redirect("/onboarding");

  // Drives the "Sandbox mode" badge in AppShell -- reads the real PLAID_ENV
  // server-side (never exposed to the client otherwise) so the badge only
  // shows when we're actually pointed at Plaid Sandbox, instead of being
  // permanently on regardless of environment.
  const isSandbox = (process.env.PLAID_ENV || "sandbox") !== "production";
  return <AppShell isSandbox={isSandbox}>{children}</AppShell>;
}
