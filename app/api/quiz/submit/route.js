import { supabaseAdmin } from "@/lib/supabaseServer";
import { matchStrategies } from "@/lib/quizEngine";

// Public, unauthenticated route -- backs app/tax-savings-quiz. Deliberately
// does NOT call requireUser() (there's no logged-in user on a marketing
// page) and does NOT call the Anthropic API at all -- matching is pure,
// free, server-side logic (lib/quizEngine.js) against the same strategy
// library the in-app advisor uses. That keeps this route immune to the
// cost/abuse exposure a public LLM-backed endpoint would have.
//
// Basic bot/abuse protection since anyone can hit this with no login:
//  - honeypot field (real users never fill in a visually-hidden input)
//  - simple email shape check
//  - a light IP-based rate limit using the leads table itself (no extra
//    infra) -- more than 8 submissions from the same IP in 10 minutes is
//    rejected

const RATE_LIMIT_WINDOW_MINUTES = 10;
const RATE_LIMIT_MAX = 8;
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

  const { email, answers, website } = body || {};

  // Honeypot -- a hidden "website" field in the form that only bots fill in.
  if (website) {
    return Response.json({ error: "Submission rejected." }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!answers || typeof answers !== "object") {
    return Response.json({ error: "Missing quiz answers." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const ip = getClientIp(request);

  if (ip !== "unknown") {
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from("simple_quiz_leads")
      .select("id", { count: "exact", head: true })
      .eq("ip_address", ip)
      .gte("created_at", since);
    if (!countError && count !== null && count >= RATE_LIMIT_MAX) {
      return Response.json(
        { error: "Too many submissions. Please try again in a few minutes." },
        { status: 429 }
      );
    }
  }

  const matchResult = matchStrategies(answers);
  const matchedIds = matchResult.results.flatMap((g) => g.strategies.map((s) => s.id));

  const { error: insertError } = await admin.from("simple_quiz_leads").insert({
    email: email.trim().toLowerCase(),
    persona: matchResult.persona,
    answers,
    matched_strategy_ids: matchedIds,
    ip_address: ip,
  });
  if (insertError) {
    // Don't block showing results over a logging failure -- the user's
    // experience of getting their results matters more than us recording
    // the lead. Just surface it wasn't saved.
    console.error("quiz lead insert failed:", insertError.message);
  }

  return Response.json({
    persona: matchResult.persona,
    totalMatched: matchResult.totalMatched,
    results: matchResult.results,
  });
}
