import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { decryptToken } from "@/lib/tokenCrypto";
import { plaidClient } from "@/lib/plaid";

// Do the person's connected credit cards show money owed? Used by the
// Dashboard to offer a payoff plan to people who never picked "Debt Payoff".
// Reads Plaid's stored account balances (accounts/get), not a live balance
// call. For a credit card, `current` is what is owed ("available" is the
// unused credit, so it is not used here). Read-only; nothing is saved.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: cards, error } = await admin
    .from("simple_accounts")
    .select("id, plaid_account_id, plaid_access_token")
    .eq("user_id", user.id)
    .eq("account_type", "credit")
    .not("plaid_access_token", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const byToken = new Map();
  for (const c of cards || []) {
    if (!c.plaid_account_id) continue;
    let token;
    try { token = decryptToken(c.plaid_access_token); } catch { continue; }
    if (!byToken.has(token)) byToken.set(token, new Set());
    byToken.get(token).add(c.plaid_account_id);
  }

  let owed = 0;
  let cardsWithBalance = 0;
  for (const [token, ids] of byToken) {
    try {
      const res = await plaidClient.accountsGet({ access_token: token });
      for (const a of res.data.accounts || []) {
        if (!ids.has(a.account_id)) continue;
        const cur = Number(a.balances?.current);
        if (Number.isFinite(cur) && cur > 0) { owed += cur; cardsWithBalance += 1; }
      }
    } catch (err) {
      console.error("[debts/cards-check] accounts/get failed", err?.response?.data?.error_code || err?.message);
    }
  }
  return Response.json({ owed: Math.round(owed * 100) / 100, cardsWithBalance, cardCount: (cards || []).length });
}
