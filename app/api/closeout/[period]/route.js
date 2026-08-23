import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";

// GET creates the draft close-out for this period if it doesn't exist yet
// (pulling and auto-tagging every transaction across every linked account
// for that date range from Plaid), or just returns what's already there --
// re-fetching only while still a draft, so re-tagging on a later visit
// picks up anything that posted late, without ever touching a period
// that's already been confirmed and acted on. The actual fetch/tag/upsert
// logic lives in lib/closeoutSync.js, shared with app/api/tax-summary,
// which needs the exact same behavior for months the person never
// manually visited Close-Out for.
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { period } = await params;
  const admin = supabaseAdmin();

  try {
    const { closeout, transactions } = await ensureCloseoutForPeriod(admin, user.id, period);
    return Response.json({ closeout, transactions });
  } catch (err) {
    return Response.json({ error: err.message || "Could not load this month." }, { status: 500 });
  }
}
