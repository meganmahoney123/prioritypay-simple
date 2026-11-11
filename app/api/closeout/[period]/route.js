import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";
import { loadBusinessRows } from "@/lib/businesses";

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
    // Which deposits were already typed on Split My Deposits, and the saved
    // businesses, so the page can show only what is left to handle.
    const ids = transactions.filter((t) => t.direction === "in").map((t) => t.plaid_transaction_id).filter(Boolean);
    const typed = {};
    if (ids.length) {
      const { data: rows } = await admin.from("simple_transfers").select("plaid_transaction_id, deposit_type").eq("user_id", user.id).in("plaid_transaction_id", ids);
      (rows || []).forEach((r) => { if (r.deposit_type) typed[r.plaid_transaction_id] = r.deposit_type; });
    }
    const withFlags = transactions.map((t) => (typed[t.plaid_transaction_id] ? { ...t, from_deposit: true, deposit_type: typed[t.plaid_transaction_id] } : t));
    const businesses = await loadBusinessRows(admin, user.id);
    return Response.json({ closeout, transactions: withFlags, businesses });
  } catch (err) {
    return Response.json({ error: err.message || "Could not load this month." }, { status: 500 });
  }
}
