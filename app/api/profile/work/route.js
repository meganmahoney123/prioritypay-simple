import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { PERSONA_BUSINESS_OWNER } from "@/lib/allocations";
import { ENTITY_OPTIONS, SOLE_PROP, joinEntities } from "@/lib/entityCopy";
import { DEPOSIT_TYPES, typeOptionsFor } from "@/lib/depositTypes";
import { WORK_PICK_VALUES, personaFromWork, picksForProfile, runsBusiness, businessesFromEntityType } from "@/lib/profileWork";

// The "Your profile" card in Settings: how the person earns money now (jobs,
// businesses, retired) and the names of their businesses. Saving changes which
// deposit types they are offered and what the app asks next. It never changes
// a split percentage.
const ENTITY_VALUES = ENTITY_OPTIONS.map((o) => o.value);

async function loadBusinesses(admin, userId, profile) {
  const { data, error } = await admin.from("simple_businesses").select("id, name, entity_type").eq("user_id", userId).order("created_at", { ascending: true });
  if (error || !data?.length) return businessesFromEntityType(profile);
  return data.map((b) => ({ id: b.id, name: b.name || "", entityType: b.entity_type || SOLE_PROP }));
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const { data: profile, error } = await admin.from("simple_profiles").select("*").eq("id", user.id).single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const workPicks = picksForProfile(profile);
  return Response.json({
    workPicks,
    employerName: profile.employer_name || "",
    hasEmployees: profile.persona === PERSONA_BUSINESS_OWNER,
    businesses: runsBusiness(workPicks) ? await loadBusinesses(admin, user.id, profile) : [],
  });
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const body = await request.json().catch(() => ({}));

  const picks = Array.isArray(body.workPicks) ? [...new Set(body.workPicks.filter((v) => WORK_PICK_VALUES.includes(v)))] : [];
  if (!picks.length) return Response.json({ error: "Choose at least one way you earn money." }, { status: 400 });
  const runs = runsBusiness(picks);
  if (runs && typeof body.hasEmployees !== "boolean") {
    return Response.json({ error: "Tell us whether you have employees (other than a spouse or your kids)." }, { status: 400 });
  }

  let businesses = [];
  if (runs) {
    businesses = (Array.isArray(body.businesses) ? body.businesses : [])
      .slice(0, 10)
      .map((b) => ({
        name: typeof b?.name === "string" ? b.name.trim().slice(0, 80) : "",
        entityType: ENTITY_VALUES.includes(b?.entityType) ? b.entityType : SOLE_PROP,
      }));
    if (!businesses.length) businesses = [{ name: "", entityType: SOLE_PROP }];
  }

  const { data: before } = await admin.from("simple_profiles").select("*").eq("id", user.id).single();
  if (!before) return Response.json({ error: "Profile not found." }, { status: 404 });

  const persona = personaFromWork(picks, runs && body.hasEmployees === true);
  const update = {
    persona,
    has_w2_plan: picks.includes("w2"),
    ...(runs
      ? {
          entity_type: joinEntities([...new Set(businesses.map((b) => b.entityType))]),
          business_name: businesses.find((b) => b.name)?.name || before.business_name || null,
          ...(persona === PERSONA_BUSINESS_OWNER && !before.income_handling ? { income_handling: "separate" } : {}),
        }
      : {}),
  };
  const { error: updateError } = await admin.from("simple_profiles").update(update).eq("id", user.id);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  // Each of these is saved on its own and skipped if its column or table
  // doesn't exist yet, so the card works before the one-time database update.
  const warnings = [];
  const picksRes = await admin.from("simple_profiles").update({ work_picks: picks.join(",") }).eq("id", user.id);
  if (picksRes.error) warnings.push("picks");
  const employer = picks.includes("w2") && typeof body.employerName === "string" ? body.employerName.trim().slice(0, 80) : "";
  const empRes = await admin.from("simple_profiles").update({ employer_name: employer || null }).eq("id", user.id);
  if (empRes.error) warnings.push("employer");

  const { data: old } = await admin.from("simple_businesses").select("id").eq("user_id", user.id);
  if (!old && runs) {
    warnings.push("businesses");
  } else {
    if (runs) {
      const { error: insErr } = await admin
        .from("simple_businesses")
        .insert(businesses.map((b) => ({ user_id: user.id, name: b.name, entity_type: b.entityType })));
      if (insErr) warnings.push("businesses");
      else if (old?.length) await admin.from("simple_businesses").delete().in("id", old.map((r) => r.id));
    } else if (old?.length) {
      await admin.from("simple_businesses").delete().in("id", old.map((r) => r.id));
    }
  }

  // What changed for deposit types, in plain words.
  const after = { ...before, ...update, work_picks: picks.join(",") };
  const was = new Set(typeOptionsFor(before));
  const now = new Set(typeOptionsFor(after));
  const added = [...now].filter((t) => !was.has(t)).map((t) => DEPOSIT_TYPES[t]);
  const removed = [...was].filter((t) => !now.has(t)).map((t) => DEPOSIT_TYPES[t]);

  return Response.json({ ok: true, added, removed, warnings, picksSaved: picks });
}
