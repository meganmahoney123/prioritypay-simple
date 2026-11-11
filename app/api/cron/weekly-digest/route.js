import { supabaseAdmin } from "@/lib/supabaseServer";
import { sendWeeklyDigestEmail } from "@/lib/email";
import { sendWeeklyDigestSms } from "@/lib/sms";
import { sendDepositAlertPush } from "@/lib/push";

// Runs every Monday (see vercel.json). For everyone who chose "one summary
// each week" in Settings, sends a single text/email/push listing how many
// deposits are still waiting on the Split My Deposits checklist. Nothing is
// sent when nothing is waiting. Protected by CRON_SECRET: Vercel sends it as
// "Authorization: Bearer <CRON_SECRET>" on cron calls, and anything else is
// rejected, so this can't be triggered from the open internet.
export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = supabaseAdmin();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.prioritysave.com";
  const depositsUrl = `${appUrl}/deposits`;

  const { data: profiles, error } = await admin
    .from("simple_profiles")
    .select("id, phone_number, sms_notifications_enabled, email_notifications_enabled, alert_email")
    .eq("notification_frequency", "weekly");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const p of profiles || []) {
    try {
      const { data: transfers } = await admin
        .from("simple_transfers")
        .select("id, source_amount, skipped_at, simple_transfer_allocations(status)")
        .eq("user_id", p.id)
        .is("skipped_at", null);
      const waiting = (transfers || []).filter((t) => (t.simple_transfer_allocations || []).some((a) => a.status === "needs_approval"));
      if (!waiting.length) continue;
      const count = waiting.length;
      const total = waiting.reduce((s, t) => s + (Number(t.source_amount) || 0), 0);

      if (p.sms_notifications_enabled && p.phone_number) {
        await sendWeeklyDigestSms({ phoneNumber: p.phone_number, count, total, depositsUrl });
      }
      if (p.email_notifications_enabled) {
        let toEmail = p.alert_email || null;
        if (!toEmail) {
          const { data: authUser } = await admin.auth.admin.getUserById(p.id);
          toEmail = authUser?.user?.email;
        }
        if (toEmail) await sendWeeklyDigestEmail({ toEmail, count, total, depositsUrl });
      }
      const { data: tokens } = await admin.from("simple_push_tokens").select("token").eq("user_id", p.id);
      for (const row of tokens || []) {
        await sendDepositAlertPush({ token: row.token, depositAmount: total, dashboardUrl: depositsUrl });
      }
      sent += 1;
    } catch (err) {
      console.error("[weekly-digest] failed for a user (non-fatal)", err?.message || err);
    }
  }
  return Response.json({ ok: true, usersNotified: sent });
}
