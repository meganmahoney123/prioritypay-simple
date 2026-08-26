"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, CheckCircle2, Circle } from "lucide-react";
import { Card, PrimaryButton, Badge, currency } from "@/components/ui";
import { BLOOM_TOKENS, bloomWarningCardStyle, bloomAccentCardStyle } from "@/lib/bloomTheme";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(period) {
  const m = Number(period.split("-")[1]);
  return MONTH_NAMES[m - 1];
}

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
    <div className="max-w-2xl space-y-6" style={BLOOM_TOKENS}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setYear((y) => y - 1)}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: "50%", background: "transparent",
            border: "1px solid var(--color-divider)", color: "var(--color-text)",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 15, width: 64, textAlign: "center" }}>{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          disabled={year >= new Date().getUTCFullYear()}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: "50%", background: "transparent",
            border: "1px solid var(--color-divider)", color: "var(--color-text)",
            cursor: year >= new Date().getUTCFullYear() ? "not-allowed" : "pointer",
            opacity: year >= new Date().getUTCFullYear() ? 0.3 : 1,
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {error && (
        <Card className="p-4 text-sm" style={bloomWarningCardStyle()}>
          {error}
        </Card>
      )}

      {loading ? (
        <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>Pulling {year}&apos;s transactions…</p>
      ) : data && data.totalMonths === 0 ? (
        <Card className="p-8 text-center" style={bloomWarningCardStyle()}>
          <p className="text-sm" style={{ color: "#9C3B22" }}>Nothing to summarize yet for {year}.</p>
        </Card>
      ) : data ? (
        <>
          <Card
            style={bloomAccentCardStyle({
              padding: "clamp(26px, 3.5vw, 40px)",
              borderRadius: "var(--radius-lg)",
              background: "var(--color-accent-800)",
              border: "none",
              color: "#fff",
            })}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 12,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--color-accent-400)",
                marginBottom: 14,
              }}
            >
              Net Income
            </div>
            <div
              className="font-mono"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(40px, 6vw, 68px)",
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "#fff",
              }}
            >
              {currency(data.totals.net)}
            </div>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>Total Income</p>
              <p className="text-xl font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.income)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>W2 Income</p>
              <p className="text-xl font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.w2Income)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>Total Expenses</p>
              <p className="text-xl font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.expense)}</p>
            </Card>
          </div>

          {data.totals.business > 0 && (
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>Flagged as business (excluded above)</p>
              <p className="text-xl font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.business)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-neutral-700)" }}>
                Transactions marked &quot;Business&quot; in Close-Out — landed on a personal account but flagged
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
              <p className="text-xs mb-4" style={{ color: "var(--color-neutral-700)" }}>
                Months not yet confirmed in Close-Out use PriorityPay&apos;s best-guess categorization — review
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
                      <Circle size={14} style={{ color: "var(--color-neutral-300)" }} />
                    )}
                    {monthLabel(m.period)}
                  </span>
                  <span className="flex-1 text-right pr-4 font-mono" style={{ color: "var(--color-neutral-700)", fontFamily: "var(--font-mono)" }}>{currency(m.income + m.w2Income)} in</span>
                  <span className="flex-1 text-right pr-4 font-mono" style={{ color: "var(--color-neutral-700)", fontFamily: "var(--font-mono)" }}>{currency(m.expense)} out</span>
                  <span className="font-semibold w-24 text-right font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(m.net)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold mb-1">Download for your accountant</h2>
            <p className="text-xs mb-4" style={{ color: "var(--color-neutral-700)" }}>
              Every transaction PriorityPay saw for {year} — date, description, account, category, and whether
              you confirmed it — as a CSV. Not tax advice; a starting point to hand off or import into tax
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
