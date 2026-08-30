import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// DEV/DEMO ONLY. The new "How all your money is allocated right now" pie
// (components/TotalAllocationSection.js) only has anything to chart once
// at least one category has a nonzero combined balance -- and a freshly
// created category with a $0 starting balance and no contributions yet
// (like the ones currently showing "$0 this year" on Accounts) has
// nothing to show. This is a one-click way to top up whatever categories
// already exist for the calling user with a modest demo balance (as
// simple_manual_contributions rows, same mechanism as a real "one-time
// contribution" -- see /api/allocations/manual-contribution) purely so the
// new pie has slices to preview.
//
// Idempotent: previously-seeded demo rows (matched by note) are deleted
// before inserting fresh ones, so this can be safely re-run without
// balances climbing every time it's hit.
//
// Auth is the same requireUser() cookie check every other route in this
// app uses -- there's no separate admin/service-role login needed. Whoever
// is logged into the app and hits this endpoint seeds their OWN account
// only.
const DEMO_NOTE = "Demo data — total allocation preview";

// Cycles through a few round, presentable amounts so different categories
// don't all show the exact same balance.
const DEMO_AMOUNTS = [2400, 1150, 3800, 640, 5200, 900];

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: rules } = await admin
    .from("simple_split_rules_percent")
    .select("label, retirement_type")
    .eq("user_id", user.id);

  if (!rules || !rules.length) {
    return Response.json(
      { error: "No categories found yet — add at least one category on the Income Split Rules page first." },
      { status: 400 }
    );
  }

  // Clear any previously-seeded demo rows for this user so re-running
  // this doesn't keep stacking balances higher.
  await admin.from("simple_manual_contributions").delete().eq("user_id", user.id).eq("note", DEMO_NOTE);

  const now = new Date().toISOString();
  const rows = rules.map((r, i) => ({
    user_id: user.id,
    label: r.label,
    amount: DEMO_AMOUNTS[i % DEMO_AMOUNTS.length],
    note: DEMO_NOTE,
    occurred_at: now,
  }));

  const { error } = await admin.from("simple_manual_contributions").insert(rows);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // If a real retirement account is already linked (Solo 401k/SEP IRA),
  // also bump ITS real Plaid balance a bit so the combined "real invested
  // + still-in-savings" total shown for that category actually reflects
  // both halves rather than just the manual-contribution half.
  const { data: retirementLinks } = await admin
    .from("simple_retirement_accounts")
    .select("account_id")
    .eq("user_id", user.id);
  if (retirementLinks?.length) {
    for (const link of retirementLinks) {
      const { data: acc } = await admin
        .from("simple_accounts")
        .select("current_balance")
        .eq("id", link.account_id)
        .maybeSingle();
      if (acc) {
        await admin
          .from("simple_accounts")
          .update({ current_balance: Math.max(Number(acc.current_balance) || 0, 18500) })
          .eq("id", link.account_id);
      }
    }
  }

  return Response.json({ ok: true, categoriesSeeded: rows.length });
}
