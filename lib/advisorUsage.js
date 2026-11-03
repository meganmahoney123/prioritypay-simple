// Server-only. A simple per-user, per-calendar-month cap on advisor chat
// turns -- each turn calls the Anthropic API at least once (often 2-3
// times, once per tool-use round), and that's billed to PrioritySave's own
// API key regardless of who's chatting. Without a cap, one user (or a
// client-side bug that loops) could run up real, uncapped cost. See
// supabase/schema.sql's simple_advisor_usage table.
const DEFAULT_MONTHLY_CAP = 40;

const BUSINESS_MONTHLY_CAP = 200;
export const OVERAGE_CENTS = 25;
export const OVERAGE_LIMITS_CENTS = [1000, 2500, 5000];

export function advisorMonthlyCap(plan) {
  const fromEnv = Number(process.env.ADVISOR_MONTHLY_MESSAGE_CAP);
  const base = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MONTHLY_CAP;
  return plan === "business" ? Math.max(base, BUSINESS_MONTHLY_CAP) : base;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Read-only check -- never increments. Called BEFORE the Anthropic API is
// touched, so a user who's already at the cap costs nothing further.
export async function checkAdvisorUsage(admin, userId) {
  const month = currentMonthKey();
  const { data: profile } = await admin
    .from("simple_profiles")
    .select("plan, stripe_customer_id, subscription_status, subscription_source")
    .eq("id", userId)
    .maybeSingle();
  const cap = advisorMonthlyCap(profile?.plan);
  // select("*") so this keeps working before the overage columns exist.
  const { data } = await admin
    .from("simple_advisor_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  const used = data?.message_count || 0;
  const overageCount = data?.overage_count || 0;
  const limitCents = data?.overage_limit_cents || 0;
  // Overage is only offered to paying web (Stripe) customers.
  const canOverage = !!profile?.stripe_customer_id && profile?.subscription_status === "active" && (profile?.subscription_source || "stripe") === "stripe";
  const atCap = used >= cap;
  const withinLimit = (overageCount + 1) * OVERAGE_CENTS <= limitCents;
  return {
    month, cap, used, remaining: Math.max(0, cap - used), atCap,
    canOverage, overageCount, limitCents,
    overageActive: atCap && canOverage && limitCents > 0 && withinLimit,
    overageLimitReached: atCap && canOverage && limitCents > 0 && !withinLimit,
    customerId: profile?.stripe_customer_id || null,
    overageItemId: data?.overage_item_id || null,
  };
}

// Records one paid extra message and keeps ONE pending Stripe invoice item
// for the month up to date, so the customer's next invoice shows a single
// line like "Extra tax savings chat messages: 7 x $0.25".
export async function recordOverage(admin, userId, usage, stripe) {
  const count = usage.overageCount + 1;
  const amount = count * OVERAGE_CENTS;
  const description = `Extra tax savings chat messages (${usage.month}): ${count} x $${(OVERAGE_CENTS / 100).toFixed(2)}`;
  let itemId = usage.overageItemId;
  try {
    if (itemId) {
      await stripe.invoiceItems.update(itemId, { amount, description });
    } else {
      throw new Error("no item");
    }
  } catch {
    // No item yet, or the earlier one was already invoiced: start a new one
    // that covers only what is still unbilled.
    const item = await stripe.invoiceItems.create({
      customer: usage.customerId, amount: OVERAGE_CENTS, currency: "usd",
      description: `Extra tax savings chat messages (${usage.month}): 1 x $${(OVERAGE_CENTS / 100).toFixed(2)}`,
    });
    itemId = item.id;
  }
  await admin.from("simple_advisor_usage").update({
    overage_count: count, overage_item_id: itemId, updated_at: new Date().toISOString(),
  }).eq("user_id", userId).eq("month", usage.month);
}

// Only called after a chat turn actually completes successfully -- a
// failed/errored turn (bad API key, Anthropic outage, etc.) doesn't burn
// part of the user's monthly allowance.
export async function incrementAdvisorUsage(admin, userId) {
  const month = currentMonthKey();
  const { data: existing } = await admin
    .from("simple_advisor_usage")
    .select("message_count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();

  await admin.from("simple_advisor_usage").upsert(
    {
      user_id: userId,
      month,
      message_count: (existing?.message_count || 0) + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,month" }
  );
}
