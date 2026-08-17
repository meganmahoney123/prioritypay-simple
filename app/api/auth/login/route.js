import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabaseServer";

// Dwolla's app-approval checklist requires locking an account for at least
// 30 minutes after 10 incorrect password attempts. This route is the only
// path app/login/page.js uses to sign in, so it's the single place that
// enforcement lives -- see the comment above simple_login_lockouts in
// supabase/schema.sql for why this is app-level rather than a Supabase Auth
// Hook.
const MAX_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 30;
const LOCKOUT_MESSAGE_ACTIVE =
  "Too many failed login attempts. Please try again in about 30 minutes.";
const LOCKOUT_MESSAGE_NEW =
  "Too many failed login attempts. Your account is locked for 30 minutes.";

export async function POST(request) {
  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const admin = supabaseAdmin();

  const { data: lockRow } = await admin
    .from("simple_login_lockouts")
    .select("failed_count, locked_until")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (lockRow?.locked_until && new Date(lockRow.locked_until) > new Date()) {
    return NextResponse.json({ error: LOCKOUT_MESSAGE_ACTIVE }, { status: 423 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const nextFailedCount = (lockRow?.failed_count ?? 0) + 1;
    const justLocked = nextFailedCount >= MAX_ATTEMPTS;

    await admin.from("simple_login_lockouts").upsert({
      email: normalizedEmail,
      failed_count: justLocked ? 0 : nextFailedCount,
      locked_until: justLocked
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null,
      last_attempt_at: new Date().toISOString(),
    });

    if (justLocked) {
      return NextResponse.json({ error: LOCKOUT_MESSAGE_NEW }, { status: 423 });
    }
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Correct password -- clear any failure history so it doesn't linger
  // toward a future lockout.
  if (lockRow) {
    await admin
      .from("simple_login_lockouts")
      .update({ failed_count: 0, locked_until: null, last_attempt_at: new Date().toISOString() })
      .eq("email", normalizedEmail);
  }

  return NextResponse.json({ ok: true });
}
