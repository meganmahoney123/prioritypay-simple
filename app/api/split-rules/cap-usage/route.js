import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Read-only numbers behind the progress bars on the Monthly / Total limit
// cards in Split Rules: per category (by label), how much has been sent this
// month and the running total. Same math runSplit uses to enforce the limits,
// so the bar always matches what the next split will actually do.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const now = new Date();
  const monthStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  const [{ data: rules }, { data: monthRows }, { data: allAllocs }, { data: manualRows }, { data: wdRows }] = await Promise.all([
    admin.from("simple_split_rules_percent").select("label, starting_balance").eq("user_id", user.id),
    admin
      .from("simple_transfer_allocations")
      .select("amount, label, simple_transfers!inner(user_id, created_at)")
      .eq("simple_transfers.user_id", user.id)
      .gte("simple_transfers.created_at", monthStartIso)
      .neq("status", "failed")
      .neq("status", "skipped")
      .eq("category_type", "percent"),
    admin
      .from("simple_transfer_allocations")
      .select("label, amount, simple_transfers!inner(user_id)")
      .eq("simple_transfers.user_id", user.id)
      .neq("status", "failed")
      .neq("status", "skipped"),
    admin.from("simple_manual_contributions").select("label, amount").eq("user_id", user.id),
    admin
      .from("simple_withdrawal_allocations")
      .select("label, amount, simple_withdrawals!inner(user_id)")
      .eq("simple_withdrawals.user_id", user.id)
      .eq("source_type", "category"),
  ]);

  const usage = {};
  const bucket = (label) => (usage[label] ||= { month: 0, total: 0 });
  (rules || []).forEach((r) => { bucket(r.label).total += Number(r.starting_balance) || 0; });
  (monthRows || []).forEach((a) => { bucket(a.label).month += Number(a.amount) || 0; });
  (allAllocs || []).forEach((a) => { bucket(a.label).total += Number(a.amount) || 0; });
  (manualRows || []).forEach((a) => { bucket(a.label).total += Number(a.amount) || 0; });
  (wdRows || []).forEach((a) => { if (a.label) bucket(a.label).total -= Number(a.amount) || 0; });
  Object.values(usage).forEach((u) => { u.total = Math.max(0, u.total); });

  return Response.json({ usage });
}
