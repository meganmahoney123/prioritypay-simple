import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { DEMO_EMAILS } from "@/lib/demoEmails";
import { toIso } from "@/lib/bills";

// DEMO ONLY. Fills Bills and Autopays with sample payments. mode "main" gives
// the full page (confirmed bills, one needing an OK); mode "confirm" gives
// the first-time "we found 8 recurring payments" screen. Replaces only the
// rows this route created (note starts with "demo:"), and adds sample
// accounts only when they don't already exist.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  if (!DEMO_EMAILS.has(user.email)) return Response.json({ error: "Demo accounts only." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "confirm" ? "confirm" : "main";
  const admin = supabaseAdmin();

  async function ensureAccount(institution, accountName, mask, balance) {
    const { data: found } = await admin.from("simple_accounts").select("id").eq("user_id", user.id).eq("mask", mask).maybeSingle();
    if (found) return found.id;
    const { data, error } = await admin
      .from("simple_accounts")
      .insert({ user_id: user.id, institution_name: institution, account_name: accountName, mask, subtype: "checking", account_type: "depository", current_balance: balance })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }

  try {
    const chase = await ensureAccount("Chase", "Checking", "4421", 4100);
    const cap = await ensureAccount("Capital One", "Checking", "1188", 2950);
    await admin.from("simple_bills").delete().eq("user_id", user.id).like("note", "demo:%");

    const today = new Date();
    const base = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const inDays = (n) => toIso(new Date(base.getTime() + n * 86400000));
    // First occurrence of a yearly date (month 0-11, day) after today.
    const nextYearly = (m, d) => {
      let y = base.getUTCFullYear();
      if (new Date(Date.UTC(y, m, d)) <= base) y += 1;
      return toIso(new Date(Date.UTC(y, m, d)));
    };
    const mk = (name, note, amount, frequency, next_due, account_id, extra = {}) => ({
      user_id: user.id, name, note: `demo:${note}`, amount, frequency, next_due, account_id,
      source: "detected", status: "confirmed", autopay: false, ...extra,
    });

    const rows = mode === "confirm"
      ? [
          mk("Rent", "", 1850, "monthly", inDays(20), chase, { status: "pending" }),
          mk("Car loan", "", 310, "monthly", inDays(24), cap, { status: "pending" }),
          mk("Visa card payment", "", 95, "monthly", inDays(22), chase, { status: "pending" }),
          mk("Netflix", "", 15.49, "monthly", inDays(27), chase, { status: "pending" }),
          mk("Car insurance", "", 642, "semiannual", inDays(30), chase, { status: "pending" }),
          mk("Adobe Creative Cloud", "", 263.88, "yearly", nextYearly(2, 14), chase, { status: "pending" }),
          mk("Venmo to Alex", "", 40, "monthly", inDays(12), chase, { status: "pending" }),
          mk("Amazon", "", 62, "weekly", inDays(3), chase, { status: "pending" }),
        ]
      : [
          mk("Rent", "Parkview Apartments", 1850, "monthly", inDays(20), chase, { autopay: true }),
          mk("Visa card (minimum)", "Linked to your Debt Payoff plan", 95, "monthly", inDays(22), chase, { autopay: true }),
          mk("Car loan", "Toyota Financial", 310, "monthly", inDays(24), cap, { autopay: true }),
          mk("Netflix", "", 15.49, "monthly", inDays(27), chase, { autopay: true }),
          mk("Student loan", "Nelnet", 100, "monthly", inDays(29), null, { source: "manual" }),
          mk("Car insurance", "GEICO", 642, "semiannual", inDays(30), chase, { status: "pending" }),
          mk("Adobe Creative Cloud", "", 263.88, "yearly", nextYearly(2, 14), chase, { autopay: true }),
        ];
    const { error } = await admin.from("simple_bills").insert(rows);
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true, mode, seeded: rows.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
