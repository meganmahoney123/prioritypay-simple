import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isReadOnly } from "@/lib/subscription";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { data, error } = await supabaseAdmin().from("simple_profiles").select("*").eq("id", user.id).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    profile: {
      persona: data.persona,
      businessName: data.business_name,
      entityType: data.entity_type,
      onboarded: data.onboarded,
      retirementProfile: {
        incomeHandling: data.income_handling,
        hasW2Plan: data.has_w2_plan,
        w2ElectiveDeferralYTD: Number(data.w2_elective_deferral_ytd || 0),
        ageBracket: data.age_bracket,
        estimatedEmployeePayroll: data.estimated_employee_payroll === null ? null : Number(data.estimated_employee_payroll),
      },
      billing: {
        subscriptionStatus: data.subscription_status,
        trialEndsAt: data.trial_ends_at,
        readOnly: isReadOnly(data),
      },
      notifications: {
        phoneNumber: data.phone_number,
        smsEnabled: data.sms_notifications_enabled,
        smsThreshold: data.sms_threshold === null ? null : Number(data.sms_threshold),
      },
    },
  });
}

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const rp = body.retirementProfile || {};
  const notif = body.notifications || {};

  const { error } = await supabaseAdmin()
    .from("simple_profiles")
    .update({
      persona: body.persona,
      business_name: body.businessName,
      entity_type: body.entityType,
      income_handling: rp.incomeHandling,
      has_w2_plan: rp.hasW2Plan,
      w2_elective_deferral_ytd: rp.w2ElectiveDeferralYTD,
      age_bracket: rp.ageBracket,
      estimated_employee_payroll: rp.estimatedEmployeePayroll ?? null,
      phone_number: notif.phoneNumber || null,
      sms_notifications_enabled: Boolean(notif.smsEnabled),
      sms_threshold: notif.smsThreshold === "" || notif.smsThreshold === undefined ? null : notif.smsThreshold,
    })
    .eq("id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
