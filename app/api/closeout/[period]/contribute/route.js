import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fireCloseoutTransfer } from "@/lib/closeoutTransfer";
import { RETIREMENT_LABELS } from "@/lib/allocations";

// The one-click "send this to my real Solo 401k/SEP IRA" button on the
// close-out recommendations screen: moves money from wherever it's been
// holding all month (the split rule's connected account) to the REAL
// connected retirement account (retirement_accounts, PHASE B), tagged with
// retirement_type so it's indistinguishable from any other retirement
// contribution to every piece of the app that already tracks that (YTD
// room math above, the monthly Dashboard reminder once PHASE B re-enables
// it).
export async function POST(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { retirementType, amount, fromAccountId } = await request.json();
  if (!retirementType || !fromAccountId) {
    return Response.json({ error: "Missing retirementType or fromAccountId." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: real } = await admin
    .from("retirement_accounts")
    .select("account_id")
    .eq("user_id", user.id)
    .eq("retirement_type", retirementType)
    .maybeSingle();
  if (!real) {
    return Response.json({ error: "Connect your real retirement account first." }, { status: 400 });
  }

  const result = await fireCloseoutTransfer({
    admin,
    userId: user.id,
    fromAccountId,
    toAccountId: real.account_id,
    amount,
    label: RETIREMENT_LABELS[retirementType] || retirementType,
    retirementType,
  });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json(result);
}
