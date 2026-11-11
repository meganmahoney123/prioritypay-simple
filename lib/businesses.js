import { paysByDraw } from "@/lib/entityCopy";

// Saved businesses (Settings, Your profile). Empty when none have been saved
// yet or the table doesn't exist, so callers can send the person to Settings.
export async function loadBusinessRows(admin, userId) {
  const { data, error } = await admin
    .from("simple_businesses")
    .select("id, name, entity_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((b) => ({ id: b.id, name: (b.name || "").trim() || "My business", entityType: b.entity_type || "" }));
}

// A sole proprietor keeps the deposit itself (self-employed income rules);
// every other structure pays its owner by draw.
export function typeForBusiness(entityType) {
  return paysByDraw(entityType) ? "owner_draw" : "self_employed";
}

export const isBizType = (t) => t === "self_employed" || t === "owner_draw";

// What a deposit type means in Close Out.
export function closeoutCategoryFor(depositType) {
  if (isBizType(depositType)) return "income";
  if (depositType === "w2") return "w2_income";
  return "exclude";
}

// Writes a deposit's type (and business) onto the matching Close Out row, so
// nobody classifies the same deposit twice. Best effort: skipped when the
// Close Out row doesn't exist yet (it picks the answer up when it is created)
// or the business_id column isn't there yet.
export async function syncDepositToCloseout(admin, userId, { plaidTransactionId, depositType, businessId }) {
  if (!plaidTransactionId || !depositType) return;
  if (isBizType(depositType) && !businessId) return;
  const base = { confirmed_category: closeoutCategoryFor(depositType) };
  const res = await admin
    .from("simple_closeout_transactions")
    .update({ ...base, business_id: isBizType(depositType) ? businessId : null })
    .eq("user_id", userId)
    .eq("plaid_transaction_id", plaidTransactionId);
  if (res.error) {
    await admin.from("simple_closeout_transactions").update(base).eq("user_id", userId).eq("plaid_transaction_id", plaidTransactionId);
  }
}
