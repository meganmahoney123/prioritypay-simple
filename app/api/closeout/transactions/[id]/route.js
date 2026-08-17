import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

const VALID = ["income", "expense", "exclude", "w2_income"];

// Auto-saves as the person taps through the transaction review list on the
// close-out screen -- one call per toggle, no separate "save" step, same
// immediacy as everywhere else in the app that edits a single field.
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { confirmedCategory } = await request.json();
  if (!VALID.includes(confirmedCategory)) {
    return Response.json({ error: "Invalid category." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin
    .from("simple_closeout_transactions")
    .update({ confirmed_category: confirmedCategory })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
