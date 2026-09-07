import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isBusinessPlan, businessPlanRequiredError, getBusinessBillingProfile } from "@/lib/subscription";

// PHASE Q. PATCH renames an entity (or changes its entity_type); DELETE
// removes it. Deleting an entity does NOT delete its accounts --
// simple_accounts.entity_id is `on delete set null` (see the migration),
// so those accounts just fall back to the single-default-pool state
// every account is already in today, rather than losing balance history.
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { name, entity_type } = await request.json();
  const updates = {};
  if (name !== undefined) {
    if (!name.trim()) return Response.json({ error: "Entity name is required." }, { status: 400 });
    updates.name = name.trim();
  }
  if (entity_type !== undefined) updates.entity_type = entity_type || null;

  const { data, error } = await admin
    .from("simple_entities")
    .update(updates)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id, name, entity_type, created_at")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data) return Response.json({ error: "Entity not found." }, { status: 404 });

  return Response.json({ entity: data });
}

export async function DELETE(_request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { error } = await admin.from("simple_entities").delete().eq("id", params.id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
