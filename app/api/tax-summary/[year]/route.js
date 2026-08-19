import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";

// Which "YYYY-MM" periods count for a given tax year: every month of a
// past year, or (for the current year) every month that's actually
// finished -- same "don't work from an incomplete month" rule Close-Out
// itself uses. The current, still-in-progress month is deliberately left
// out entirely rather than shown as an empty/wrong row.
function periodsForYear(year) {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1; // 1-12
  const lastFinishedMonth = year === currentYear ? currentMonth - 1 : 12;
  const periods = [];
  for (let m = 1; m <= lastFinishedMonth; m++) {
    periods.push(`${year}-${String(m).padStart(2, "0")}`);
  }
  return periods;
}

function categoryOf(t) {
  return t.confirmed_category || t.suggested_category;
}

function summarize(transactions) {
  let income = 0;
  let w2Income = 0;
  let expense = 0;
  // Transactions flagged "Business" in Close-Out (Business Owner With
  // Employees persona, commingled accounts) -- excluded from net the same
  // as always (this branch never adds to income/w2Income/expense), but
  // tracked and returned separately so Tax Summary can show it back
  // instead of it silently vanishing like an internal transfer would.
  let business = 0;
  transactions.forEach((t) => {
    const cat = categoryOf(t);
    const amt = Number(t.amount) || 0;
    if (cat === "income") income += amt;
    else if (cat === "w2_income") w2Income += amt;
    else if (cat === "expense") expense += amt;
    else if (cat === "business") business += amt;
  });
  return { income, w2Income, expense, business, net: income + w2Income - expense };
}

// Pulls (or creates, backfilling from Plaid for any month the person never
// manually opened Close-Out for) every finished month of the requested
// year, and returns a monthly + annual rollup of the same categorized
// data Close-Out already produces. Nothing here writes anything besides
// what ensureCloseoutForPeriod already would from a normal Close-Out
// visit -- this is purely a read/aggregate on top of it.
export async function GET(request, { params }) {
  const user = await requireUser();
  if (!user) return unauthorized();
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return Response.json({ error: "Invalid year." }, { status: 400 });
  }
  const admin = supabaseAdmin();
  const periods = periodsForYear(year);

  let results;
  try {
    results = await Promise.all(
      periods.map(async (period) => {
        const { closeout, transactions } = await ensureCloseoutForPeriod(admin, user.id, period);
        return { period, status: closeout.status, ...summarize(transactions) };
      })
    );
  } catch (err) {
    return Response.json({ error: err.message || "Could not build the tax summary." }, { status: 500 });
  }

  const totals = results.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      w2Income: acc.w2Income + m.w2Income,
      expense: acc.expense + m.expense,
      business: acc.business + m.business,
      net: acc.net + m.net,
    }),
    { income: 0, w2Income: 0, expense: 0, business: 0, net: 0 }
  );
  const confirmedMonths = results.filter((m) => m.status === "confirmed").length;

  return Response.json({
    year,
    months: results,
    totals,
    confirmedMonths,
    totalMonths: results.length,
  });
}
