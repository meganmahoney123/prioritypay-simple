import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { investmentTypeFromLabel } from "@/lib/allocations";

// PriorityPay Simple has no fixed-minimums layer at all -- every category is
// a percentage of each deposit, full stop. `fixed` is kept as an always-empty
// array in the response shape purely so shared components ported from the
// original app (AccountBalances, etc.) that still read `splitRules.fixed`
// keep working with zero special-casing -- there is no split_rules_fixed
// table in this project's database, and PUT silently ignores any `fixed`
// payload a caller might send.
function rowToPercent(r) {
  return {
    id: r.id,
    label: r.label,
    group: r.group_name,
    pct: Number(r.pct),
    max: r.cap === null ? null : Number(r.cap),
    balanceCap: r.balance_cap === null ? null : Number(r.balance_cap),
    color: r.color,
    accountId: r.account_id,
    retirementType: r.retirement_type || null,
    investmentType: r.investment_type || null,
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: percent, error } = await admin
    .from("simple_split_rules_percent")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    splitRules: {
      fixed: [],
      percent: (percent || []).map(rowToPercent),
    },
  });
}

// Replaces the user's whole rule set. Simple "delete then insert in order"
// rather than diffing -- fine at this scale (a few dozen rows per user).
export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { percent } = await request.json();
  const admin = supabaseAdmin();

  await admin.from("simple_split_rules_percent").delete().eq("user_id", user.id);

  if (percent?.length) {
    const rows = percent.map((r) => ({
      user_id: user.id,
      label: r.label,
      group_name: r.group || null,
      pct: Number(r.pct) || 0,
      cap: r.max === null || r.max === undefined || r.max === "" ? null : Number(r.max),
      balance_cap: r.balanceCap === null || r.balanceCap === undefined || r.balanceCap === "" ? null : Number(r.balanceCap),
      color: r.color,
      account_id: r.accountId || null,
      retirement_type: r.retirementType || null,
      // Derived server-side from group + retirementType + label, same
      // reasoning as the original app: multiple distinct investment-flavored
      // categories (a brokerage AND a crypto exchange, say) get separate
      // tracking buckets instead of colliding under one generic type.
      investment_type: r.group === "Investments" && !r.retirementType ? investmentTypeFromLabel(r.label) : null,
    }));
    const { error } = await admin.from("simple_split_rules_percent").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
