import { requireUser, unauthorized } from "@/lib/apiAuth";
import { supabaseAdmin } from "@/lib/supabaseServer";
import { ensureCloseoutForPeriod } from "@/lib/closeoutSync";
import { loadBusinessRows } from "@/lib/businesses";
import { ENTITY_OPTIONS, paysByDraw } from "@/lib/entityCopy";

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
  investment_income: "Investment income (not business)",
  misc_income: "Miscellaneous (not business)",
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
// accountant or imported into tax software, so every row PrioritySave saw
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

  // Saved businesses, and cash business expenses from Withdrawals (not tied
  // to a linked charge), so each business section is complete.
  const businesses = await loadBusinessRows(admin, user.id);
  let cashRows = [];
  try {
    const { data: withdrawals } = await admin
      .from("simple_withdrawals")
      .select("id, amount, description, occurred_at, category_label, source_type, closeout_transaction_id, business_id")
      .eq("user_id", user.id)
      .limit(2000);
    cashRows = (withdrawals || []).filter(
      (w) => w.business_id && !w.closeout_transaction_id && (w.source_type || "cash") === "cash" && String(w.occurred_at || "").slice(0, 4) === String(year)
    );
  } catch (_) {
    cashRows = [];
  }

  const entityName = (type) => ENTITY_OPTIONS.find((o) => o.value === type)?.label || "";
  const money = (n) => Number(n || 0).toFixed(2);
  const row = (t, categoryOverride) => {
    const category = t.confirmed_category || t.suggested_category;
    return [
      csvField(t.txn_date),
      csvField(t.name),
      csvField(accountLabel.get(t.account_id) || ""),
      csvField(categoryOverride || CATEGORY_LABELS[category] || category),
      csvField(t.confirmed_category ? "Yes" : "No (auto-suggested)"),
      csvField(money(t.amount)),
    ].join(",");
  };
  const catOf = (t) => t.confirmed_category || t.suggested_category;
  const byBiz = Object.fromEntries(businesses.map((b) => [b.id, { income: [], expenses: [] }]));
  const other = [];
  const unassigned = [];
  const personal = [];
  allRows.forEach((t) => {
    const c = catOf(t);
    if (c === "income") (t.business_id && byBiz[t.business_id] ? byBiz[t.business_id].income : unassigned).push(t);
    else if (c === "expense") (t.business_id && byBiz[t.business_id] ? byBiz[t.business_id].expenses : unassigned).push(t);
    else if (c === "w2_income" || c === "investment_income" || c === "misc_income") other.push(t);
    else if (c === "business") unassigned.push(t);
    else personal.push(t);
  });
  cashRows.forEach((w) => {
    if (!byBiz[w.business_id]) return;
    byBiz[w.business_id].expenses.push({
      txn_date: String(w.occurred_at).slice(0, 10),
      name: `${w.description || "Cash expense"}${w.category_label ? ` (${w.category_label})` : ""}`,
      account_id: null,
      confirmed_category: "expense",
      suggested_category: "expense",
      amount: w.amount,
    });
  });
  const sum = (list) => list.reduce((a, t) => a + (Number(t.amount) || 0), 0);
  const header = ["Date", "Description", "Account", "Category", "Reviewed", "Amount"].join(",");

  // Single-purpose reports: ?report=business:<id> | income | personal.
  // No report param keeps the all-in-one export below.
  const report = new URL(request.url).searchParams.get("report") || "";
  const respond = (lines, name) =>
    new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name.replace(/[^A-Za-z0-9._-]+/g, "-")}-${year}.csv"`,
      },
    });
  if (report.startsWith("business:")) {
    const b = businesses.find((x) => x.id === report.slice("business:".length));
    if (!b) return Response.json({ error: "Business not found." }, { status: 404 });
    const { income, expenses } = byBiz[b.id];
    const out = [csvField(`${b.name}${entityName(b.entityType) ? ` (${entityName(b.entityType)})` : ""}: income and expenses for ${year}`), csvField("Not tax advice; confirm with your accountant."), "", header];
    out.push(csvField("Income"));
    income.forEach((t) => out.push(row(t, "Income")));
    out.push(["", "", "", csvField("Total income"), "", money(sum(income))].join(","));
    out.push("");
    out.push(csvField("Expenses"));
    expenses.forEach((t) => out.push(row(t, "Expense")));
    out.push(["", "", "", csvField("Total expenses"), "", money(sum(expenses))].join(","));
    out.push("");
    out.push(["", "", "", csvField("Net profit"), "", money(sum(income) - sum(expenses))].join(","));
    return respond(out, `PrioritySave-${b.name}`);
  }
  if (report === "income") {
    const drawIds = new Set(businesses.filter((b) => paysByDraw(b.entityType)).map((b) => b.id));
    const nameOf = Object.fromEntries(businesses.map((b) => [b.id, b.name]));
    const sourceOf = (t) => {
      const c = catOf(t);
      if (c === "w2_income") return "W-2 paycheck";
      if (c === "investment_income") return "Investment income";
      if (c === "misc_income") return "Miscellaneous";
      if (c === "income") return t.business_id && drawIds.has(t.business_id) ? "Owner's draw" : "Sole proprietor business";
      return null;
    };
    const incomeRows = allRows.filter((t) => sourceOf(t));
    const out = [csvField(`All income for ${year}, every source`), csvField("Not tax advice; confirm with your accountant."), "", ["Date", "Description", "Account", "Source", "Business", "Reviewed", "Amount"].join(",")];
    incomeRows.forEach((t) =>
      out.push([csvField(t.txn_date), csvField(t.name), csvField(accountLabel.get(t.account_id) || ""), csvField(sourceOf(t)), csvField(nameOf[t.business_id] || ""), csvField(t.confirmed_category ? "Yes" : "No (auto-suggested)"), csvField(money(t.amount))].join(","))
    );
    out.push("");
    ["Sole proprietor business", "Owner's draw", "W-2 paycheck", "Investment income", "Miscellaneous"].forEach((label) => {
      const list = incomeRows.filter((t) => sourceOf(t) === label);
      if (list.length) out.push(["", "", "", csvField(`Total ${label}`), "", "", money(sum(list))].join(","));
    });
    out.push(["", "", "", csvField("Total income"), "", "", money(sum(incomeRows))].join(","));
    return respond(out, "PrioritySave-All-income");
  }
  if (report === "personal") {
    // Personal spending the person marked Personal. Money moving between their
    // own accounts (transfers) is not an expense, so it is left out here.
    const list = personal.filter((t) => t.direction === "out" && t.pfc_primary !== "TRANSFER_OUT" && t.pfc_primary !== "TRANSFER_IN" && t.pfc_primary !== "LOAN_PAYMENTS");
    const out = [csvField(`Personal expenses for ${year}`), csvField("Spending marked Personal. Transfers between your own accounts and card payments are not included."), "", ["Date", "Description", "Account", "Reviewed", "Amount"].join(",")];
    list.forEach((t) => out.push([csvField(t.txn_date), csvField(t.name), csvField(accountLabel.get(t.account_id) || ""), csvField(t.confirmed_category ? "Yes" : "No (auto-suggested)"), csvField(money(t.amount))].join(",")));
    out.push(["", "", csvField("Total personal expenses"), "", money(sum(list))].join(","));
    return respond(out, "PrioritySave-Personal-expenses");
  }

  const lines = [];
  lines.push(csvField(`PrioritySave income and expenses for ${year}`));
  lines.push(csvField("A summary and one section per business, so each can go on its own Schedule C. Not tax advice; confirm with your accountant."));
  lines.push("");
  lines.push(["BUSINESS SUMMARY", "Type", "Income", "Expenses", "Net profit"].map(csvField).join(","));
  businesses.forEach((b) => {
    const inc = sum(byBiz[b.id].income);
    const exp = sum(byBiz[b.id].expenses);
    lines.push([csvField(b.name), csvField(entityName(b.entityType)), money(inc), money(exp), money(inc - exp)].join(","));
  });
  lines.push("");

  businesses.forEach((b) => {
    const { income, expenses } = byBiz[b.id];
    lines.push(csvField(`BUSINESS: ${b.name}${entityName(b.entityType) ? ` (${entityName(b.entityType)})` : ""}`));
    lines.push(header);
    lines.push(csvField("Income"));
    income.forEach((t) => lines.push(row(t, "Income")));
    lines.push(["", "", "", csvField("Total income"), "", money(sum(income))].join(","));
    lines.push(csvField("Expenses"));
    expenses.forEach((t) => lines.push(row(t, "Expense")));
    lines.push(["", "", "", csvField("Total expenses"), "", money(sum(expenses))].join(","));
    lines.push(["", "", "", csvField("Net profit"), "", money(sum(income) - sum(expenses))].join(","));
    lines.push("");
  });

  if (other.length) {
    lines.push(csvField("OTHER INCOME (not from a business)"));
    lines.push(header);
    other.forEach((t) => lines.push(row(t)));
    lines.push(["", "", "", csvField("Total"), "", money(sum(other))].join(","));
    lines.push("");
  }
  if (unassigned.length) {
    lines.push(csvField("NOT ASSIGNED TO A BUSINESS YET"));
    lines.push(header);
    unassigned.forEach((t) => lines.push(row(t)));
    lines.push("");
  }
  if (personal.length) {
    lines.push(csvField("PERSONAL AND EXCLUDED (transfers, personal spending, not counted)"));
    lines.push(header);
    personal.forEach((t) => lines.push(row(t)));
    lines.push("");
  }
  const csv = lines.join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="PrioritySave-Tax-Summary-${year}.csv"`,
    },
  });
}
