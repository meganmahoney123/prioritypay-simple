import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { loadBusinessRows, syncProfileFromBusinesses } from "@/lib/businesses";
import { ENTITY_OPTIONS } from "@/lib/entityCopy";

// The person's saved businesses (Settings, Your businesses), used by the
// dropdowns that attribute income and expenses to a business.
export const ENTITY_VALUES = ENTITY_OPTIONS.map((o) => o.value);

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return Response.json({ businesses: await loadBusinessRows(supabaseAdmin(), user.id) });
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!name) return Response.json({ error: "Give the business a name." }, { status: 400 });
  if (!ENTITY_VALUES.includes(body.entityType)) return Response.json({ error: "Choose the business type." }, { status: 400 });
  const admin = supabaseAdmin();
  const existing = await loadBusinessRows(admin, user.id);
  if (existing.length >= 10) return Response.json({ error: "That's the most businesses we can track (10)." }, { status: 400 });
  const { error } = await admin.from("simple_businesses").insert({ user_id: user.id, name, entity_type: body.entityType });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await syncProfileFromBusinesses(admin, user.id);
  return Response.json({ businesses: await loadBusinessRows(admin, user.id) });
}
