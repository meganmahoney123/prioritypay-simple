"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Card, PrimaryButton } from "@/components/ui";

// Replaces the full Tax Summary section on Close Out. The yearly report is
// still one click away: every transaction PrioritySave saw for the year, with
// its category and whether the month was confirmed, as a CSV.
export default function TaxExportCard() {
  const thisYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const years = [thisYear, thisYear - 1, thisYear - 2];
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div style={{ minWidth: 0, flex: "1 1 280px" }}>
          <h3 className="text-sm font-semibold mb-1">Export for taxes</h3>
          <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
            Your income and expenses for the year, every transaction with its date, account and category, as a CSV for your accountant or tax software. Not tax advice.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Tax year"
            className="text-sm rounded-xl px-3 py-2"
            style={{ border: "2px solid #9A72F0", background: "#fff", fontWeight: 700 }}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <PrimaryButton onClick={() => window.open(`/api/tax-summary/${year}/export`, "_blank")}>
            <Download size={14} /> Download CSV
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}
