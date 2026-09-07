// Shared billing-status helper, used by both API routes that need to gate
// an action (connecting a new Plaid account, firing a real Dwolla
// transfer) and by the UI (Settings billing section, dashboard banner).
//
// "Read-only" is deliberately NOT its own subscription_status value --
// see the PHASE C comment in supabase/schema.sql for why: a profile is
// read-only whenever its 30-day trial has passed with no active paid
// subscription, computed here at read time rather than flipped by a cron
// job or extra webhook event the instant a trial expires.
export function isReadOnly(profile) {
  if (!profile) return false;
  if (profile.subscription_status === "active") return false;
  if (!profile.trial_ends_at) return false;
  return new Date(profile.trial_ends_at).getTime() < Date.now();
}

// Fetches just the billing-relevant profile fields for a user. Used by
// API routes that need to gate an action without pulling (or having
// callers duplicate the shape of) the whole profile row.
export async function getBillingProfile(admin, userId) {
  const { data } = await admin
    .from("simple_profiles")
    .select("subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id")
    .eq("id", userId)
    .single();
  return data;
}

export function readOnlyError() {
  return Response.json(
    {
      error: "read_only",
      message: "Your 30-day free trial has ended. Subscribe to reconnect accounts or resume transfers.",
    },
    { status: 402 }
  );
}

// Business tier gate (PHASE Q). Deliberately its own check, not folded
// into isReadOnly() -- a Simple-plan subscriber in good standing is not
// read-only, but still isn't entitled to entities/QuickBooks. Mirrors
// isReadOnly()'s shape: read `plan` at request time, no cron/webhook
// needs to eagerly flip anything.
export function isBusinessPlan(profile) {
  if (!profile) return false;
  if (profile.subscription_status !== "active") return false;
  return profile.plan === "business";
}

export function businessPlanRequiredError() {
  return Response.json(
    {
      error: "business_plan_required",
      message: "This feature is part of the PriorityPay Business plan.",
    },
    { status: 402 }
  );
}

// Same shape as getBillingProfile(), plus the one extra column business-
// tier routes need. Kept separate rather than widening
// getBillingProfile() itself, since most callers of that one don't care
// about plan.
export async function getBusinessBillingProfile(admin, userId) {
  const { data } = await admin
    .from("simple_profiles")
    .select("subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id, plan")
    .eq("id", userId)
    .single();
  return data;
}
