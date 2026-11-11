import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { FREQUENCY_VALUES } from "@/lib/bills";
import { DEMO_EMAILS } from "@/lib/demoEmails";

// Bills and autopays: recurring payments found in linked accounts (pending
// until confirmed) plus ones added by hand. Nothing here moves money.
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();
  const [billsRes, accountsRes] = await Promise.all([
    admin.from("simple_bills").select("*").eq("user_id", user.id).neq("status", "dismissed").order("next_due", { ascending: true }),
    admin.from("simple_accounts").select("id, institution_name, account_name, mask, current_balance").eq("user_id", user.id),
  ]);
  if (billsRes.error) {
    const missing = /simple_bills|relation|does not exist/i.test(billsRes.error.message || "");
    return Response.json({ error: missing ? "setup" : billsRes.error.message, needsSetup: missing }, { status: missing ? 200 : 500 });
  }
  return Response.json({
    canSeed: DEMO_EMAILS.has(user.email),
    bills: billsRes.data || [],
    accounts: (accountsRes.data || []).map((a) => ({
      id: a.id,
      label: `${a.institution_name || "Account"}${a.mask ? ` ••${a.mask}` : ""}`,
      name: a.account_name,
      balance: a.current_balance == null ? null : Number(a.current_balance),
    })),
  });
}

export function cleanBill(body, partial = false) {
  const out = {};
  if (!partial || body.name !== undefined) {
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return { error: "Give this payment a name." };
    out.name = name;
  }
  if (!partial || body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!(amount > 0) || amount > 1000000) return { error: "Enter the amount of the payment." };
    out.amount = Math.round(amount * 100) / 100;
  }
  if (!partial || body.frequency !== undefined) {
    if (!FREQUENCY_VALUES.includes(body.frequency)) return { error: "Choose how often it is paid." };
    out.frequency = body.frequency;
  }
  if (!partial || body.nextDue !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.nextDue || ""))) return { error: "Choose the next payment date." };
    out.next_due = body.nextDue;
  }
  if (body.accountId !== undefined) out.account_id = body.accountId || null;
  if (body.autopay !== undefined) out.autopay = Boolean(body.autopay);
  if (body.note !== undefined) out.note = typeof body.note === "string" ? body.note.trim().slice(0, 120) || null : null;
  if (body.status !== undefined) {
    if (!["pending", "confirmed", "dismissed"].includes(body.status)) return { error: "Invalid status." };
    out.status = body.status;
  }
  return { value: out };
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const { value, error } = cleanBill(body);
  if (error) return Response.json({ error }, { status: 400 });
  const admin = supabaseAdmin();
  if (value.account_id) {
    const { data: acc } = await admin.from("simple_accounts").select("id").eq("id", value.account_id).eq("user_id", user.id).maybeSingle();
    if (!acc) return Response.json({ error: "That account couldn't be found." }, { status: 404 });
  }
  const { count } = await admin.from("simple_bills").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count || 0) >= 100) return Response.json({ error: "That's the most payments we can track (100)." }, { status: 400 });
  const { data, error: insErr } = await admin
    .from("simple_bills")
    .insert({ ...value, user_id: user.id, source: "manual", status: "confirmed" })
    .select()
    .single();
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json({ bill: data });
}
