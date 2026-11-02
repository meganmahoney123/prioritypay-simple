"use client";

import { Card, currency } from "@/components/ui";

// Plaid's personal_finance_category.primary values -> friendly labels.
const PFC_LABELS = {
  FOOD_AND_DRINK: "Food & Drink",
  GENERAL_MERCHANDISE: "Shopping",
  GENERAL_SERVICES: "Services",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  ENTERTAINMENT: "Entertainment",
  RENT_AND_UTILITIES: "Rent & Utilities",
  HOME_IMPROVEMENT: "Home",
  MEDICAL: "Medical",
  PERSONAL_CARE: "Personal Care",
  LOAN_PAYMENTS: "Loan Payments",
  BANK_FEES: "Bank Fees",
  GOVERNMENT_AND_NON_PROFIT: "Government & Giving",
};

function labelFor(pfc) {
  if (!pfc) return "Other";
  return PFC_LABELS[pfc] || pfc.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// Spend by Category: every outgoing charge this month that the person
// hasn't marked "Exclude" (internal transfers, card payments), grouped by
// Plaid's spending category. Same card for every persona.
export default function SpendByCategory({ transactions }) {
  const totals = {};
  let total = 0;
  (transactions || []).forEach((t) => {
    if (t.direction !== "out") return;
    if ((t.confirmed_category || t.suggested_category) === "exclude") return;
    if (t.pfc_primary === "TRANSFER_OUT" || t.pfc_primary === "TRANSFER_IN") return;
    const key = labelFor(t.pfc_primary);
    const amt = Number(t.amount) || 0;
    totals[key] = (totals[key] || 0) + amt;
    total += amt;
  });
  const rows = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold mb-1">Spend by Category</h2>
      <p className="text-xs text-[var(--color-neutral-700)] mb-4">
        Where your money went this month, from the charges across your linked accounts. Transfers between your own
        accounts aren&apos;t counted.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-neutral-700)]">No spending found for this month.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(([label, amount]) => {
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold">{label}</span>
                  <span className="font-mono">
                    {currency(amount)} <span style={{ color: "var(--color-neutral-700)" }}>({Math.round(pct)}%)</span>
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "var(--color-neutral-200)", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-accent)" }} />
                </div>
              </div>
            );
          })}
          <div className="pt-3 border-t border-[var(--color-divider)] flex items-center justify-between">
            <span className="text-sm font-semibold">Total spent</span>
            <span className="text-sm font-mono font-bold">{currency(total)}</span>
          </div>
        </div>
      )}
    </Card>
  );
}
