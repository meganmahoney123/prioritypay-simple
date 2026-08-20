// Server-only. A simple per-user, per-calendar-month cap on advisor chat
// turns -- each turn calls the Anthropic API at least once (often 2-3
// times, once per tool-use round), and that's billed to PriorityPay's own
// API key regardless of who's chatting. Without a cap, one user (or a
// client-side bug that loops) could run up real, uncapped cost. See
// supabase/schema.sql's simple_advisor_usage table.
const DEFAULT_MONTHLY_CAP = 40;

export function advisorMonthlyCap() {
  const fromEnv = Number(process.env.ADVISOR_MONTHLY_MESSAGE_CAP);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_MONTHLY_CAP;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Read-only check -- never increments. Called BEFORE the Anthropic API is
// touched, so a user who's already at the cap costs nothing further.
export async function checkAdvisorUsage(admin, userId) {
  const month = currentMonthKey();
  const cap = advisorMonthlyCap();
  const { data } = await admin
    .from("simple_advisor_usage")
    .select("message_count")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  const used = data?.message_count || 0;
  return { month, cap, used, remaining: Math.max(0, cap - used), atCap: used >= cap };
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
