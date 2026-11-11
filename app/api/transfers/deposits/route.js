import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { DEPOSIT_TYPES, typeOptionsFor, guessDepositType, effectLine } from "@/lib/depositTypes";
import { loadBusinessRows, typeForBusiness } from "@/lib/businesses";

// Deposit-grouped transfer checklist (components/PendingTransfers.js).
// Returns:
//  - deposits: every deposit with at least one line still waiting on the
//    user ('needs_approval') or marked as transferred but not yet landed
//    ('in_transit'), with ALL of its lines (including ones that stay in the
//    deposit account) so each card can show the full breakdown.
//  - skipped: deposits skipped in the last 90 days, so a skip can be undone.
const SKIPPED_WINDOW_DAYS = 90;

const TRANSFER_FIELDS =
  "id, source_amount, status, trigger, created_at, deposit_name, skipped_at, skip_reason, plaid_transaction_id, " +
  "simple_transfer_allocations(id, label, amount, calculated_amount, status, reserved_only, dest_account_id, dest_account_label, " +
  "source_account_id, source_account_label, confirmed_at, settled_at, candidate_transaction_id, candidate_amount, candidate_date, confirm_batch_id)";

export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();
  const admin = supabaseAdmin();

  const { data: openLines, error: openError } = await admin
    .from("simple_transfer_allocations")
    .select("transfer_id, simple_transfers!inner(user_id, skipped_at)")
    .eq("simple_transfers.user_id", user.id)
    .is("simple_transfers.skipped_at", null)
    .in("status", ["needs_approval", "in_transit"]);
  if (openError) return Response.json({ error: openError.message }, { status: 500 });

  const openIds = Array.from(new Set((openLines || []).map((r) => r.transfer_id)));
  const since = new Date(Date.now() - SKIPPED_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [openRes, skippedRes] = await Promise.all([
    openIds.length
      ? admin.from("simple_transfers").select(TRANSFER_FIELDS).eq("user_id", user.id).in("id", openIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("simple_transfers")
      .select(TRANSFER_FIELDS)
      .eq("user_id", user.id)
      .not("skipped_at", "is", null)
      .gte("skipped_at", since),
  ]);
  if (openRes.error) return Response.json({ error: openRes.error.message }, { status: 500 });
  if (skippedRes.error) return Response.json({ error: skippedRes.error.message }, { status: 500 });

  const all = [...(openRes.data || []), ...(skippedRes.data || [])];

  // Name fallback for deposits recorded before deposit_name existed (or
  // whose Close-Out transaction was imported later): same Plaid
  // transaction id in Close-Out's imported transactions.
  const missingNameIds = all.filter((t) => !t.deposit_name && t.plaid_transaction_id).map((t) => t.plaid_transaction_id);
  if (missingNameIds.length) {
    const { data: named } = await admin
      .from("simple_closeout_transactions")
      .select("plaid_transaction_id, name")
      .eq("user_id", user.id)
      .in("plaid_transaction_id", missingNameIds);
    const nameById = Object.fromEntries((named || []).filter((n) => n.name).map((n) => [n.plaid_transaction_id, n.name]));
    all.forEach((t) => {
      if (!t.deposit_name && nameById[t.plaid_transaction_id]) t.deposit_name = nameById[t.plaid_transaction_id];
    });
  }

  // Stored deposit type (simple_transfers.deposit_type). Read in its own
  // query so everything keeps working until that column exists.
  const typeById = {};
  const businessById = {};
  if (all.length) {
    const ids = all.map((t) => t.id);
    const withBiz = await admin.from("simple_transfers").select("id, deposit_type, business_id").eq("user_id", user.id).in("id", ids);
    if (!withBiz.error) {
      (withBiz.data || []).forEach((k) => { typeById[k.id] = k.deposit_type; businessById[k.id] = k.business_id; });
    } else {
      const { data: types, error: typeError } = await admin.from("simple_transfers").select("id, deposit_type").eq("user_id", user.id).in("id", ids);
      if (!typeError) (types || []).forEach((k) => { typeById[k.id] = k.deposit_type; });
    }
  }
  const businesses = await loadBusinessRows(admin, user.id);
  const { data: profile } = await admin.from("simple_profiles").select("*").eq("id", user.id).single();
  const typeOptions = typeOptionsFor(profile);
  const { data: ruleRows } = await admin.from("simple_split_rules_percent").select("label, pct, retirement_type").eq("user_id", user.id);
  const rules = (ruleRows || []).map((r) => ({ label: r.label, pct: r.pct, retirementType: r.retirement_type || null }));
  const effects = Object.fromEntries(Object.keys(DEPOSIT_TYPES).map((k) => [k, effectLine(k, rules)]));

  const shape = (t) => ({
    id: t.id,
    sourceAmount: Number(t.source_amount) || 0,
    status: t.status,
    trigger: t.trigger,
    createdAt: t.created_at,
    name: t.deposit_name || null,
    // The saved type if there is one; otherwise a guess from the deposit's
    // name and the person's onboarding answers.
    depositType: typeById[t.id] || guessDepositType({ profile, name: t.deposit_name }),
    typeSaved: Boolean(typeById[t.id]),
    businessId: businessById[t.id] || null,
    skippedAt: t.skipped_at,
    skipReason: t.skip_reason,
    lines: (t.simple_transfer_allocations || []).map((a) => ({
      ...a,
      amount: Number(a.amount) || 0,
      calculated_amount: a.calculated_amount == null ? null : Number(a.calculated_amount),
    })),
  });

  const byNewest = (a, b) => (a.createdAt < b.createdAt ? 1 : -1);
  // Biz income replaces Self-employed income and Owner's draw in the list:
  // the business picked decides which of the two rule sets applies.
  const hasBiz = typeOptions.includes("self_employed") || typeOptions.includes("owner_draw");
  const optionList = [];
  typeOptions.forEach((v) => {
    if (v === "self_employed" || v === "owner_draw") {
      if (!optionList.some((o) => o.value === "biz")) optionList.push({ value: "biz", label: "Biz income", effect: effects.self_employed });
    } else optionList.push({ value: v, label: DEPOSIT_TYPES[v], effect: effects[v] });
  });
  return Response.json({
    hasBiz,
    businesses: businesses.map((b) => ({ ...b, depositType: typeForBusiness(b.entityType) })),
    effects,
    typeOptions: optionList,
    typeLabels: DEPOSIT_TYPES,
    deposits: all.filter((t) => !t.skipped_at).map(shape).sort(byNewest),
    skipped: all
      .filter((t) => t.skipped_at)
      .map(shape)
      .sort((a, b) => (a.skippedAt < b.skippedAt ? 1 : -1)),
  });
}
