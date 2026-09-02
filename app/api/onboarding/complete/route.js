import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { investmentTypeFromLabel } from "@/lib/allocations";

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { persona, businessName, entityType, retirementProfile, splitRules, minDepositThreshold, notifications, finalize } =
    await request.json();
  const admin = supabaseAdmin();
  const rp = retirementProfile || {};
  const notif = notifications || {};
  // New signups now pay for their subscription before onboarding finishes
  // (see /api/onboarding/checkout + /api/onboarding/confirm-payment) --
  // the Review step calls this route with `finalize: false` right before
  // sending someone to Stripe Checkout, so every other answer gets saved
  // without marking them onboarded yet. confirm-payment is what actually
  // flips `onboarded: true`, once payment is confirmed. Omitting `false`
  // entirely (finalize left undefined) keeps the original one-step
  // behavior, so nothing else calling this route needs to change.

  // $50 is a hard floor (see PHASE N, supabase/schema.sql) -- clamped here
  // too, not just the DB constraint, so onboarding never surfaces a raw
  // Postgres constraint-violation error to someone finishing signup.
  const clampedMinDepositThreshold = Math.max(50, Number(minDepositThreshold) || 50);

  const { error: profileError } = await admin
    .from("simple_profiles")
    .update({
      persona,
      business_name: businessName,
      entity_type: entityType,
      income_handling: rp.incomeHandling,
      has_w2_plan: rp.hasW2Plan,
      w2_elective_deferral_ytd: rp.w2ElectiveDeferralYTD,
      age_bracket: rp.ageBracket,
      estimated_employee_payroll: rp.estimatedEmployeePayroll ?? null,
      min_deposit_threshold: clampedMinDepositThreshold,
      phone_number: notif.phoneNumber || null,
      // Only ever turns the flag OFF here -- never forces it back to true,
      // so someone who already opted out in Settings mid-onboarding (not
      // currently possible, but a real future path) never gets silently
      // re-enrolled just by finishing onboarding.
      ...(notif.phoneNumber ? { sms_notifications_enabled: Boolean(notif.smsEnabled) } : {}),
      // Email alerts standing in for SMS while Twilio's stuck (see
      // SMS_ALERTS_ENABLED, lib/runSplit.js) -- same "only ever set it
      // when the onboarding step actually asked" pattern as smsEnabled
      // above, keyed on whether `notifications.emailEnabled` was sent at
      // all rather than phoneNumber (there's no phone number to gate on
      // for this channel).
      ...(notif.emailEnabled !== undefined ? { email_notifications_enabled: Boolean(notif.emailEnabled) } : {}),
      // Optional override address for email alerts (PHASE R, supabase/
      // schema.sql) -- e.g. a bookkeeper or assistant's inbox instead of
      // the account's own login email. Only ever written when onboarding
      // actually sent a value, same "only set what was asked" pattern as
      // emailEnabled above; empty/whitespace-only normalizes to null
      // (meaning "use my account login email," the original default).
      ...(notif.alertEmail !== undefined
        ? { alert_email: typeof notif.alertEmail === "string" && notif.alertEmail.trim() ? notif.alertEmail.trim() : null }
        : {}),
      ...(finalize === false ? {} : { onboarded: true }),
    })
    .eq("id", user.id);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });

  // Insert-then-delete-old-ids, not delete-then-insert -- same reasoning
  // as PUT /api/split-rules: a failed insert should never leave someone
  // with zero split rules, even here where it's less likely to matter
  // (onboarding hasn't necessarily saved much yet) since mid-onboarding
  // steps already PUT real rows via saveSplitRulesNow before this final
  // step runs.
  const { data: existingRows } = await admin
    .from("simple_split_rules_percent")
    .select("id")
    .eq("user_id", user.id);
  const oldIds = (existingRows || []).map((r) => r.id);

  const percent = splitRules?.percent || [];

  if (percent.length) {
    const rows = percent.map((r) => ({
      user_id: user.id,
      label: r.label,
      group_name: r.group || null,
      pct: Number(r.pct) || 0,
      cap: r.max === null || r.max === undefined || r.max === "" ? null : Number(r.max),
      balance_cap: r.balanceCap === null || r.balanceCap === undefined || r.balanceCap === "" ? null : Number(r.balanceCap),
      color: r.color,
      account_id: r.accountId || null,
      retirement_type: r.retirementType || null,
      // Same derivation as /api/split-rules -- see the comment there.
      investment_type: r.group === "Investments" && !r.retirementType ? investmentTypeFromLabel(r.label) : null,
    }));
    const { error } = await admin.from("simple_split_rules_percent").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  if (oldIds.length) {
    await admin.from("simple_split_rules_percent").delete().in("id", oldIds);
  }

  return Response.json({ ok: true });
}
