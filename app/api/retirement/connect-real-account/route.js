import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// PHASE B: connects a newly-linked account (via the scoped retirement Plaid
// flow, same create-retirement-link-token used before) as the user's REAL
// Solo 401k/SEP IRA -- into retirement_accounts, not split_rules_fixed.
// Deliberately a separate table/endpoint from the old
// /api/retirement/set-account: that one wires an account onto a split rule
// (now just a holding account under the PHASE A redesign), this one is the
// account close-out actually sends real contribution money to.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { retirementType, accountId } = await request.json();
  if (!retirementType || !accountId) {
    return Response.json({ error: "Missing retirementType or accountId." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("simple_retirement_accounts")
    .upsert(
      { user_id: user.id, retirement_type: retirementType, account_id: accountId, connected_at: new Date().toISOString() },
      { onConflict: "user_id,retirement_type" }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
