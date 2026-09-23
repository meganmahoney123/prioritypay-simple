import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// DEV/DEMO ONLY -- cosmetic-only counterpart to /api/dev/enable-auto-detect
// for demo persona accounts specifically.
//
// The real enable-auto-detect route establishes a genuine Plaid sync
// cursor by calling Plaid's transactionsSync, which only works when this
// app is actually pointed at Plaid sandbox (PLAID_ENV=sandbox) AND the
// account's plaid_access_token is a real, live token issued by whichever
// Plaid environment is currently active. Demo persona accounts (see
// provision-demo-persona) were seeded with sandbox-issued access tokens
// back when PLAID_ENV was temporarily set to "sandbox" for provisioning;
// production normally runs with PLAID_ENV=production for real users, so
// calling real Plaid against these accounts now would just fail (wrong
// environment for that token) -- and would require flipping the whole
// production app's Plaid environment to touch every real user's Plaid
// connection at once to do it "for real," which is not something to do
// just to clear a demo banner.
//
// These demo accounts never receive real Plaid webhook traffic anyway
// (nothing about them is real), so autoDetectEnabled here is purely
// cosmetic -- whether the Accounts page shows "Deposits here are split
// automatically" vs the "Linked before auto-detect existed" banner. This
// route sets a harmless placeholder plaid_cursor directly, with no Plaid
// API call at all, so it works regardless of which Plaid environment is
// currently live. Restricted to the known demo-owner/persona inboxes so
// it can never be pointed at a real user's account.
const DEMO_EMAILS = new Set([
  "megan@ignitemysite.com",
  "megan+w2only@ignitemysite.com",
  "megan+sidehustle@ignitemysite.com",
  "megan+bizowner@ignitemysite.com",
  "megan+bizsingle@ignitemysite.com",
  "megan+bizmulti@ignitemysite.com",
]);

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!DEMO_EMAILS.has(user.email)) {
    return Response.json({ error: "This endpoint can only be called from a known demo account." }, { status: 403 });
  }

  const admin = supabaseAdmin();
  const { data: accounts, error: fetchError } = await admin
    .from("simple_accounts")
    .select("id, plaid_cursor, account_type")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null)
    .or("account_type.eq.depository,account_type.is.null")
    .is("plaid_cursor", null);
  if (fetchError) return Response.json({ error: fetchError.message }, { status: 500 });

  const ids = (accounts || []).map((a) => a.id);
  if (!ids.length) return Response.json({ updated: 0 });

  const { error: updateError } = await admin
    .from("simple_accounts")
    .update({ plaid_cursor: "demo-seed-placeholder-cursor" })
    .in("id", ids);
  if (updateError) return Response.json({ error: updateError.message }, { status: 500 });

  return Response.json({ updated: ids.length, ids });
}
