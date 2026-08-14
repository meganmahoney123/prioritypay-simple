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
    const { error: dbError } = await admin.from("dwolla_customers").upsert({
      user_id: user.id,
      dwolla_customer_id: customerId,
      dwolla_customer_url: customerUrl,
      verification_status: "pending",
    });
    if (dbError) throw dbError;

    return Response.json({ ok: true, customerId });
  } catch (err) {
    const dwollaError = err?.body || err?.message || String(err);
    console.error("Dwolla create-customer failed:", dwollaError);
    return Response.json({ error: "Dwolla rejected this identity info.", detail: dwollaError }, { status: 400 });
  }
}
