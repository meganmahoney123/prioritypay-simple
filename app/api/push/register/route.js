import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Called from lib/native.js's registerForPushNotifications() once the iOS
// app has an APNs device token. Upserts into simple_push_tokens, keyed on
// the token itself so the same device re-registering (app relaunch, token
// refresh) updates in place instead of piling up duplicate rows.
//
// simple_push_tokens does not exist yet -- this table needs a migration
// before this route can actually store anything (see supabase/schema.sql).
// Until that migration runs, this silently no-ops (same "never break the
// caller" pattern as lib/sms.js when Twilio isn't configured) so the app
// doesn't show an error to someone who just opened it; deposit alerts keep
// going out over SMS in the meantime. Sending an actual push notification is
// separate, later work that also needs an Apple Push Notification service
// key from App Store Connect (Phase 3 -- Apple Developer Program, Megan's
// step) wired into a server-side APNs client.
export async function POST(req) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { token, platform } = await req.json().catch(() => ({}));
  if (!token) return Response.json({ error: "token is required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("simple_push_tokens")
    .upsert(
      { user_id: user.id, token, platform: platform || "ios", updated_at: new Date().toISOString() },
      { onConflict: "token" }
    );

  if (error) {
    // Table likely doesn't exist yet (code 42P01) -- log and no-op rather
    // than surfacing an error to the app for something the user can't act on.
    console.warn("[push/register] upsert failed (has the simple_push_tokens migration run?)", error.message);
    return Response.json({ ok: true, stored: false });
  }

  return Response.json({ ok: true, stored: true });
}
