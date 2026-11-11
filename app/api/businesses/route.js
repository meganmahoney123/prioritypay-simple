import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { loadBusinessRows } from "@/lib/businesses";

// The person's saved businesses (Settings, Your profile), used by the
// dropdowns that attribute income and expenses to a business.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  return Response.json({ businesses: await loadBusinessRows(supabaseAdmin(), user.id) });
}
