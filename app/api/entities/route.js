import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isBusinessPlan, businessPlanRequiredError, getBusinessBillingProfile } from "@/lib/subscription";

// PHASE T. GET lists a Business-plan user's entities; POST creates one.
// Gated the same way isReadOnly() gates money-moving routes elsewhere --
// read plan at request time, no separate "entitlements" system. Simple-
// plan users get a 402 with a clear reason code rather than an empty
// list, so the UI can tell "you have zero entities" apart from "this
// isn't part of your plan."
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { data, error } = await admin
    .from("simple_entities")
    .select("id, name, entity_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ entities: data });
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { name, entity_type } = await request.json();
  if (!name || !name.trim()) {
    return Response.json({ error: "Entity name is required." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("simple_entities")
    .insert({ user_id: user.id, name: name.trim(), entity_type: entity_type || null })
    .select("id, name, entity_type, created_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ entity: data });
}
