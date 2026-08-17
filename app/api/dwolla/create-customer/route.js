import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { dwollaClient, dwollaApiBase } from "@/lib/dwolla";

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

    await persistCustomer({ userId: user.id, customerId, customerUrl, verificationStatus: "pending" });

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

    // Recovery path: this specific error means Dwolla already has a
    // Customer for this email, but our own `simple_dwolla_customers` row
    // never got written (e.g. the upsert failed/timed out on a *previous*
    // attempt, or a request died between the two steps). Without this,
    // that user is stuck forever -- every retry recreates the same Dwolla
    // rejection with nothing in our DB to point at. Instead of failing,
    // look the existing customer up by email and link it to this user.
    const isDuplicateEmail = Array.isArray(dwollaError?._embedded?.errors)
      ? dwollaError._embedded.errors.some(
          (e) => e.path === "/email" && /already exists/i.test(e.message || "")
        )
      : false;

    if (isDuplicateEmail) {
      try {
        const recovered = await findDwollaCustomerByEmail(user.email);
        if (recovered) {
          await persistCustomer({
            userId: user.id,
            customerId: recovered.id,
            customerUrl: recovered.url,
            verificationStatus: recovered.status || "pending",
          });
          console.warn(
            `Dwolla create-customer: recovered orphaned customer ${recovered.id} for ${user.email} after duplicate-email error.`
          );
          return Response.json({ ok: true, customerId: recovered.id, recovered: true });
        }
        console.error(
          `Dwolla create-customer: got duplicate-email error for ${user.email} but no matching customer found via search.`
        );
      } catch (lookupErr) {
        console.error("Dwolla create-customer: recovery lookup failed:", lookupErr?.body || lookupErr?.message || String(lookupErr));
      }
    }

    const readableDetail = embeddedMessages.length
      ? embeddedMessages.join(" ")
      : dwollaError?.message || String(dwollaError);

    console.error("Dwolla create-customer failed:", JSON.stringify(dwollaError, null, 2));
    return Response.json({ error: readableDetail || "Dwolla rejected this identity info.", detail: dwollaError }, { status: 400 });
  }
}

async function persistCustomer({ userId, customerId, customerUrl, verificationStatus }) {
  const admin = supabaseAdmin();
  const { error: dbError } = await admin.from("simple_dwolla_customers").upsert({
    user_id: userId,
    dwolla_customer_id: customerId,
    dwolla_customer_url: customerUrl,
    verification_status: verificationStatus,
  });
  if (dbError) throw dbError;
}

// Dwolla doesn't expose a "get customer by exact email" endpoint -- only
// `GET /customers?search=` which substring-matches across name/email/etc,
// so we still filter the results ourselves for an exact (case-insensitive)
// email match before trusting one.
async function findDwollaCustomerByEmail(email) {
  const res = await dwollaClient().get("customers", { search: email, limit: 200 });
  const customers = res.body?._embedded?.customers || [];
  const match = customers.find((c) => (c.email || "").toLowerCase() === email.toLowerCase());
  if (!match) return null;
  const url = match._links?.self?.href || `${dwollaApiBase()}/customers/${match.id}`;
  const id = match.id || url.split("/").pop();
  return { id, url, status: match.status };
}
