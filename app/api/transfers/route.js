import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  // NOTE: `status` and `dest_account_id` are included below on purpose --
  // they were missing before manual-approval transfers existed, which
  // silently made the History page's per-allocation status badge render
  // "undefined" (see components/HistoryPage's statusTone()/Badge usage).
  // `dest_account_id` lets History show where a needs_approval/completed
  // manual line was actually supposed to go.
  const { data: transfers, error } = await supabaseAdmin()
    .from("simple_transfers")
    .select(
      "id, source_amount, status, trigger, created_at, simple_transfer_allocations(id, label, amount, category_type, reserved_only, status, dest_account_id, confirmed_at)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ transfers });
}
