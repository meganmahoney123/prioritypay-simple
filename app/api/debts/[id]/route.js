import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { DEBT_TYPES } from "@/lib/debtPayoff";

const TYPE_VALUES = DEBT_TYPES.map((t) => t.value);

// Edit one debt, or log a payment against it ({ payment: 250 } lowers the
// balance and marks the debt paid off when it reaches zero).
export async function PATCH(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const admin = supabaseAdmin();

  const { data: debt } = await admin.from("simple_debts").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!debt) return Response.json({ error: "Debt not found." }, { status: 404 });

  const update = {};
  if (body.payment !== undefined) {
    const payment = Number(body.payment);
    if (!(payment > 0)) return Response.json({ error: "Enter a payment above $0." }, { status: 400 });
    const next = Math.max(0, Math.round((Number(debt.balance) - payment) * 100) / 100);
    update.balance = next;
    update.paid_off_at = next <= 0 ? new Date().toISOString() : null;
  }
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 60);
  if (TYPE_VALUES.includes(body.debtType)) update.debt_type = body.debtType;
  if (body.balance !== undefined) {
    const b = Number(body.balance);
    if (!(b >= 0)) return Response.json({ error: "Balance can't be negative." }, { status: 400 });
    update.balance = b;
    update.paid_off_at = b <= 0 ? new Date().toISOString() : null;
  }
  if (body.apr !== undefined) {
    const a = Number(body.apr);
    if (!(a >= 0 && a <= 100)) return Response.json({ error: "Enter the interest rate (APR) as a percent." }, { status: 400 });
    update.apr = a;
  }
  if (body.minPayment !== undefined) {
    const m = Number(body.minPayment);
    if (!(m >= 0)) return Response.json({ error: "The minimum payment can't be negative." }, { status: 400 });
    update.min_payment = m;
  }
  if (!Object.keys(update).length) return Response.json({ error: "Nothing to save." }, { status: 400 });

  const { error } = await admin.from("simple_debts").update(update).eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // A debt payment can also be recorded as a withdrawal, so it shows up in
  // Withdrawals and lowers the Debt Payoff category the same way any other
  // spending does. It never moves money.
  let withdrawalLogged = false;
  if (body.payment !== undefined && body.recordWithdrawal) {
    const payment = Math.round(Number(body.payment) * 100) / 100;
    const { data: cat } = await admin
      .from("simple_split_rules_percent")
      .select("id")
      .eq("user_id", user.id)
      .eq("label", "Debt Payoff")
      .limit(1);
    const hasCategory = !!(cat && cat.length);
    const { data: w, error: wErr } = await admin
      .from("simple_withdrawals")
      .insert({
        user_id: user.id,
        amount: payment,
        description: `Debt payment: ${debt.name}`,
        occurred_at: new Date().toISOString(),
        category_label: "Debt Payoff",
        source_type: "cash",
      })
      .select()
      .single();
    if (!wErr && w) {
      const { error: aErr } = await admin.from("simple_withdrawal_allocations").insert([
        { withdrawal_id: w.id, label: hasCategory ? "Debt Payoff" : debt.name, amount: payment, source_type: hasCategory ? "category" : "external" },
      ]);
      withdrawalLogged = !aErr;
    }
  }
  return Response.json({ ok: true, withdrawalLogged });
}

export async function DELETE(_request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const { error } = await supabaseAdmin().from("simple_debts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
