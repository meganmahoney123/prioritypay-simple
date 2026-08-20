import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";

// The Schedule-C-style fields this route reads/writes -- kept as one list
// so GET's row-to-JSON shape and PUT's JSON-to-row shape can't drift out
// of sync with each other.
const FIELDS = [
  ["grossReceipts", "gross_receipts"],
  ["costOfGoodsSold", "cost_of_goods_sold"],
  ["advertising", "advertising"],
  ["carAndTruck", "car_and_truck"],
  ["contractLabor", "contract_labor"],
  ["depreciation", "depreciation"],
  ["insurance", "insurance"],
  ["legalAndProfessional", "legal_and_professional"],
  ["officeExpense", "office_expense"],
  ["rent", "rent"],
  ["repairsAndMaintenance", "repairs_and_maintenance"],
  ["supplies", "supplies"],
  ["taxesAndLicenses", "taxes_and_licenses"],
  ["travel", "travel"],
  ["meals", "meals"],
  ["utilities", "utilities"],
  ["wages", "wages"],
  ["otherExpenses", "other_expenses"],
];

function rowToJson(row) {
  const out = { taxYear: row.tax_year, updatedAt: row.updated_at };
  FIELDS.forEach(([jsonKey, col]) => {
    out[jsonKey] = Number(row[col] || 0);
  });
  return out;
}

// GET /api/business-financials?year=2026 -- defaults to the current
// calendar year. Returns { financials: null } if nothing's been entered
// for that year yet, rather than a 404 -- an empty form is a normal state
// here, not an error.
export async function GET(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getUTCFullYear();

  const admin = supabaseAdmin();
  const { data, error } = await admin
    .from("simple_business_financials")
    .select("*")
    .eq("user_id", user.id)
    .eq("tax_year", year)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ financials: data ? rowToJson(data) : null });
}

// PUT { taxYear, ...FIELDS } -- upserts the one row for that user+year.
// Every field defaults to 0 if omitted, matching the DB column defaults,
// so a partial save (someone fills in half the form and comes back later)
// never leaves a field null.
export async function PUT(request) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const taxYear = Number(body.taxYear) || new Date().getUTCFullYear();

  const row = { user_id: user.id, tax_year: taxYear, updated_at: new Date().toISOString() };
  FIELDS.forEach(([jsonKey, col]) => {
    row[col] = Math.max(0, Number(body[jsonKey]) || 0);
  });

  const admin = supabaseAdmin();
  const { error } = await admin.from("simple_business_financials").upsert(row, { onConflict: "user_id,tax_year" });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
