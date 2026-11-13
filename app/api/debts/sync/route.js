import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { decryptToken } from "@/lib/tokenCrypto";
import { fetchLiabilityDebt } from "@/lib/plaidLiabilities";

// "Update from my cards": reads each connected credit card's balance, APR,
// minimum payment and due date from Plaid Liabilities and keeps one debt row
// per card in sync. Nothing here moves money.
// Cards that were linked before Liabilities was requested need the person to
// approve it once; those come back in `needsConsent` so the page can offer a
// reconnect button.
const CONSENT_CODES = ["ADDITIONAL_CONSENT_REQUIRED", "INVALID_PRODUCT", "PRODUCTS_NOT_SUPPORTED"];

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: cards, error } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask, plaid_account_id, plaid_access_token")
    .eq("user_id", user.id)
    .eq("account_type", "credit")
    .not("plaid_access_token", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const needsConsent = [];
  const unavailable = [];
  let updated = 0;
  let added = 0;

  for (const card of cards || []) {
    const label = `${card.institution_name || "Card"}${card.account_name ? ` ${card.account_name}` : ""}${card.mask ? ` ···${card.mask}` : ""}`;
    if (!card.plaid_account_id) { unavailable.push(label); continue; }
    let accessToken;
    try { accessToken = decryptToken(card.plaid_access_token); } catch { unavailable.push(label); continue; }

    const result = await fetchLiabilityDebt(accessToken, card.plaid_account_id);
    if (!result.debt) {
      if (CONSENT_CODES.includes(result.code)) needsConsent.push({ accountId: card.id, name: label });
      else unavailable.push(label);
      continue;
    }
    const d = result.debt;
    const now = new Date().toISOString();

    const { data: existing, error: selError } = await admin
      .from("simple_debts")
      .select("id, apr, min_payment")
      .eq("user_id", user.id)
      .eq("plaid_account_id", card.plaid_account_id)
      .maybeSingle();
    if (selError) {
      return Response.json({ error: "Importing debts needs a one-time database update first.", needsSetup: true }, { status: 500 });
    }

    if (existing) {
      // Keep the person's own APR or minimum when Plaid didn't send one.
      const update = {
        balance: d.balance,
        paid_off_at: d.balance <= 0 ? now : null,
        synced_at: now,
        due_date: d.dueDate,
      };
      if (d.apr !== null) update.apr = d.apr;
      if (d.minPayment !== null) update.min_payment = d.minPayment;
      const { error: upError } = await admin.from("simple_debts").update(update).eq("id", existing.id).eq("user_id", user.id);
      if (!upError) updated += 1;
    } else if (d.balance > 0) {
      const { error: insError } = await admin.from("simple_debts").insert({
        user_id: user.id,
        name: label.slice(0, 60),
        debt_type: d.debtType,
        balance: d.balance,
        apr: d.apr ?? 0,
        min_payment: d.minPayment ?? 0,
        plaid_account_id: card.plaid_account_id,
        account_id: card.id,
        synced_at: now,
        due_date: d.dueDate,
      });
      if (!insError) added += 1;
    }
  }

  return Response.json({ ok: true, cards: (cards || []).length, added, updated, needsConsent, unavailable });
}
