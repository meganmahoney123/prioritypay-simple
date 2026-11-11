import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { decryptToken } from "@/lib/tokenCrypto";
import { getTransactionsForRange } from "@/lib/plaidSync";
import { findSuggestions } from "@/lib/billMatch";
import { nextOccurrence, toIso } from "@/lib/bills";

// Charges in the person's history that look like yearly, twice-a-year or
// quarterly bills. Suggestions only: nothing is added until they say yes.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const [{ data: accounts }, { data: bills, error }] = await Promise.all([
    admin.from("simple_accounts").select("id, plaid_access_token, plaid_account_id").eq("user_id", user.id).not("plaid_access_token", "is", null),
    admin.from("simple_bills").select("name, status, plaid_stream_id").eq("user_id", user.id),
  ]);
  if (error) return Response.json({ suggestions: [], needsSetup: true });

  const names = (bills || []).filter((b) => b.status !== "dismissed").map((b) => b.name);
  const dismissed = (bills || []).filter((b) => b.status === "dismissed" && b.plaid_stream_id?.startsWith("suggest:")).map((b) => b.plaid_stream_id);

  const today = new Date();
  const end = toIso(new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())));
  const start = toIso(new Date(Date.UTC(today.getFullYear() - 2, today.getMonth(), today.getDate())));
  const byToken = new Map();
  (accounts || []).forEach((a) => {
    if (!byToken.has(a.plaid_access_token)) byToken.set(a.plaid_access_token, []);
    byToken.get(a.plaid_access_token).push(a);
  });

  let transactions = [];
  for (const enc of byToken.keys()) {
    try {
      transactions = transactions.concat(await getTransactionsForRange(decryptToken(enc), start, end));
    } catch (err) {
      console.error("Suggestions: history lookup failed", err?.response?.data || err?.message);
    }
  }

  const found = findSuggestions(transactions, { names, dismissed }, end).map((s) => {
    const account = (accounts || []).find((a) => a.plaid_account_id === s.plaidAccountId);
    const nextDue = nextOccurrence({ next_due: s.lastDate, frequency: s.frequency }, end);
    return { ...s, accountId: account?.id || null, nextDue };
  });
  return Response.json({ suggestions: found.filter((s) => s.nextDue) });
}

// "No, not recurring": remember it so the same charge is never suggested again.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const id = typeof body.dismiss === "string" ? body.dismiss : "";
  if (!/^suggest:[a-z]+:[a-z0-9]+:\d+$/.test(id)) return Response.json({ error: "Invalid." }, { status: 400 });
  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("simple_bills").select("id").eq("user_id", user.id).eq("plaid_stream_id", id).maybeSingle();
  if (!existing) {
    const { error } = await admin
      .from("simple_bills")
      .insert({ user_id: user.id, name: "Not recurring", amount: 0, frequency: "yearly", next_due: new Date().toISOString().slice(0, 10), status: "dismissed", source: "detected", plaid_stream_id: id });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true });
}
