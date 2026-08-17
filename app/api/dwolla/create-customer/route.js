import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { dwollaClient } from "@/lib/dwolla";

// Creates the user's Dwolla "Customer" record -- required before any
// funding source can be attached or any transfer initiated. Because this
// user will SEND money (checking -> other buckets), not just receive it,
// Dwolla requires a fully-verified Customer, which means real identity
// fields. We pass them straight through to Dwolla and do NOT persist SSN,
// date of birth, or address anywhere in our own database -- only the
// resulting Dwolla customer id/url are stored.
//
// In sandbox, Dwolla accepts documented test values to simulate verified /
// retry / document-required outcomes -- see
// https://developers.dwolla.com/docs/balance/testing-with-sandbox
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { firstName, lastName, address1, city, state, postalCode, dateOfBirth, ssn } = body;

  if (!firstName || !lastName || !address1 || !city || !state || !postalCode || !dateOfBirth || !ssn) {
    return Response.json({ error: "Missing required identity fields." }, { status: 400 });
  }

  try {
    const response = await dwollaClient().post("customers", {
      firstName,
      lastName,
      email: user.email,
      type: "personal",
      address1,
      city,
      state,
      postalCode,
      dateOfBirth, // YYYY-MM-DD
      ssn, // last 4 digits, or full SSN depending on your Dwolla risk tier -- confirm with Dwolla before production
    });

    const customerUrl = response.headers.get("location");
    const customerId = customerUrl.split("/").pop();

    const admin = supabaseAdmin();
    const { error: dbError } = await admin.from("simple_dwolla_customers").upsert({
      user_id: user.id,
      dwolla_customer_id: customerId,
      dwolla_customer_url: customerUrl,
      verification_status: "pending",
    });
    if (dbError) throw dbError;

    return Response.json({ ok: true, customerId });
  } catch (err) {
    // dwolla-v2 throws with the parsed JSON error body on `err.body` --
    // the top-level `message` is usually just "Validation error(s)
    // present," the field-specific reason lives one level down in
    // `_embedded.errors`. console.error'ing the raw object truncates that
    // nested array (Node's default util.inspect depth), so build a flat,
    // readable string for both the server log and the client response.
    const dwollaError = err?.body || err?.message || String(err);
    const embeddedMessages = Array.isArray(dwollaError?._embedded?.errors)
      ? dwollaError._embedded.errors.map((e) => (e.path ? `${e.path}: ${e.message}` : e.message)).filter(Boolean)
      : [];
    const readableDetail = embeddedMessages.length
      ? embeddedMessages.join(" ")
      : dwollaError?.message || String(dwollaError);

    console.error("Dwolla create-customer failed:", JSON.stringify(dwollaError, null, 2));
    return Response.json({ error: readableDetail || "Dwolla rejected this identity info.", detail: dwollaError }, { status: 400 });
  }
}
