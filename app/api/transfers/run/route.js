import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { runSplit } from "@/lib/runSplit";
import { isReadOnly, getBillingProfile, readOnlyError } from "@/lib/subscription";

// Manual entry point: the "Split $X now" button on the Payments page. Same
// underlying logic as the automatic Plaid-deposit webhook
// (app/api/plaid/webhook) -- see lib/runSplit.js -- just triggered by a
// person instead of a detected deposit.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  // runSplit() itself also gates real transfers behind this same check
  // (so the automatic webhook path can't be used to route around it), but
  // that path silently reserves everything since no one's watching for an
  // error in real time. Here, since a person is watching, it's worth
  // stopping before creating a no-op transfer record at all and telling
  // them plainly why.
  const billingProfile = await getBillingProfile(admin, user.id);
  if (isReadOnly(billingProfile)) return readOnlyError();

  const { amount, sourceAccountId } = await request.json();

  const result = await runSplit({ admin, userId: user.id, amount, sourceAccountId, trigger: "manual" });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json(result);
}
