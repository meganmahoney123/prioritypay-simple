import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { syncNewTransactions } from "@/lib/plaidSync";
import { decryptToken } from "@/lib/tokenCrypto";

// DEV/DEMO ONLY. Bulk version of the real per-account "Enable auto-detect"
// button on the Accounts page (see PlaidLinkButton mode="update" + the
// underlying /api/plaid/sync-cursor route) -- establishes accounts.
// plaid_cursor for every one of the caller's accounts that's missing it,
// in one call, instead of clicking the button N times. Exists purely
// because seeded demo accounts are inserted directly (bypassing the real
// Plaid Link flow that normally triggers sync-cursor automatically right
// after linking), so they'd otherwise show the "Linked before auto-detect
// existed" banner even though nothing is actually wrong with them. A real
// user linking through Plaid Link never sees that banner in the first
// place.
export async function POST() {
  if ((process.env.PLAID_ENV || "sandbox") !== "sandbox") {
    return Response.json({ error: "Only available in Plaid sandbox." }, { status: 400 });
  }

  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();
  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, plaid_access_token, plaid_cursor")
    .eq("user_id", user.id)
    .not("plaid_access_token", "is", null);

  const results = [];
  for (const acc of accounts || []) {
    if (acc.plaid_cursor) {
      results.push({ id: acc.id, skipped: true });
      continue;
    }
    try {
      const { cursor } = await syncNewTransactions(decryptToken(acc.plaid_access_token), null);
      await admin.from("simple_accounts").update({ plaid_cursor: cursor }).eq("id", acc.id);
      results.push({ id: acc.id, cursor: !!cursor });
    } catch (err) {
      const detail = err?.response?.data || err?.message || String(err);
      console.error("Bulk auto-detect enable failed for account", acc.id, detail);
      results.push({ id: acc.id, error: detail });
    }
  }

  return Response.json({ results });
}
