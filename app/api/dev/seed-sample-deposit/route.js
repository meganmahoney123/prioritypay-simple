import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { runSplit } from "@/lib/runSplit";

// DEV/DEMO ONLY. Adds one sample deposit to the calling account and runs it
// through the real split engine, so the "Transfers waiting on you" checklist
// on Split My Deposits has something to show. Uses the account's actual
// split rules and linked accounts. Nothing is sent anywhere: PrioritySave
// only records what to transfer, and the person confirms each line.
// trigger "manual" on purpose, so no deposit text, email or push goes out.
// Restricted to Megan's own account. Open the URL while signed in, or POST.
const ALLOWED_EMAILS = new Set(["megan@ignitemysite.com"]);

async function seed() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!ALLOWED_EMAILS.has((user.email || "").toLowerCase())) {
    return Response.json({ error: "Not available on this account." }, { status: 403 });
  }
  const admin = supabaseAdmin();
  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, account_name")
    .eq("user_id", user.id);
  const source =
    (accounts || []).find((a) => /checking/i.test(a.account_name || "")) || (accounts || [])[0];
  if (!source) return Response.json({ error: "No linked accounts to land a deposit in." }, { status: 400 });

  const result = await runSplit({
    admin,
    userId: user.id,
    amount: 6000,
    sourceAccountId: source.id,
    trigger: "manual",
    depositName: "Sample deposit: Retainer",
  });
  if (result.error) return Response.json({ error: result.error }, { status: result.status || 500 });
  return Response.json({ ok: true, ...result });
}

export const GET = seed;
export const POST = seed;
