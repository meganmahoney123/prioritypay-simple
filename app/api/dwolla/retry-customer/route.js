import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { dwollaClient } from "@/lib/dwolla";

// Handles Dwolla's documented "retry" recovery path: when a personal
// Customer's initial identity-verification attempt scores too low, Dwolla
// gives one more chance -- but per their docs, it must be genuinely new
// information (re-sending the same data reproduces the same failure), and
// the full 9-digit SSN is required on this attempt (last-4 was enough on
// the first try, it isn't here). See
// https://developers.dwolla.com/docs/balance/personal-verified-customer#handling-status---retry
//
// This POSTs to the *existing* Dwolla customer's own URL (an update, not
// a new customer) -- calling create-customer again here would just hit
// the "duplicate email" branch and re-link the same still-failing
// customer without ever giving Dwolla corrected data.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { firstName, lastName, address1, city, state, postalCode, dateOfBirth, ssn } = body;

  if (!firstName || !lastName || !address1 || !city || !state || !postalCode || !dateOfBirth || !ssn) {
    return Response.json({ error: "Missing required identity fields." }, { status: 400 });
  }
  if (String(ssn).replace(/\D/g, "").length !== 9) {
    return Response.json({ error: "Full 9-digit SSN is required to retry verification." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: existing, error: lookupError } = await admin
    .from("simple_dwolla_customers")
    .select("dwolla_customer_url, verification_status")
    .eq("user_id", user.id)
    .single();

  if (lookupError || !existing?.dwolla_customer_url) {
    return Response.json({ error: "No existing Dwolla customer found to retry. Start identity verification from scratch instead." }, { status: 400 });
  }
  if (existing.verification_status !== "retry") {
    return Response.json({ error: `This account isn't in a retry state (current status: ${existing.verification_status || "unknown"}).` }, { status: 400 });
  }

  try {
    await dwollaClient().post(existing.dwolla_customer_url, {
      firstName,
      lastName,
      email: user.email,
      type: "personal",
      address1,
      city,
      state,
      postalCode,
      dateOfBirth,
      ssn, // full 9 digits, required on retry
    });

    const fetched = await dwollaClient().get(existing.dwolla_customer_url);
    const verificationStatus = fetched.body?.status || "retry";

    const { error: dbError } = await admin
      .from("simple_dwolla_customers")
      .update({ verification_status: verificationStatus })
      .eq("user_id", user.id);
    if (dbError) throw dbError;

    return Response.json({ ok: true, status: verificationStatus });
  } catch (err) {
    const dwollaError = err?.body || err?.message || String(err);
    const embeddedMessages = Array.isArray(dwollaError?._embedded?.errors)
      ? dwollaError._embedded.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).filter(Boolean)
      : [];
    console.error("Dwolla retry-customer failed:", JSON.stringify(dwollaError, null, 2));
    return Response.json(
      { error: embeddedMessages.join(" ") || dwollaError?.message || "Dwolla rejected the retry attempt.", detail: dwollaError },
      { status: 400 }
    );
  }
}
