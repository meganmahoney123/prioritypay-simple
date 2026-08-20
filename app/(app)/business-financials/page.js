"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";
import { LEDGER_TOKENS, ledgerInputStyle } from "@/lib/ledgerTheme";

// Schedule C's own line items (the ones Megan approved) -- grouping and
// labels chosen to read naturally, not necessarily the IRS form's exact
// wording. Field keys match app/api/business-financials/route.js's FIELDS.
const EXPENSE_FIELDS = [
  { key: "advertising", label: "Advertising" },
  { key: "carAndTruck", label: "Car and truck expenses" },
  { key: "contractLabor", label: "Contract labor" },
  { key: "depreciation", label: "Depreciation" },
  { key: "insurance", label: "Insurance (other than health)" },
  { key: "legalAndProfessional", label: "Legal and professional fees" },
  { key: "officeExpense", label: "Office expense" },
  { key: "rent", label: "Rent or lease" },
  { key: "repairsAndMaintenance", label: "Repairs and maintenance" },
  { key: "supplies", label: "Supplies" },
  { key: "taxesAndLicenses", label: "Taxes and licenses" },
  { key: "travel", label: "Travel" },
  { key: "meals", label: "Deductible meals" },
  { key: "utilities", label: "Utilities" },
  { key: "wages", label: "Wages paid to employees" },
  { key: "otherExpenses", label: "Other expenses" },
];

const EMPTY = { grossReceipts: 0, costOfGoodsSold: 0 };
EXPENSE_FIELDS.forEach((f) => (EMPTY[f.key] = 0));

const currency = (n) =>
  (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-heading)",
          fontSize: 12,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "color-mix(in srgb, var(--color-text) 60%, transparent)",
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ color: "var(--color-neutral-600)" }}>$</span>
        <input
          type="number"
          min={0}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          style={ledgerInputStyle({ fontSize: 15, padding: "9px 2px" })}
        />
      </div>
    </div>
  );
}

export default function BusinessFinancialsPage() {
  const [taxYear] = useState(new Date().getUTCFullYear());
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/business-financials?year=${taxYear}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.financials) setData({ ...EMPTY, ...d.financials });
        setLoading(false);
      });
  }, [taxYear]);

  function update(key, value) {
    setSaved(false);
    setData((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    await fetch("/api/business-financials", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taxYear, ...data }),
    });
    setSaving(false);
    setSaved(true);
  }

  const totalExpenses = EXPENSE_FIELDS.reduce((s, f) => s + (Number(data[f.key]) || 0), 0);
  const netProfit = (Number(data.grossReceipts) || 0) - (Number(data.costOfGoodsSold) || 0) - totalExpenses;

  if (loading) return <p style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", ...LEDGER_TOKENS }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "0 0 8px" }}>Business Financials</h1>
        <p style={{ margin: 0, color: "var(--color-neutral-700)", fontSize: 15, lineHeight: 1.5 }}>
          If you run a separate business entity (LLC, S-corp, or C-corp), PriorityPay only sees what moves through
          your personal accounts -- not your real business revenue and expenses. Fill in these totals from your
          bookkeeping or last year's return (they follow Schedule C's own categories) and the{" "}
          <a href="/advisor" style={{ color: "var(--color-accent-700)" }}>Tax Strategy Assistant</a> will use your real
          numbers instead of guessing. Sole proprietors with no separate entity can skip this -- your personal
          account data already is the complete picture.
        </p>
      </div>

      <Card style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 0 4px" }}>
          Income -- {taxYear}
        </h2>
        <div style={{ height: 1, background: "var(--color-divider)", margin: "10px 0 22px" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <NumberField label="Gross receipts or sales" value={data.grossReceipts} onChange={(v) => update("grossReceipts", v)} />
          <NumberField label="Cost of goods sold" value={data.costOfGoodsSold} onChange={(v) => update("costOfGoodsSold", v)} />
        </div>
      </Card>

      <Card style={{ padding: 28, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 400, margin: "0 0 4px" }}>Expenses</h2>
        <div style={{ height: 1, background: "var(--color-divider)", margin: "10px 0 22px" }} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {EXPENSE_FIELDS.map((f) => (
            <NumberField key={f.key} label={f.label} value={data[f.key]} onChange={(v) => update(f.key, v)} />
          ))}
        </div>
      </Card>

      <Card style={{ padding: 24, marginBottom: 20, background: "var(--color-surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-heading)", fontSize: 18 }}>
          <span>Net profit</span>
          <span>{currency(netProfit)}</span>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--color-neutral-600)" }}>
          Gross receipts minus cost of goods sold minus total expenses ({currency(totalExpenses)}). This is the figure
          the assistant will use for entity comparisons, retirement room, and tax reserve sizing.
        </p>
      </Card>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </PrimaryButton>
        {saved && (
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontStyle: "italic", color: "var(--color-accent-700)" }}>
            Saved.
          </span>
        )}
      </div>
    </div>
  );
}
