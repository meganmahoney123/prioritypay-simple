import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { plaidClient } from "@/lib/plaid";
import { decryptToken } from "@/lib/tokenCrypto";
import { classifyStream, looksLikeBill } from "@/lib/bills";

// Looks for recurring payments in the person's linked accounts using Plaid's
// recurring-transactions detection. Found payments are saved as "pending" so
// the person confirms them. Inferred from account history, so it can miss
// payments made another way (Zelle, Venmo, checks, a different card). It
// never moves money and never says whether autopay is on at the lender.
export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, plaid_access_token, plaid_account_id, account_type")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null);
  const { data: existing, error: exErr } = await admin.from("simple_bills").select("plaid_stream_id, status").eq("user_id", user.id).not("plaid_stream_id", "is", null);
  if (exErr) return Response.json({ error: "setup", needsSetup: true });
  const known = new Map((existing || []).map((b) => [b.plaid_stream_id, b.status]));

  // One call per Plaid connection (several accounts can share one).
  const byToken = new Map();
  (accounts || []).forEach((a) => {
    if (!byToken.has(a.plaid_access_token)) byToken.set(a.plaid_access_token, []);
    byToken.get(a.plaid_access_token).push(a);
  });

  let found = 0;
  let failed = 0;
  for (const [encToken, rows] of byToken) {
    try {
      const res = await plaidClient.transactionsRecurringGet({ access_token: decryptToken(encToken) });
      const streams = res.data.outflow_streams || [];
      for (const s of streams) {
        if (!s.is_active || s.status === "TOMBSTONED") continue;
        const primary = s.personal_finance_category?.primary || "";
        const name = s.merchant_name || s.description || "";
        const avg = Math.abs(Number(s.average_amount?.amount) || 0);
        const last = Math.abs(Number(s.last_amount?.amount) || 0);
        const steady = avg > 0 && Math.abs(last - avg) <= avg * 0.15;
        if (!looksLikeBill({ name, primaryCategory: primary, steady })) continue; // transfers, one-off Venmo, shopping and the like
        const frequency = classifyStream({
          frequency: s.frequency,
          firstDate: s.first_date,
          lastDate: s.last_date,
          count: Array.isArray(s.transaction_ids) ? s.transaction_ids.length : 0,
        });
        if (!frequency) continue; // not monthly, quarterly, every 6 months or yearly
        const amount = Math.abs(Number(s.average_amount?.amount ?? s.last_amount?.amount) || 0);
        if (!amount || !s.predicted_next_date) continue;
        if (known.get(s.stream_id) === "dismissed") continue;
        const account = rows.find((r) => r.plaid_account_id === s.account_id) || rows[0];
        const base = {
          name: (s.merchant_name || s.description || "Recurring payment").slice(0, 80),
          amount: Math.round(amount * 100) / 100,
          frequency,
          next_due: s.predicted_next_date,
          last_paid: s.last_date || null,
          account_id: account?.id || null,
        };
        if (known.has(s.stream_id)) {
          // Refresh the date and amount of one already found; never change what the person confirmed.
          await admin.from("simple_bills").update({ next_due: base.next_due, last_paid: base.last_paid }).eq("user_id", user.id).eq("plaid_stream_id", s.stream_id);
        } else {
          const { error } = await admin.from("simple_bills").insert({ ...base, user_id: user.id, source: "detected", status: "pending", plaid_stream_id: s.stream_id });
          if (!error) found += 1;
        }
      }
    } catch (err) {
      failed += 1;
      console.error("Recurring payments lookup failed", err?.response?.data || err?.message);
    }
  }
  return Response.json({ ok: true, found, failed, accounts: byToken.size });
}
