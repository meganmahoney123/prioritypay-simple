import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { data: transfers, error } = await supabaseAdmin()
    .from("simple_transfers")
    .select("id, source_amount, status, trigger, created_at, transfer_allocations(label, amount, category_type, reserved_only)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ transfers });
}
