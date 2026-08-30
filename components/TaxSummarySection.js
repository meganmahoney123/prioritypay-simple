"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, CheckCircle2, Circle, Receipt } from "lucide-react";
import { Card, PrimaryButton, Badge, currency } from "@/components/ui";
import { bloomWarningCardStyle, bloomAccentCardStyle } from "@/lib/bloomTheme";

// Formerly its own top-level nav tab (/tax-summary) -- moved to live inside
// Monthly Close-Out per explicit request ("put everything on Tax Summary
// under Close Out... and get rid of the Tax Summary tab"), since a yearly
// tax rollup reads naturally as an extension of "here's what happened with
// your money this month." Self-contained (own year/data/loading state,
// own fetch to GET /api/tax-summary/{year} and the CSV export route) so it
// doesn't need to share Close-Out's own per-MONTH state at all -- just
// dropped in as a section on the same page. The old /tax-summary route
// itself is left in place, just unlinked from nav, same as the History tab
// before it (see components/AppShell.js).
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthLabel(period) {
  const m = Number(period.split("-")[1]);
  return MONTH_NAMES[m - 1];
}

export default function TaxSummarySection() {
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
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Receipt size={15} /> Tax Summary
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setYear((y) => y - 1)}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: "50%", background: "transparent",
              border: "1px solid var(--color-divider)", color: "var(--color-text)",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, width: 56, textAlign: "center" }}>{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= new Date().getUTCFullYear()}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 26, height: 26, borderRadius: "50%", background: "transparent",
              border: "1px solid var(--color-divider)", color: "var(--color-text)",
              cursor: year >= new Date().getUTCFullYear() ? "not-allowed" : "pointer",
              opacity: year >= new Date().getUTCFullYear() ? 0.3 : 1,
            }}
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {error && (
        <Card className="p-4 text-sm mb-4" style={bloomWarningCardStyle()}>
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
        <div className="space-y-4">
          <Card
            style={bloomAccentCardStyle({
              padding: "clamp(22px, 3vw, 32px)",
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
                marginBottom: 12,
              }}
            >
              Net Income
            </div>
            <div
              className="font-mono"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(32px, 5vw, 52px)",
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
              <p className="text-lg font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.income)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>W2 Income</p>
              <p className="text-lg font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.w2Income)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>Total Expenses</p>
              <p className="text-lg font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.expense)}</p>
            </Card>
          </div>

          {data.totals.business > 0 && (
            <Card className="p-4">
              <p className="text-xs mb-1" style={{ color: "var(--color-neutral-700)" }}>Flagged as business (excluded above)</p>
              <p className="text-lg font-semibold font-mono" style={{ fontFamily: "var(--font-mono)" }}>{currency(data.totals.business)}</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-neutral-700)" }}>
                Transactions marked &quot;Business&quot; in Close-Out — landed on a personal account but flagged
                as belonging to the business side. Not counted in income/expenses/net above; included in the CSV
                below for your accountant.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Month by month</h3>
              <Badge tone={allReviewed ? "emerald" : "amber"}>
                {data.confirmedMonths} of {data.totalMonths} months reviewed
              </Badge>
            </div>
            {!allReviewed && (
              <p className="text-xs mb-3" style={{ color: "var(--color-neutral-700)" }}>
                Months not yet confirmed in Close-Out use PriorityPay&apos;s best-guess categorization — review
                them above before treating these numbers as final.
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

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-1">Download for your accountant</h3>
            <p className="text-xs mb-3" style={{ color: "var(--color-neutral-700)" }}>
              Every transaction PriorityPay saw for {year} — date, description, account, category, and whether
              you confirmed it — as a CSV. Not tax advice; a starting point to hand off or import into tax
              software.
            </p>
            <PrimaryButton onClick={() => window.open(`/api/tax-summary/${year}/export`, "_blank")}>
              <Download size={14} /> Download {year} CSV
            </PrimaryButton>
          </Card>
        </div>
      ) : null}
    </Card>
  );
}
