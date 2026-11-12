import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// "Do you have a 401k through this job?" -> Yes. Adds a workplace 401k row
// (or reuses an existing one), pointed at the chosen account. Takes 5% where
// it fits under 100% in total. Used for W-2 paychecks only, so it never mixes
// with a Solo 401k or SEP IRA.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { accountId } = await request.json().catch(() => ({}));
  const admin = supabaseAdmin();

  if (accountId) {
    const { data: acct } = await admin.from("simple_accounts").select("id").eq("id", accountId).eq("user_id", user.id).maybeSingle();
    if (!acct) return Response.json({ error: "That account isn't connected." }, { status: 400 });
  }

  const { data: rows, error } = await admin.from("simple_split_rules_percent").select("id, pct, retirement_type").eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const existing = (rows || []).find((r) => r.retirement_type === "traditional_401k");
  const total = (rows || []).reduce((s, r) => s + (Number(r.pct) || 0), 0);
  const room = Math.max(0, Math.round((100 - total) * 100) / 100);

  if (existing) {
    const patch = { ...(accountId ? { account_id: accountId } : {}), ...(Number(existing.pct) > 0 ? {} : { pct: Math.min(5, room) }) };
    if (Object.keys(patch).length) {
      const { error: upErr } = await admin.from("simple_split_rules_percent").update(patch).eq("id", existing.id);
      if (upErr) return Response.json({ error: upErr.message }, { status: 500 });
    }
    return Response.json({ ok: true });
  }

  const pct = Math.min(5, room);
  if (pct <= 0) {
    return Response.json({ error: "Your splits already add up to 100%. Lower another category in Deposit Splits, then add your 401k." }, { status: 409 });
  }
  const { error: insErr } = await admin.from("simple_split_rules_percent").insert({
    user_id: user.id,
    label: "401k",
    group_name: "Retirement",
    pct,
    color: "#8b5cf6",
    account_id: accountId || null,
    retirement_type: "traditional_401k",
  });
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 });
  return Response.json({ ok: true, pct });
}
