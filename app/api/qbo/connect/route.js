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

  // state carries both the user id and entity id (or "none"), signed
  // implicitly by requiring the callback to re-verify the user id against
  // the session cookie present at callback time -- Intuit's redirect
  // doesn't preserve our auth cookie context otherwise being trustworthy
  // on its own, so the callback treats this as a hint to verify, not as
  // authorization by itself.
  const state = `${user.id}:${entityId || "none"}`;
  const url = buildAuthorizeUrl({ redirectUri, state });

  return Response.json({ url });
}
