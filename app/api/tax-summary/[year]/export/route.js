import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";

function periodsForYear(year) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const lastFinishedMonth = year === currentYear ? currentMonth - 1 : 12;
  const periods = [];
  for (let m = 1; m <= lastFinishedMonth; m++) {
    periods.push(`${year}-${String(m).padStart(2, "0")}`);
  }
  return periods;
}

const CATEGORY_LABELS = {
  income: "Income",
  w2_income: "W2 Income",
  expense: "Expense",
  exclude: "Excluded (transfer)",
  business: "Business (excluded -- see accountant)",
};

// RFC 4180-ish: wrap in quotes and double any embedded quotes whenever a
// field could contain a comma, quote, or newline (merchant names are the
// only genuinely unpredictable field here).
function csvField(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// A full transaction-level export, not just the monthly totals from
// GET /api/tax-summary/[year] -- meant to be handed directly to an
// accountant or imported into tax software, so every row PriorityPay saw
// is here (including excluded transfers, clearly labeled, so nothing
// looks silently dropped) along with whether the person actually reviewed
// it or it's still just Plaid's auto-suggestion.
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return Response.json({ error: "Invalid year." }, { status: 400 });
  }
  const admin = supabaseAdmin();
  const periods = periodsForYear(year);

  const { data: accounts } = await admin
    .from("simple_accounts")
    .select("id, institution_name, account_name, mask")
    .eq("user_id", user.id);
  const accountLabel = new Map(
    (accounts || []).map((a) => [a.id, `${a.institution_name} ${a.account_name} ...${a.mask || ""}`.trim()])
  );

  let allRows = [];
  try {
    const perMonth = await Promise.all(
      periods.map((period) => ensureCloseoutForPeriod(admin, user.id, period))
    );
    perMonth.forEach(({ transactions }) => {
      allRows = allRows.concat(transactions);
    });
  } catch (err) {
    return Response.json({ error: err.message || "Could not build the export." }, { status: 500 });
  }

  allRows.sort((a, b) => (a.txn_date < b.txn_date ? -1 : a.txn_date > b.txn_date ? 1 : 0));

  const header = ["Date", "Description", "Account", "Category", "Reviewed", "Amount"];
  const lines = [header.join(",")];
  for (const t of allRows) {
    const category = t.confirmed_category || t.suggested_category;
    lines.push(
      [
        csvField(t.txn_date),
        csvField(t.name),
        csvField(accountLabel.get(t.account_id) || ""),
        csvField(CATEGORY_LABELS[category] || category),
        csvField(t.confirmed_category ? "Yes" : "No (auto-suggested)"),
        csvField(Number(t.amount).toFixed(2)),
      ].join(",")
    );
  }
  const csv = lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="PriorityPay-Tax-Summary-${year}.csv"`,
    },
  });
}
