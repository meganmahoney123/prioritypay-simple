import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isBusinessPlan, businessPlanRequiredError, getBusinessBillingProfile } from "@/lib/subscription";
import { getValidAccessToken, fetchNetIncomeForMonth } from "@/lib/qbo";

// PHASE Q. Computes one month's profit-vs-deposit true-up for an entity:
// QBO's real ProfitAndLoss NetIncome vs. what PriorityPay itself tracked
// as confirmed net income for that entity's accounts over the same month,
// and stores the result as a durable snapshot (see the migration's
// simple_qbo_profit_snapshots comment for why it's stored rather than
// computed fresh on every read).
//
// "Tracked" net income reuses Close-Out's own confirmed transactions
// (simple_closeout_transactions) rather than raw Plaid data or the split
// engine's allocations -- those rows are the one place a human has
// already confirmed income vs. expense vs. excluded-transfer for real
// dollars, which is exactly the same bar Close-Out itself holds before
// trusting a number for retirement-room / tax-reserve math. A month whose
// Close-Out hasn't been confirmed yet can't be true-up'd against QBO
// for the same reason Close-Out won't compute its own numbers from an
// unconfirmed month either.
export async function POST(request) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const profile = await getBusinessBillingProfile(admin, user.id);
  if (!isBusinessPlan(profile)) return businessPlanRequiredError();

  const { entity_id, year, month } = await request.json();
  if (!year || !month) {
    return Response.json({ error: "year and month are required." }, { status: 400 });
  }
  const entityId = entity_id || null;

  // Find this entity's connected QBO company. If entity_id is null,
  // matches the connection stored under entity_id IS NULL (the
  // single-default-pool connection).
  let connQuery = admin.from("simple_qbo_connections").select("*").eq("user_id", user.id);
  connQuery = entityId ? connQuery.eq("entity_id", entityId) : connQuery.is("entity_id", null);
  const { data: connection } = await connQuery.single();
  if (!connection) {
    return Response.json({ error: "No QuickBooks connection for this entity." }, { status: 404 });
  }

  // This entity's accounts, so tracked deposits are scoped correctly --
  // null entity_id means "every account not assigned to a different
  // entity" (the default pool), matching how the migration treats null.
  let acctQuery = admin.from("simple_accounts").select("id").eq("user_id", user.id);
  acctQuery = entityId ? acctQuery.eq("entity_id", entityId) : acctQuery.is("entity_id", null);
  const { data: accounts } = await acctQuery;
  const accountIds = (accounts || []).map((a) => a.id);

  const period = `${year}-${String(month).padStart(2, "0")}-01`;
  const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  let trackedDeposits = null;
  if (accountIds.length) {
    const { data: closeout } = await admin
      .from("simple_monthly_closeouts")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("period", period)
      .single();

    if (closeout?.status === "confirmed") {
      const { data: txns } = await admin
        .from("simple_closeout_transactions")
        .select("amount, direction, confirmed_category")
        .eq("closeout_id", closeout.id)
        .in("account_id", accountIds)
        .not("confirmed_category", "is", null)
        .neq("confirmed_category", "exclude");

      trackedDeposits = (txns || []).reduce((sum, t) => {
        const signed = t.direction === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount);
        return sum + signed;
      }, 0);
    }
  }

  let qboNetIncome = null;
  try {
    const accessToken = await getValidAccessToken(admin, connection);
    qboNetIncome = await fetchNetIncomeForMonth({ accessToken, realmId: connection.realm_id, year, month });
  } catch (err) {
    console.error("QBO true-up: fetching net income failed", err?.message || err);
    return Response.json({ error: "Could not fetch QuickBooks data for this period." }, { status: 502 });
  }

  const variance = qboNetIncome !== null && trackedDeposits !== null ? qboNetIncome - trackedDeposits : null;

  // Manual upsert rather than .upsert({onConflict}) -- the uniqueness
  // constraint (see the migration) is a coalesce(entity_id, ...) expression
  // index, since a plain (user_id, entity_id, period) unique constraint
  // would let Postgres treat every null-entity row as distinct (NULL never
  // equals NULL in a uniqueness check). PostgREST's onConflict can't
  // target an expression index, so this does the same
  // find-then-update-or-insert /api/dev/set-persona already uses elsewhere
  // in this codebase for the same class of problem.
  let snapshotQuery = admin.from("simple_qbo_profit_snapshots").select("id").eq("user_id", user.id).eq("period", period);
  snapshotQuery = entityId ? snapshotQuery.eq("entity_id", entityId) : snapshotQuery.is("entity_id", null);
  const { data: existing } = await snapshotQuery.single();

  const row = {
    user_id: user.id,
    entity_id: entityId,
    period,
    qbo_net_income: qboNetIncome,
    tracked_deposits: trackedDeposits,
    variance,
  };

  let snapshot, error;
  if (existing) {
    ({ data: snapshot, error } = await admin
      .from("simple_qbo_profit_snapshots")
      .update(row)
      .eq("id", existing.id)
      .select("id, period, qbo_net_income, tracked_deposits, variance")
      .single());
  } else {
    ({ data: snapshot, error } = await admin
      .from("simple_qbo_profit_snapshots")
      .insert(row)
      .select("id, period, qbo_net_income, tracked_deposits, variance")
      .single());
  }
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    snapshot,
    periodEnd,
    note:
      trackedDeposits === null
        ? "Close-Out for this month hasn't been confirmed yet, so tracked deposits couldn't be computed."
        : null,
  });
}
