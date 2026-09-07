import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { isBusinessPlan, businessPlanRequiredError, getBusinessBillingProfile } from "@/lib/subscription";
import { getValidAccessToken, fetchNetIncomeForMonth, fetchTransactionsForMonth, monthEndDate } from "@/lib/qbo";

// Line-item reconciliation between QBO's transactions and PriorityPay's own
// confirmed closeout transactions for the same month. Matched greedily on
// (direction, absolute amount, date within DATE_WINDOW_DAYS) -- QBO and Plaid
// share no transaction ids, so amount is the only hard key, but requiring the
// same money-in/out direction stops an income being paired against a
// same-sized expense, and the date window stops two coincidentally-equal
// amounts in different weeks from matching. When several tracked rows are
// eligible, the closest date wins. Whatever doesn't pair off is what's driving
// the variance. Lists are capped so a pathological month stays bounded.
const MAX_UNMATCHED = 50;
const DATE_WINDOW_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const centsKey = (amount) => Math.round(Math.abs(Number(amount) || 0) * 100);

// Money-in vs money-out. PriorityPay stores it explicitly (direction). QBO's
// TransactionList doesn't, so we infer from the transaction type first (the
// unambiguous signal) and fall back to the natural amount's sign -- so the
// sign convention of subt_nat_amount doesn't have to be trusted on its own.
const QBO_OUT_TYPES = ["expense", "purchase", "bill", "check", "cash purchase", "vendor", "refund", "credit card credit"];
const QBO_IN_TYPES = ["deposit", "sales receipt", "invoice", "payment", "credit memo", "journal"];
function qboDirection(txn) {
  const t = (txn.type || "").toLowerCase();
  if (QBO_OUT_TYPES.some((k) => t.includes(k))) return "out";
  if (QBO_IN_TYPES.some((k) => t.includes(k))) return "in";
  return Number(txn.amount) < 0 ? "out" : "in";
}
const trackedDirection = (t) => (t.direction === "expense" ? "out" : "in");

// Absolute day gap between two date strings; a missing/unparseable date never
// blocks a match (returns 0), so amount+direction still pair those up.
function dayGap(a, b) {
  if (!a || !b) return 0;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return 0;
  return Math.abs(ta - tb) / DAY_MS;
}

function reconcile(qboTxns, trackedTxns) {
  // Bucket tracked txns by direction:absCents; within a bucket a QBO txn
  // claims the date-closest candidate that's inside the window.
  const pool = new Map();
  for (const t of trackedTxns) {
    const k = `${trackedDirection(t)}:${centsKey(t.amount)}`;
    if (!pool.has(k)) pool.set(k, []);
    pool.get(k).push(t);
  }
  const unmatchedQbo = [];
  let matched = 0;
  for (const q of qboTxns) {
    const bucket = pool.get(`${qboDirection(q)}:${centsKey(q.amount)}`);
    let bestIdx = -1;
    let bestGap = Infinity;
    if (bucket) {
      for (let i = 0; i < bucket.length; i++) {
        const gap = dayGap(q.date, bucket[i].txn_date);
        if (gap <= DATE_WINDOW_DAYS && gap < bestGap) {
          bestGap = gap;
          bestIdx = i;
        }
      }
    }
    if (bestIdx >= 0) {
      bucket.splice(bestIdx, 1);
      matched += 1;
    } else {
      unmatchedQbo.push({ date: q.date, type: q.type, name: q.name, amount: q.amount });
    }
  }
  const unmatchedTracked = [];
  for (const bucket of pool.values()) {
    for (const t of bucket) {
      unmatchedTracked.push({
        date: t.txn_date,
        name: t.name,
        amount: t.amount,
        direction: t.direction,
        category: t.confirmed_category,
      });
    }
  }
  return {
    matched,
    qboCount: qboTxns.length,
    trackedCount: trackedTxns.length,
    unmatchedQbo: unmatchedQbo.slice(0, MAX_UNMATCHED),
    unmatchedTracked: unmatchedTracked.slice(0, MAX_UNMATCHED),
    truncated: unmatchedQbo.length > MAX_UNMATCHED || unmatchedTracked.length > MAX_UNMATCHED,
  };
}

// PHASE T. Computes one month's profit-vs-deposit true-up for an entity:
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
  // Not .single(): an entity (or the default pool) can legitimately hold more
  // than one connected QBO company -- uniqueness is (user_id, realm_id), not
  // per entity -- and .single() ERRORS (not just returns null) on 2+ rows,
  // which would 404 a pool that actually has a connection. Take the
  // earliest-connected one deterministically.
  const { data: connRows } = await connQuery.order("created_at", { ascending: true }).limit(1);
  const connection = connRows?.[0];
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
  const periodEnd = monthEndDate(year, month);

  let trackedDeposits = null;
  let trackedTxns = []; // hoisted so the line-item reconciliation below can use them
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
        .select("txn_date, name, amount, direction, confirmed_category")
        .eq("closeout_id", closeout.id)
        .in("account_id", accountIds)
        .not("confirmed_category", "is", null)
        .neq("confirmed_category", "exclude");

      trackedTxns = txns || [];
      trackedDeposits = trackedTxns.reduce((sum, t) => {
        const signed = t.direction === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount);
        return sum + signed;
      }, 0);
    }
  }

  let qboNetIncome = null;
  let qboTxns = null; // null = transaction list unavailable (summary can still stand)
  try {
    const accessToken = await getValidAccessToken(admin, connection);
    qboNetIncome = await fetchNetIncomeForMonth({ accessToken, realmId: connection.realm_id, year, month });
    // The line-item list is a second report call. If ONLY this one fails,
    // don't sink the whole true-up -- the net summary is still useful, so we
    // just return without a breakdown (the note below explains).
    try {
      qboTxns = await fetchTransactionsForMonth({ accessToken, realmId: connection.realm_id, year, month });
    } catch (err2) {
      console.error("QBO true-up: fetching transaction list failed", err2?.message || err2);
    }
  } catch (err) {
    console.error("QBO true-up: fetching net income failed", err?.message || err);
    return Response.json({ error: "Could not fetch QuickBooks data for this period." }, { status: 502 });
  }

  const variance = qboNetIncome !== null && trackedDeposits !== null ? qboNetIncome - trackedDeposits : null;

  // Line-item breakdown of what's driving the variance. Only meaningful when
  // there's a confirmed Close-Out to compare against (trackedDeposits !== null)
  // AND we actually got QBO's transaction list.
  const reconciliation =
    trackedDeposits !== null && Array.isArray(qboTxns) ? reconcile(qboTxns, trackedTxns) : null;

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
    reconciliation,
    note:
      trackedDeposits === null
        ? "Close-Out for this month hasn't been confirmed yet, so tracked deposits couldn't be computed."
        : reconciliation === null
          ? "QuickBooks' transaction list couldn't be loaded, so only the net comparison is shown."
          : null,
  });
}
