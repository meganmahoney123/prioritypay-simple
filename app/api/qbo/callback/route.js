import { requireUser } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { exchangeCodeForTokens, fetchCompanyName } from "@/lib/qbo";

// PHASE Q. Intuit redirects here with ?code&state&realmId after the user
// approves the connection in QBO's own hosted consent screen. Verifies
// the signed-in user matches the id embedded in `state` (see
// /api/qbo/connect's comment) before ever exchanging the code or touching
// the database -- the browser making this request still carries our own
// session cookie throughout the redirect, so requireUser() works here
// exactly as it does everywhere else.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  const realmId = searchParams.get("realmId");
  const error = searchParams.get("error");

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
  const redirectUri = `${appOrigin}/api/qbo/callback`;

  if (error) {
    return Response.redirect(`${appOrigin}/settings?qbo=denied`, 302);
  }

  const user = await requireUser();
  if (!user) return Response.redirect(`${appOrigin}/login?next=/settings`, 302);

  const [stateUserId, stateEntityId] = state.split(":");
  if (stateUserId !== user.id) {
    return Response.redirect(`${appOrigin}/settings?qbo=state_mismatch`, 302);
  }
  const entityId = stateEntityId && stateEntityId !== "none" ? stateEntityId : null;

  const admin = supabaseAdmin();

  if (entityId) {
    const { data: entity } = await admin
      .from("simple_entities")
      .select("id")
      .eq("id", entityId)
      .eq("user_id", user.id)
      .single();
    if (!entity) return Response.redirect(`${appOrigin}/settings?qbo=entity_not_found`, 302);
  }

  try {
    const tokens = await exchangeCodeForTokens({ code, redirectUri });
    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + tokens.expires_in * 1000).toISOString();
    const refreshTokenExpiresAt = new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString();

    const companyName = await fetchCompanyName({ accessToken: tokens.access_token, realmId }).catch(() => null);

    // upsert on realm_id (see the migration's unique index) -- reconnecting
    // the same QBO company replaces the stored tokens and re-points it at
    // whichever entity was selected this time, rather than erroring or
    // duplicating.
    const { error: dbError } = await admin.from("simple_qbo_connections").upsert(
      {
        user_id: user.id,
        entity_id: entityId,
        realm_id: realmId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        access_token_expires_at: accessTokenExpiresAt,
        refresh_token_expires_at: refreshTokenExpiresAt,
        company_name: companyName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "realm_id" }
    );
    if (dbError) throw dbError;
  } catch (err) {
    console.error("QBO callback failed:", err?.message || err);
    return Response.redirect(`${appOrigin}/settings?qbo=error`, 302);
  }

  return Response.redirect(`${appOrigin}/settings?qbo=connected`, 302);
}
