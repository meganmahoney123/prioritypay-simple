import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { data, error } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).single();
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
      },
    },
  });
}

export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json();
  const rp = body.retirementProfile || {};

  const { error } = await supabaseAdmin()
    .from("profiles")
    .update({
      persona: body.persona,
      business_name: body.businessName,
      entity_type: body.entityType,
      income_handling: rp.incomeHandling,
      has_w2_plan: rp.hasW2Plan,
      w2_elective_deferral_ytd: rp.w2ElectiveDeferralYTD,
      age_bracket: rp.ageBracket,
    })
    .eq("id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
