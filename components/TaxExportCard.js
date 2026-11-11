"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Card } from "@/components/ui";
import { paysByDraw } from "@/lib/entityCopy";

const btn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  textAlign: "left",
  border: "2px solid #9A72F0",
  borderRadius: 14,
  background: "#fff",
  color: "#241337",
  fontWeight: 700,
  fontSize: 14.5,
  padding: "11px 14px",
  cursor: "pointer",
};

// Close Out's export card: separate CSV reports for tax time. One per sole
// proprietor business (its income, expenses and net profit, ready for its own
// Schedule C), one with all income from every source, and one with personal
// expenses only. The all-in-one file is still there too.
export default function TaxExportCard() {
  const thisYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const [businesses, setBusinesses] = useState([]);
  const years = [thisYear, thisYear - 1, thisYear - 2];

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then((d) => setBusinesses((d.businesses || []).filter((b) => !paysByDraw(b.entityType))))
      .catch(() => setBusinesses([]));
  }, []);

  const download = (report) => window.open(`/api/tax-summary/${year}/export${report ? `?report=${encodeURIComponent(report)}` : ""}`, "_blank");
  const Row = ({ label, note, report }) => (
    <button type="button" style={btn} onClick={() => download(report)}>
      <span>
        {label}
        {note && <span style={{ display: "block", fontWeight: 500, fontSize: 12.5, color: "#4A3F63" }}>{note}</span>}
      </span>
      <span className="flex items-center gap-1" style={{ color: "#4E22B8", fontSize: 13 }}><Download size={14} /> CSV</span>
    </button>
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <h3 className="text-sm font-semibold mb-1">Export for taxes</h3>
          <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
            Separate reports for your accountant or tax software. Not tax advice.
          </p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label="Tax year"
          className="text-sm rounded-xl px-3 py-2"
          style={{ border: "2px solid #9A72F0", background: "#fff", fontWeight: 700 }}
        >
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {businesses.map((b) => (
          <Row key={b.id} label={b.name} note="Income, expenses and net profit" report={`business:${b.id}`} />
        ))}
        <Row label="All income" note="Every source, with totals" report="income" />
        <Row label="Personal expenses" note="Spending marked Personal" report="personal" />
        <Row label="Everything in one file" note="One section per business, plus other income and personal" report="" />
      </div>
    </Card>
  );
}
