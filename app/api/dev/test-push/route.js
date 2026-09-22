import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { sendDepositAlertPush } from "@/lib/push";

// DEV/DEMO ONLY. Sends a real push notification to every device token
// registered for the calling user, using the same sendDepositAlertPush()
// path runSplit.js uses for a real detected deposit -- lets Megan verify
// the whole APNs pipeline (device registration -> stored token -> signed
// JWT -> APNs -> phone) works without needing to trigger an actual Plaid
// transaction. Remove this route once push has been verified end-to-end.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const admin = supabaseAdmin();
  const { data: tokens, error } = await admin
    .from("simple_push_tokens")
    .select("token, platform")
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    return Response.json(
      { error: "No push tokens registered for this user yet. Open the app on your phone and allow notifications first." },
      { status: 400 }
    );
  }

  const dashboardUrl = new URL("/dashboard", request.url).toString();
  const results = [];
  for (const row of tokens) {
    const result = await sendDepositAlertPush({
      token: row.token,
      depositAmount: 42.42,
      dashboardUrl,
    });
    results.push({ token: row.token.slice(0, 8) + "...", ...result });
  }

  return Response.json({ sent: results });
}
