import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { checkAdvisorUsage, OVERAGE_LIMITS_CENTS } from "@/lib/advisorUsage";

// POST { limitCents } -- the customer opts in to paying for extra chat
// messages this month, up to a spending limit they choose. Web (Stripe)
// customers only. 0 turns it off.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const limitCents = Number(body.limitCents);
  if (limitCents !== 0 && !OVERAGE_LIMITS_CENTS.includes(limitCents)) {
    return Response.json({ error: "Choose one of the listed limits." }, { status: 400 });
  }
  const admin = supabaseAdmin();
  const usage = await checkAdvisorUsage(admin, user.id);
  if (!usage.canOverage) {
    return Response.json({ error: "Extra messages are available to subscribers who pay on the web." }, { status: 403 });
  }
  const { error } = await admin.from("simple_advisor_usage").upsert(
    { user_id: user.id, month: usage.month, message_count: usage.used, overage_limit_cents: limitCents, updated_at: new Date().toISOString() },
    { onConflict: "user_id,month" }
  );
  if (error) return Response.json({ error: "Could not save that. Please try again." }, { status: 500 });
  return Response.json({ ok: true, limitCents });
}
