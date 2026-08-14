import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { runSplit } from "@/lib/runSplit";

// Manual entry point: the "Split $X now" button on the Payments page. Same
// underlying logic as the automatic Plaid-deposit webhook
// (app/api/plaid/webhook) -- see lib/runSplit.js -- just triggered by a
// person instead of a detected deposit.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { amount, sourceAccountId } = await request.json();
  const admin = supabaseAdmin();

  const result = await runSplit({ admin, userId: user.id, amount, sourceAccountId, trigger: "manual" });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json(result);
}
