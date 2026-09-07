import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isBusinessPlan, businessPlanRequiredError, getBusinessBillingProfile } from "@/lib/subscription";

// PHASE T. The one account-level write this tier needs: assigning (or
// clearing) which entity an account belongs to. Everything else about an
// account (linking, unlinking, balance) already has its own route/flow --
// this stays narrowly scoped to that one field rather than becoming a
// general-purpose account-editing endpoint.
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { entity_id } = await request.json();

  if (entity_id) {
    const { data: entity } = await admin
      .from("simple_entities")
      .select("id")
      .eq("id", entity_id)
      .eq("user_id", user.id)
      .single();
    if (!entity) return Response.json({ error: "Entity not found." }, { status: 404 });
  }

  const { data, error } = await admin
    .from("simple_accounts")
    .update({ entity_id: entity_id || null })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, entity_id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Account not found." }, { status: 404 });

  return Response.json({ id: data.id, entityId: data.entity_id });
}
