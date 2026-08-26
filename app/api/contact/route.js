import { supabaseAdmin } from "@/lib/supabaseServer";

// Public, unauthenticated route backing /contact -- same shape as
// app/api/quiz/submit (honeypot + email-format check + IP rate limit using
// the table itself, no extra infra). Messages land in simple_contact_messages
// and are read back via the Supabase table editor -- no email-sending
// service wired up yet, so this is "collects reliably," not "delivers to
// an inbox." Fine for now; swap in Resend/SendGrid later if a real
// notification-on-submit becomes worth the added dependency.
const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, message, website } = body || {};

  // Honeypot -- a hidden "website" field on the form that only bots fill in.
  if (website) {
    return Response.json({ error: "Submission rejected." }, { status: 400 });
  }

  if (!name || typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "Enter a message." }, { status: 400 });
  }
  if (message.length > 5000) {
    return Response.json({ error: "Message is too long." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ip = getClientIp(request);

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000).toISOString();
  const { count } = await admin
    .from("simple_contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip_address", ip)
    .gte("created_at", since);

  if ((count || 0) >= RATE_LIMIT_MAX) {
    return Response.json({ error: "Too many messages sent recently. Please try again later." }, { status: 429 });
  }

  const { error } = await admin.from("simple_contact_messages").insert({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    ip_address: ip,
  });

  if (error) {
    console.error("[contact] insert failed (has the simple_contact_messages migration run?)", error.message);
    return Response.json({ error: "Something went wrong sending your message. Please try again." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
