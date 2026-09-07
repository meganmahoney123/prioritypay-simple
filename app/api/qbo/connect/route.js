import crypto from "crypto";
import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isBusinessPlan, businessPlanRequiredError, getBusinessBillingProfile } from "@/lib/subscription";
import { buildAuthorizeUrl } from "@/lib/qbo";

// PHASE T. Kicks off the QuickBooks OAuth flow for one entity (or "none"
// for a Business-plan user who hasn't set up entities yet -- see the
// migration's entity_id-nullable reasoning). Accepts entity_id as a query
// param so Settings can offer "Connect QuickBooks" per-entity once
// entities exist. Returns the authorize URL rather than redirecting
// directly, so the client-side button can `window.location.href = url`
// after confirming the click (same pattern as Plaid Link token creation
// returning a token for the client to hand to react-plaid-link).
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { searchParams, origin } = new URL(request.url);
  const entityId = searchParams.get("entity_id");

  if (entityId) {
    const { data: entity } = await admin
      .from("simple_entities")
      .select("id")
      .eq("id", entityId)
      .eq("user_id", user.id)
      .single();
    if (!entity) return Response.json({ error: "Entity not found." }, { status: 404 });
  }

  const appOrigin = process.env.NEXT_PUBLIC_APP_URL || origin;
  const redirectUri = `${appOrigin}/api/qbo/callback`;

  // A random single-use nonce binds this authorize request to its callback
  // (CSRF protection). It's stashed in an HttpOnly, SameSite=Lax cookie --
  // Lax so it still rides along on Intuit's top-level redirect back to
  // /api/qbo/callback -- and echoed in `state`; the callback rejects any
  // mismatch. The user id and entity id also travel in state and are
  // re-verified there against the session and this user's entities.
  const nonce = crypto.randomUUID();
  const state = `${nonce}:${user.id}:${entityId || "none"}`;
  const url = buildAuthorizeUrl({ redirectUri, state });

  const secure = appOrigin.startsWith("https") ? " Secure;" : "";
  return Response.json(
    { url },
    {
      headers: {
        "Set-Cookie": `qbo_oauth_nonce=${nonce}; HttpOnly;${secure} SameSite=Lax; Path=/; Max-Age=600`,
      },
    }
  );
}
