import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { decryptToken } from "@/lib/tokenCrypto";
import { getTransactionsForRange } from "@/lib/plaidSync";
import { summarizeCard, capStatus } from "@/lib/cardSpending";

// Monthly spending cap per credit card, plus what has been charged on each card.
// Read-only against Plaid. Writes only the person's own cap on simple_accounts.
// A short in-memory cache keeps repeat page loads from re-asking Plaid every time.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map(); // `${userId}:${accountId}` -> { at, summary }

function threeMonthsBack(today) {
  // Start of the month three months ago, so three full prior months are covered.
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 3, 1));
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  let { data: cards, error } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask, plaid_account_id, plaid_access_token, card_cap, card_cap_dismissed_at")
    .eq("user_id", user.id)
    .eq("account_type", "credit");
  let needsSetup = false;
  if (error) {
    // The cap columns come from a one-time database update. Until it is run, show
    // spending without caps instead of failing.
    needsSetup = true;
    const retry = await admin
      .from("simple_accounts")
      .select("id, institution_name, account_name, mask, plaid_account_id, plaid_access_token")
      .eq("user_id", user.id)
      .eq("account_type", "credit");
    if (retry.error) return Response.json({ error: retry.error.message }, { status: 500 });
    cards = retry.data;
  }

  const today = new Date();
  const out = [];
  for (const c of cards || []) {
    const cap = c.card_cap === null || c.card_cap === undefined ? null : Number(c.card_cap);
    let summary = null;
    // Why spending is not available, shown on the card so it is not a mystery.
    let reason = null;
    let detail = null;
    if (!c.plaid_access_token || !c.plaid_account_id) reason = "no_link";
    if (c.plaid_access_token && c.plaid_account_id) {
      const key = `${user.id}:${c.id}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_MS) summary = hit.summary;
      else {
        try {
          const txns = await getTransactionsForRange(decryptToken(c.plaid_access_token), threeMonthsBack(today), today.toISOString().slice(0, 10));
          summary = summarizeCard(txns.filter((t) => t.account_id === c.plaid_account_id), today);
          cache.set(key, { at: Date.now(), summary });
        } catch (e) {
          summary = null;
          reason = e?.response?.data?.error_code || "unknown";
          // A short, non-secret hint for the person looking at the card.
          detail = String(e?.response?.data?.error_message || e?.message || e).slice(0, 140);
        }
      }
    }
    out.push({
      accountId: c.id,
      name: `${c.institution_name || "Card"}${c.account_name ? ` ${c.account_name}` : ""}${c.mask ? ` ···${c.mask}` : ""}`,
      cap,
      dismissed: !!c.card_cap_dismissed_at,
      tracked: !!summary,
      reason: summary ? null : reason,
      detail: summary ? null : detail,
      spent: summary ? summary.spent : null,
      projected: summary ? summary.projected : null,
      daysLeft: summary ? summary.daysLeft : null,
      categories: summary ? summary.categories : [],
      suggestion: summary ? summary.suggestion : null,
      status: summary ? capStatus(summary.spent, cap) : "none",
      month: today.toISOString().slice(0, 7),
    });
  }
  return Response.json({ ok: true, needsSetup, cards: out });
}

// Body: { accountId, cap }  sets or changes the cap (null clears it)
//       { accountId, dismiss: true }  hides the suggestion ("Not now")
export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  if (!body.accountId) return Response.json({ error: "Missing card." }, { status: 400 });
  const update = {};
  if (body.dismiss) update.card_cap_dismissed_at = new Date().toISOString();
  if ("cap" in body) {
    if (body.cap === null) update.card_cap = null;
    else {
      const n = Number(body.cap);
      if (!Number.isFinite(n) || n <= 0 || n > 1000000) return Response.json({ error: "Enter a cap above $0." }, { status: 400 });
      update.card_cap = Math.round(n * 100) / 100;
    }
  }
  if (!Object.keys(update).length) return Response.json({ error: "Nothing to save." }, { status: 400 });
  const admin = supabaseAdmin();
  const { error } = await admin.from("simple_accounts").update(update).eq("id", body.accountId).eq("user_id", user.id).eq("account_type", "credit");
  if (error) return Response.json({ error: "Saving a cap needs a one-time database update first.", needsSetup: true }, { status: 500 });
  return Response.json({ ok: true });
}
