import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// The user's real, Plaid-connected Solo 401k/SEP IRA accounts (see
// retirement_accounts, PHASE B) -- powers the "Connected -- ..." status on
// the close-out recommendations screen.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data, error } = await admin
    .from("simple_retirement_accounts")
    .select("retirement_type, account_id, simple_accounts(institution_name, account_name, mask)")
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const realAccounts = (data || []).map((r) => ({
    retirementType: r.retirement_type,
    accountId: r.account_id,
    institutionName: r.simple_accounts?.institution_name || null,
    accountName: r.simple_accounts?.account_name || null,
    mask: r.simple_accounts?.mask || null,
  }));

  return Response.json({ realAccounts });
}
