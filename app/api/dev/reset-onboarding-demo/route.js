import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// DEMO ONLY. Sibling to /api/dev/provision-demo-persona, but the opposite
// job: instead of seeding a finished end-state account, this creates (or
// wipes back to) a genuinely fresh, un-onboarded account so Megan can walk
// a prospect through the real onboarding wizard itself (app/onboarding/
// page.js's Welcome -> Business -> Connect Accounts -> Percentage Splits
// -> Starting Balances -> Deposit Alerts steps), not a pre-filled
// dashboard. Only megan@ignitemysite.com can call it, and it only ever
// touches the one hardcoded TARGET_EMAIL below.
//
// Deliberately does NOT touch Stripe at all, in either direction -- the
// last onboarding step hands off to a real Stripe Checkout redirect (see
// app/api/onboarding/confirm-payment), and this endpoint has no opinion on
// whether that Stripe account is in test or live mode. Demo the wizard up
// through Deposit Alerts, then call this again before the next walkthrough
// rather than actually completing checkout each time.
const CALLER_EMAIL = "megan@ignitemysite.com";
const TARGET_EMAIL = "megan+onboarding@ignitemysite.com";
const DEMO_PASSWORD = "PriorityPayDemo2026!";

export async function POST() {
  const user = await requireUser();
  if (!user) return unauthorized();
  if ((user.email || "").toLowerCase() !== CALLER_EMAIL) {
    return Response.json({ error: "This endpoint can only be called from the verified demo owner account." }, { status: 403 });
  }

  const admin = supabaseAdmin();

  // 1) Find or create the target auth user, same pattern as
  // provision-demo-persona. email_confirm: true skips the verification
  // click -- there's no inbox automation here to click it.
  let targetUserId = null;
  {
    let page = 1;
    while (!targetUserId) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) return Response.json({ error: error.message }, { status: 500 });
      const found = (data.users || []).find((u) => (u.email || "").toLowerCase() === TARGET_EMAIL);
      if (found) { targetUserId = found.id; break; }
      if (!data.users || data.users.length < 200) break;
      page += 1;
    }
  }
  if (!targetUserId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: TARGET_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (createError) return Response.json({ error: createError.message }, { status: 500 });
    targetUserId = created.user.id;
  }

  // 2) Wipe anything a previous walkthrough left behind -- accounts,
  // split rules, transfers/allocations, entities, QBO connections. A full
  // wipe (not just demo_seed-tagged rows) because the whole point is that
  // this account should look exactly like a brand-new signup every time,
  // including anything a prospect added by hand while clicking through
  // onboarding themselves.
  const { data: accounts } = await admin.from("simple_accounts").select("id").eq("user_id", targetUserId);
  const accountIds = (accounts || []).map((a) => a.id);

  const { data: transfers } = await admin.from("simple_transfers").select("id").eq("user_id", targetUserId);
  const transferIds = (transfers || []).map((t) => t.id);
  if (transferIds.length) {
    await admin.from("simple_transfer_allocations").delete().in("transfer_id", transferIds);
    await admin.from("simple_transfers").delete().in("id", transferIds);
  }

  await admin.from("simple_split_rules_percent").delete().eq("user_id", targetUserId);
  await admin.from("simple_qbo_profit_snapshots").delete().eq("user_id", targetUserId);
  await admin.from("simple_qbo_connections").delete().eq("user_id", targetUserId);
  await admin.from("simple_entities").delete().eq("user_id", targetUserId);
  if (accountIds.length) {
    await admin.from("simple_accounts").delete().in("id", accountIds);
  }

  // 3) Reset the profile itself to a brand-new-signup shape. onboarded:
  // false is what sends them to /onboarding on next login (see the
  // (app)/layout.js gate) -- everything else here just makes sure no
  // stray state from a previous walkthrough (a persona, a business name,
  // a Business-tier bump) carries over into the next one.
  const { error: profileError } = await admin
    .from("simple_profiles")
    .update({
      onboarded: false,
      persona: null,
      business_name: null,
      entity_type: null,
      plan: "simple",
      subscription_status: "trialing",
      trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      stripe_customer_id: null,
      stripe_subscription_id: null,
    })
    .eq("id", targetUserId);
  if (profileError) return Response.json({ error: profileError.message }, { status: 500 });

  return Response.json({ email: TARGET_EMAIL, password: DEMO_PASSWORD, onboarded: false });
}
