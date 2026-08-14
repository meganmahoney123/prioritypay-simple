import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { data } = await supabaseAdmin()
    .from("dwolla_customers")
    .select("verification_status")
    .eq("user_id", user.id)
    .single();

  return Response.json({ verified: !!data, status: data?.verification_status || null });
}
