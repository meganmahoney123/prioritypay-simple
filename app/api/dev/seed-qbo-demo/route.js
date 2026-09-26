import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { encryptToken } from "@/lib/tokenCrypto";

// DEV/DEMO ONLY -- gives Megan's own demo account a QuickBooks connection
// for every business entity (and the default pool), so the Business tab's
// "Connected" status and Profit true-up section have something to show,
// with no real Intuit OAuth connection behind any of it.
//
// The demo-ness is marked entirely by realm_id starting with "demo-" --
// app/api/qbo/true-up/route.js checks that prefix and fabricates both
// sides of the true-up (buildDemoTrueUp there) instead of ever calling the
// real QuickBooks API for one of these rows. access_token/refresh_token
// are non-null columns on simple_qbo_connections but are never decrypted
// for a demo row, so their value only has to be validly "encrypted" text,
// not a real token.
const DEMO_EMAILS = new Set([
  "megan@ignitemysite.com",
  "megan+w2only@ignitemysite.com",
  "megan+sidehustle@ignitemysite.com",
  "megan+bizowner@ignitemysite.com",
  "megan+bizsingle@ignitemysite.com",
]);

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!DEMO_EMAILS.has((user.email || "").toLowerCase())) {
    return Response.json({ error: "Not available on this account." }, { status: 403 });
  }
  const admin = supabaseAdmin();

  const { data: entities } = await admin.from("simple_entities").select("id, name").eq("user_id", user.id);
  // Always includes the default pool (entity_id null) alongside every real
  // entity, so a user with unassigned accounts also sees a connection.
  const slots = [{ entityId: null, name: "Default Books" }, ...(entities || []).map((e) => ({ entityId: e.id, name: e.name }))];

  const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 5).toISOString();
  const placeholderToken = encryptToken("demo-placeholder-token");
  const nowIso = new Date().toISOString();

  const created = [];
  for (const slot of slots) {
    const realmId = `demo-${slot.entityId || "default"}`;
    const row = {
      user_id: user.id,
      entity_id: slot.entityId,
      realm_id: realmId,
      access_token: placeholderToken,
      refresh_token: placeholderToken,
      access_token_expires_at: farFuture,
      refresh_token_expires_at: farFuture,
      company_name: `${slot.name} (Demo Books)`,
      updated_at: nowIso,
    };
    // Upsert on the (user_id, realm_id) unique index by hand -- reruns
    // replace the same demo row instead of accumulating duplicates, same
    // find-then-update-or-insert pattern the real true-up snapshot upsert
    // uses (PostgREST's onConflict can't target this table's plain unique
    // index the way it could an expression index, but a plain index works
    // fine with a manual check here).
    const { data: existing } = await admin
      .from("simple_qbo_connections")
      .select("id")
      .eq("user_id", user.id)
      .eq("realm_id", realmId)
      .maybeSingle();
    if (existing) {
      await admin.from("simple_qbo_connections").update(row).eq("id", existing.id);
    } else {
      await admin.from("simple_qbo_connections").insert(row);
    }
    created.push({ entityId: slot.entityId, name: slot.name, companyName: row.company_name });
  }

  return Response.json({ ok: true, connections: created });
}
