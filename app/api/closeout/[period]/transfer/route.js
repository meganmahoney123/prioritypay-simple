import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { fireCloseoutTransfer } from "@/lib/closeoutTransfer";

// Generic "pull more into an account" action from the close-out screen --
// e.g. the tax estimate is just a number with nothing to move automatically
// (see lib/allocations.js estimateTaxReserve), so if someone decides after
// seeing it that they want to top up their Tax Reserve account from
// somewhere else, this is a plain one-off transfer between two of their own
// already-linked accounts. Not retirement-specific -- kept generic so it
// can be reused for any "I want to add more to X" moment on this screen.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { fromAccountId, toAccountId, amount, label } = await request.json();

  const admin = supabaseAdmin();
  const result = await fireCloseoutTransfer({
    admin,
    userId: user.id,
    fromAccountId,
    toAccountId,
    amount,
    label: label || "Manual transfer",
  });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json(result);
}
