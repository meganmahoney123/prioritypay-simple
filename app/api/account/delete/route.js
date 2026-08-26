import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { stripeClient } from "@/lib/stripe";

// Self-service account deletion -- required by Apple for any app that
// supports account creation (App Store Review Guideline 5.1.1(v)); the
// prior state ("email us to delete your account") is a common rejection
// reason. This is the in-app equivalent.
//
// What actually deletes the data: every user-owned table in
// supabase/schema.sql (simple_accounts, simple_split_rules_percent,
// simple_transfers, simple_transfer_allocations, simple_retirement_accounts,
// simple_monthly_closeouts, simple_closeout_transactions,
// simple_business_financials, simple_advisor_usage, simple_push_tokens, and
// simple_profiles itself) is declared `references auth.users(id) on delete
// cascade` -- so deleting the Supabase auth user below is sufficient to
// remove every row tied to this person in one operation. No per-table
// deletes needed here; if a future table adds user_id without that same
// cascade, this route silently stops covering it, so any new user-owned
// table should keep that pattern.
//
// What this does NOT delete: the Plaid Item (bank connection) and Dwolla
// customer records on Plaid's/Dwolla's side. Those platforms are the
// system of record for their own data and have their own deletion/GDPR
// processes -- PriorityPay only ever held a reference (plaid_access_token,
// dwolla_customer_url), which is gone the moment simple_accounts /
// simple_dwolla_customers cascade-delete. This is the same boundary the
// privacy policy already describes for third-party processors.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();

  // Cancel any active Stripe subscription first -- deleting the Supabase
  // user doesn't touch Stripe at all, and leaving a subscription running
  // after someone deletes their account would keep billing them for a
  // product they can no longer sign into.
  const { data: profile } = await admin
    .from("simple_profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_subscription_id) {
    try {
      await stripeClient().subscriptions.cancel(profile.stripe_subscription_id);
    } catch (err) {
      // If it's already canceled/nonexistent, Stripe throws -- that's fine,
      // the goal (no more charges) is already true. Anything else, log and
      // continue: a failed Stripe cancel shouldn't block someone's right to
      // delete their account and data.
      console.warn("[account/delete] Stripe cancel failed, continuing with deletion", err.message);
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account/delete] deleteUser failed", error.message);
    return Response.json({ error: "Couldn't delete your account. Please try again or contact support." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
