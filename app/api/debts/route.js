import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { DEBT_TYPES, METHODS } from "@/lib/debtPayoff";

// The Debt Payoff plan: the person's debts plus their method and the extra
// amount they put toward debt each month. Nothing here moves money; it only
// stores numbers the person enters and feeds the calculator on /debt.
const TYPE_VALUES = DEBT_TYPES.map((t) => t.value);
const MAX_DEBTS = 20;

const toDebt = (r) => ({
  id: r.id,
  name: r.name,
  debtType: r.debt_type,
  balance: Number(r.balance) || 0,
  apr: Number(r.apr) || 0,
  minPayment: Number(r.min_payment) || 0,
  paidOffAt: r.paid_off_at,
});

// A friendly starting extra: 10% of what has been deposited per month lately,
// rounded to $25. The person can change it; it is only a suggestion.
async function suggestedExtra(admin, userId) {
  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await admin
      .from("simple_transfers")
      .select("source_amount, skipped_at")
      .eq("user_id", userId)
      .gte("created_at", since);
    const total = (data || []).filter((t) => !t.skipped_at).reduce((s, t) => s + (Number(t.source_amount) || 0), 0);
    const monthly = total / 3;
    return monthly > 0 ? Math.max(25, Math.round((monthly * 0.1) / 25) * 25) : 100;
  } catch {
    return 100;
  }
}

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: rows, error } = await admin.from("simple_debts").select("*").eq("user_id", user.id).order("created_at", { ascending: true });
  if (error) return Response.json({ error: error.message, needsSetup: /simple_debts/.test(error.message) }, { status: 500 });
  const { data: profile } = await admin.from("simple_profiles").select("*").eq("id", user.id).single();
  const { data: rules } = await admin.from("simple_split_rules_percent").select("label, pct").eq("user_id", user.id).eq("label", "Debt Payoff");

  return Response.json({
    debts: (rows || []).map(toDebt),
    method: METHODS.includes(profile?.debt_method) ? profile.debt_method : "avalanche",
    extra: profile?.debt_extra === null || profile?.debt_extra === undefined ? null : Number(profile.debt_extra),
    suggestedExtra: await suggestedExtra(admin, user.id),
    hasCategory: !!rules?.length,
    categoryPct: rules?.length ? Number(rules[0].pct) || 0 : null,
  });
}

// Adds a debt.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
  const balance = Number(body.balance);
  const apr = Number(body.apr);
  const minPayment = Number(body.minPayment || 0);
  if (!name) return Response.json({ error: "Give this debt a name." }, { status: 400 });
  if (!(balance > 0)) return Response.json({ error: "Enter what you still owe." }, { status: 400 });
  if (!(apr >= 0 && apr <= 100)) return Response.json({ error: "Enter the interest rate (APR) as a percent, like 22.9." }, { status: 400 });
  if (!(minPayment >= 0)) return Response.json({ error: "The minimum payment can't be negative." }, { status: 400 });
  const debtType = TYPE_VALUES.includes(body.debtType) ? body.debtType : "other";

  const admin = supabaseAdmin();
  const { count } = await admin.from("simple_debts").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("paid_off_at", null);
  if ((count || 0) >= MAX_DEBTS) return Response.json({ error: `You can track up to ${MAX_DEBTS} debts at a time.` }, { status: 400 });

  const { data, error } = await admin
    .from("simple_debts")
    .insert({ user_id: user.id, name, debt_type: debtType, balance, apr, min_payment: minPayment })
    .select("*")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ debt: toDebt(data) });
}

// Saves the method and the monthly extra.
export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.method !== undefined) {
    if (!METHODS.includes(body.method)) return Response.json({ error: "Method must be avalanche or snowball." }, { status: 400 });
    update.debt_method = body.method;
  }
  if (body.extra !== undefined) {
    const extra = Number(body.extra);
    if (!(extra >= 0 && extra <= 1000000)) return Response.json({ error: "Enter an extra amount of $0 or more." }, { status: 400 });
    update.debt_extra = Math.round(extra * 100) / 100;
  }
  if (!Object.keys(update).length) return Response.json({ error: "Nothing to save." }, { status: 400 });
  const { error } = await supabaseAdmin().from("simple_profiles").update(update).eq("id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
