"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, CheckCircle2, Circle } from "lucide-react";
import { Card, PrimaryButton, GhostButton, Badge, currency } from "@/components/ui";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(period) {
  const m = Number(period.split("-")[1]);
  return MONTH_NAMES[m - 1];
}

// Light tax-prep, not tax filing: this rolls up the same categorized data
// Close-Out already produces (backfilling any month the person never
// manually visited Close-Out for -- see lib/closeoutSync.js) into an
// annual view, and offers a CSV built for handing to an accountant or
// importing into tax software. It never files anything and never touches
// simple_monthly_closeouts' confirmed/locked state.
export default function TaxSummaryPage() {
  const [year, setYear] = useState(() => new Date().getUTCFullYear() - 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/tax-summary/${year}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setData(d);
      })
      .catch(() => setError("Could not load your tax summary."))
      .finally(() => setLoading(false));
  }, [year]);

  const allReviewed = useMemo(
    () => !!data && data.totalMonths > 0 && data.confirmedMonths === data.totalMonths,
    [data]
  );

  return (
    <div className="max-w-2xl space-y-6" style={LEDGER_TOKENS}>
      <div className="flex items-center gap-2">
        <GhostButton onClick={() => setYear((y) => y - 1)} className="px-2 py-1.5">
          <ChevronLeft size={16} />
        </GhostButton>
        <span className="text-sm font-semibold w-16 text-center">{year}</span>
        <GhostButton onClick={() => setYear((y) => y + 1)} className="px-2 py-1.5" disabled={year >= new Date().getUTCFullYear()}>
          <ChevronRight size={16} />
        </GhostButton>
      </div>

      {error && (
        <Card className="p-4 text-sm" style={{ color: "#7a2f2a" }}>
          {error}
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-neutral-500">Pulling {year}&apos;s transactions…</p>
      ) : data && data.totalMonths === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-neutral-500">Nothing to summarize yet for {year}.</p>
        </Card>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Total Income</p>
              <p className="text-xl font-semibold">{currency(data.totals.income)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">W2 Income</p>
              <p className="text-xl font-semibold">{currency(data.totals.w2Income)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Total Expenses</p>
              <p className="text-xl font-semibold">{currency(data.totals.expense)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Net Income</p>
              <p className="text-xl font-semibold">{currency(data.totals.net)}</p>
            </Card>
          </div>

          {data.totals.business > 0 && (
            <Card className="p-4">
              <p className="text-xs text-neutral-500 mb-1">Flagged as business (excluded above)</p>
              <p className="text-xl font-semibold">{currency(data.totals.business)}</p>
              <p className="text-xs text-neutral-400 mt-1">
                Transactions marked &quot;Business&quot; in Close-Out -- landed on a personal account but flagged
                as belonging to the business side. Not counted in income/expenses/net above; included in the CSV
                below for your accountant.
              </p>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Month by month</h2>
              <Badge tone={allReviewed ? "emerald" : "amber"}>
                {data.confirmedMonths} of {data.totalMonths} months reviewed
              </Badge>
            </div>
            {!allReviewed && (
              <p className="text-xs text-neutral-500 mb-4">
                Months not yet confirmed in Close-Out use PriorityPay&apos;s best-guess categorization -- review
                them there before treating these numbers as final.
              </p>
            )}
            <div className="space-y-2">
              {data.months.map((m) => (
                <div key={m.period} className="flex items-center justify-between text-sm py-2 border-b" style={{ borderColor: "var(--color-divider)" }}>
                  <span className="flex items-center gap-2 w-32">
                    {m.status === "confirmed" ? (
                      <CheckCircle2 size={14} style={{ color: "var(--color-accent-700)" }} />
                    ) : (
                      <Circle size={14} className="text-neutral-300" />
                    )}
                    {monthLabel(m.period)}
                  </span>
                  <span className="text-neutral-500 flex-1 text-right pr-4">{currency(m.income + m.w2Income)} in</span>
                  <span className="text-neutral-500 flex-1 text-right pr-4">{currency(m.expense)} out</span>
                  <span className="font-semibold w-24 text-right">{currency(m.net)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-1">Download for your accountant</h2>
            <p className="text-xs text-neutral-500 mb-4">
              Every transaction PriorityPay saw for {year} -- date, description, account, category, and whether
              you confirmed it -- as a CSV. Not tax advice; a starting point to hand off or import into tax
              software.
            </p>
            <PrimaryButton onClick={() => window.open(`/api/tax-summary/${year}/export`, "_blank")}>
              <Download size={14} /> Download {year} CSV
            </PrimaryButton>
          </Card>
        </>
      ) : null}
    </div>
  );
}
