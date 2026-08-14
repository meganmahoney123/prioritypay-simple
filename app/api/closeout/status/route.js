import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// Lightweight check for the Dashboard nudge banner -- unlike GET
// /api/closeout/[period], this never creates a draft row or calls Plaid for
// transactions, it just looks up whatever's already there for last month.
// Deliberately checks last month, not the current (still in progress) one,
// since you can't close out a month that hasn't ended yet.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const now = new Date();
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const period = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, "0")}`;
  const periodDate = `${period}-01`;

  const { data: closeout } = await admin
    .from("simple_monthly_closeouts")
    .select("status")
    .eq("user_id", user.id)
    .eq("period", periodDate)
    .maybeSingle();

  return Response.json({ period, status: closeout?.status || "not_started" });
}
