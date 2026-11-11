import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { accountLabel } from "@/lib/accountLabel";

// "Needs a bank account" card on Split My Deposits: links ONE category (split
// rule) to a bank account without resaving the whole rule set.
//  1. Sets account_id on that rule, so Split Rules, the Savings Planner,
//     balances and every future split use the new account.
//  2. Turns that category's money from deposits still waiting on the
//     checklist (lines that were only "reserved" in the deposit account
//     because there was nowhere to send them) into real transfers to the new
//     account. Lines already marked as transferred, landed or skipped are
//     never touched.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const body = await request.json().catch(() => ({}));
  const ruleId = typeof body?.ruleId === "string" ? body.ruleId : null;
  const accountId = typeof body?.accountId === "string" ? body.accountId : null;
  if (!ruleId || !accountId) return Response.json({ error: "Choose a category and a bank account." }, { status: 400 });

  const { data: rule } = await admin
    .from("simple_split_rules_percent")
    .select("id, label, starting_balance")
    .eq("id", ruleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!rule) return Response.json({ error: "That category no longer exists. Refresh and try again." }, { status: 404 });

  const { data: account } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask, current_balance")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!account) return Response.json({ error: "That bank account was not found." }, { status: 404 });

  // Same rule as saving Split Rules: starting balances claimed against one
  // account can't add up to more than the account holds.
  const mine = Number(rule.starting_balance) || 0;
  if (mine > 0) {
    const { data: others } = await admin
      .from("simple_split_rules_percent")
      .select("starting_balance")
      .eq("user_id", user.id)
      .eq("account_id", accountId)
      .neq("id", ruleId);
    const total = (others || []).reduce((s, r) => s + (Number(r.starting_balance) || 0), mine);
    const balance = Number(account.current_balance) || 0;
    if (total > balance) {
      return Response.json(
        { error: `${rule.label} has a starting balance that would put ${account.institution_name} ${account.account_name} over what it holds. Lower the starting balance in Split Rules, or pick another account.` },
        { status: 400 }
      );
    }
  }

  const { error: ruleError } = await admin
    .from("simple_split_rules_percent")
    .update({ account_id: accountId })
    .eq("id", ruleId)
    .eq("user_id", user.id);
  if (ruleError) return Response.json({ error: ruleError.message }, { status: 500 });

  const { data: open } = await admin
    .from("simple_transfers")
    .select("id")
    .eq("user_id", user.id)
    .is("skipped_at", null)
    .eq("status", "needs_approval");
  const transferIds = (open || []).map((t) => t.id);

  let converted = 0;
  if (transferIds.length) {
    const { data: lines } = await admin
      .from("simple_transfer_allocations")
      .select("id, source_account_id")
      .in("transfer_id", transferIds)
      .eq("label", rule.label)
      .eq("status", "reserved")
      .eq("reserved_only", true)
      .is("dest_account_id", null);
    const label = accountLabel(account);
    for (const line of lines || []) {
      if (line.source_account_id === account.id) continue; // already in that account: nothing to send
      const { error } = await admin
        .from("simple_transfer_allocations")
        .update({ dest_account_id: account.id, dest_account_label: label, reserved_only: false, status: "needs_approval" })
        .eq("id", line.id);
      if (!error) converted += 1;
    }
  }

  return Response.json({ ok: true, converted });
}
