import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// "business" is a manual-only reclassification -- suggestCategory (see
// lib/closeoutSync.js) never auto-suggests it. Only ever offered in the
// UI for the "Business Owner (With Employees)" persona (whose accounts
// can be commingled with the business), for a transaction that landed on
// a personal account but actually belongs to the business side -- see the
// Close-Out category buttons and the confirm route's netIncome math,
// which excludes it from personal income/expenses the same way "exclude"
// already does for internal transfers.
const VALID = ["income", "expense", "exclude", "w2_income", "business"];

// Auto-saves as the person taps through the transaction review list on the
// close-out screen -- one call per toggle, no separate "save" step, same
// immediacy as everywhere else in the app that edits a single field.
//
// Also accepts `incomeSource` on its own (confirmedCategory is optional in
// that case) -- the free-text "who was this from" note on an Income row
// (simple_closeout_transactions.income_source), saved on blur from the
// inline column next to the category pills. Kept as a separate optional
// field rather than folded into confirmedCategory so noting a source
// doesn't require re-sending/re-validating the category too.
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { confirmedCategory, incomeSource } = await request.json();

  const update = {};
  if (confirmedCategory !== undefined) {
    if (!VALID.includes(confirmedCategory)) {
      return Response.json({ error: "Invalid category." }, { status: 400 });
    }
    update.confirmed_category = confirmedCategory;
  }
  if (incomeSource !== undefined) {
    update.income_source = incomeSource || null;
  }
  if (Object.keys(update).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { id } = await params;
  const { error } = await admin
    .from("simple_closeout_transactions")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
