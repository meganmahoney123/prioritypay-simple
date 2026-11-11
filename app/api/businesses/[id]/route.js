import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { loadBusinessRows, syncProfileFromBusinesses } from "@/lib/businesses";
import { ENTITY_OPTIONS } from "@/lib/entityCopy";

const ENTITY_VALUES = ENTITY_OPTIONS.map((o) => o.value);

export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return Response.json({ error: "Give the business a name." }, { status: 400 });
    update.name = name;
  }
  if (body.entityType !== undefined) {
    if (!ENTITY_VALUES.includes(body.entityType)) return Response.json({ error: "Choose the business type." }, { status: 400 });
    update.entity_type = body.entityType;
  }
  if (!Object.keys(update).length) return Response.json({ error: "Nothing to update." }, { status: 400 });
  const admin = supabaseAdmin();
  const { error } = await admin.from("simple_businesses").update(update).eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await syncProfileFromBusinesses(admin, user.id);
  return Response.json({ businesses: await loadBusinessRows(admin, user.id) });
}

// Deposits and expenses that pointed at this business are kept, just no
// longer attributed to one (the database sets business_id to null).
export async function DELETE(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const admin = supabaseAdmin();
  const { error } = await admin.from("simple_businesses").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await syncProfileFromBusinesses(admin, user.id);
  return Response.json({ businesses: await loadBusinessRows(admin, user.id) });
}
