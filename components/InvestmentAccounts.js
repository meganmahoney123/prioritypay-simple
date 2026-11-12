"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { currency } from "@/lib/allocations";

// Per-account Projections view (see app/api/allocations/investment-accounts):
// one card per investable account with its balance, last month's and this
// month's contributions made through PrioritySave, the all-time monthly
// average, and a click-to-expand 12-month history. Below that, an
// estimator (pick one account or all of them) whose monthly-contribution
// sliders start at the person's real all-time average.
//
// Starting-amount rule: if it's the person's first month in PrioritySave,
// or they contributed nothing last month, there's no meaningful average to
// start from, so the sliders start at an example amount instead.
const PLACEHOLDER = { Retirement: 500, "Retirement (Side Income)": 500, Investments: 300 };
// Distinct, high-contrast line colors so accounts never blend together.
const COLORS = ["#4E22B8", "#E07A1F", "#0F8F7B", "#C2347A", "#2F6FD6", "#8A6A00"];
const KIND = { Investments: "INVESTMENTS", Retirement: "RETIREMENT", "Retirement (Side Income)": "RETIREMENT · SIDE INCOME" };
const INK = "#241337";
const MUTED = "#4A3F63";
const ACCENT = "#4E22B8";
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} '${String(y).slice(2)}`;
};
const monthName = (key) => MONTH_NAMES[Number(key.split("-")[1]) - 1];

function futureValue(principal, annualPct, months, monthly) {
  const r = (Number(annualPct) || 0) / 100 / 12;
  if (r === 0) return principal + monthly * months;
  const g = Math.pow(1 + r, months);
  return principal * g + monthly * ((g - 1) / r);
}


// Shown to people who haven't set up any investing accounts yet, so they can
// see what this page looks like once they have (clearly labeled as sample).
function sampleData() {
  const now = new Date();
  const key = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const series = (vals) =>
    vals.map((amount, i) => ({ month: key(new Date(now.getFullYear(), now.getMonth() - (vals.length - 1 - i), 1)), amount }));
  return {
    thisMonth: key(now),
    accounts: [
      { label: "Solo 401(k)", group: "Retirement", balance: 62400, months: series([1100, 1200, 1200, 1150, 1200, 1250, 1200, 1200, 1300, 1200, 1200, 1200, 650]) },
      { label: "Brokerage", group: "Investments", balance: 48900, months: series([500, 400, 500, 500, 0, 500, 500, 600, 500, 500, 500, 500, 250]) },
      { label: "Roth IRA", group: "Retirement", balance: 21300, months: series([500, 500, 0, 500, 500, 500, 500, 500, 500, 500, 500, 500, 250]) },
    ],
  };
}

function summarize(acct) {
  const months = acct.months || [];
  const done = months.slice(0, -1); // completed months only
  const nowAmt = months.length ? months[months.length - 1].amount : 0;
  const lastAmt = done.length ? done[done.length - 1].amount : 0;
  const hasHistory = done.length >= 1 && lastAmt > 0;
  const allTimeAvg = done.length ? done.reduce((s, m) => s + m.amount, 0) / done.length : 0;
  const last12 = done.slice(-12);
  const total12 = last12.reduce((s, m) => s + m.amount, 0);
  const start = hasHistory ? Math.round(allTimeAvg / 50) * 50 || 50 : PLACEHOLDER[acct.group] || 300;
  return { hasHistory, lastAmt, nowAmt, allTimeAvg, last12, total12, avg12: last12.length ? total12 / last12.length : 0, start };
}

export default function InvestmentAccounts() {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [thisMonth, setThisMonth] = useState("");
  const [open, setOpen] = useState(null);
  const [sel, setSel] = useState("all");
  const [years, setYears] = useState(20);
  const [ret, setRet] = useState(7);
  const [contrib, setContrib] = useState({});
  const [isSample, setIsSample] = useState(false);

  useEffect(() => {
    fetch("/api/allocations/investment-accounts")
      .then((r) => r.json())
      .then((d) => {
        let list = d.accounts || [];
        let month = d.thisMonth || "";
        if (!list.length) {
          const sample = sampleData();
          list = sample.accounts;
          month = sample.thisMonth;
          setIsSample(true);
        }
        setAccounts(list);
        setThisMonth(month);
        const init = {};
        list.forEach((a) => {
          init[a.label] = summarize(a).start;
        });
        setContrib(init);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const rows = useMemo(
    () => accounts.map((a, i) => ({ ...a, color: COLORS[i % COLORS.length], s: summarize(a) })),
    [accounts]
  );

  const chosen = sel === "all" ? rows : rows.filter((r) => r.label === sel);
  const startYear = new Date().getFullYear();

  const chartData = useMemo(() => {
    const out = [];
    for (let y = 0; y <= years; y += 1) {
      const point = { year: String(startYear + y) };
      let total = 0;
      chosen.forEach((a) => {
        const v = futureValue(Math.max(0, a.balance), ret, y * 12, contrib[a.label] || 0);
        point[a.label] = Math.round(v);
        total += v;
      });
      point.Total = Math.round(total);
      out.push(point);
    }
    return out;
  }, [chosen, years, ret, contrib, startYear]);

  if (loading) return <Card className="p-5 text-sm">Loading your accounts…</Card>;
  if (!rows.length) return null;

  const allBalance = rows.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const finalTotal = chartData.length ? chartData[chartData.length - 1].Total : 0;
  const multi = sel === "all" && rows.length > 1;
  const selName = sel === "all" ? "ALL ACCOUNTS" : String(sel).toUpperCase();

  // Chart geometry (same layout as the approved mockup).
  const rawMax = Math.max(1, ...chartData.map((d) => d.Total));
  const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const maxV = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].map((m) => m * mag).find((m) => m >= rawMax) || rawMax;
  const X0 = 104, X1 = 872, Y0 = 310, Y1 = 20;
  const px = (i) => X0 + (i / years) * (X1 - X0);
  const py = (v) => Y0 - (v / maxV) * (Y0 - Y1);
  const pathOf = (key) => chartData.map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)} ${py(d[key]).toFixed(1)}`).join(" ");
  const step = years <= 10 ? 1 : years <= 20 ? 2 : 5;
  const tickYears = [];
  for (let y = 0; y <= years; y += step) tickYears.push(y);
  if (tickYears[tickYears.length - 1] !== years && years - tickYears[tickYears.length - 1] >= step / 2) tickYears.push(years);
  const lineDefs = multi
    ? rows.map((a) => ({ key: a.label, color: a.color, w: 4 })).concat([{ key: "Total", color: INK, w: 6 }])
    : [{ key: chosen[0].label, color: chosen[0].color, w: 6 }];
  const legend = multi
    ? rows.map((a) => ({ color: a.color, label: a.label })).concat([{ color: INK, label: "All accounts combined" }])
    : [{ color: chosen[0].color, label: chosen[0].label }];
  const monoStyle = { fontFamily: "var(--font-mono)" };

  return (
    <div className="ps-page space-y-6" style={{ background: "#EFE8FF", borderRadius: 28, padding: "20px 18px" }}>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: MUTED, maxWidth: 760 }}>
        All of your investing accounts in one place. Pick one account, or see them together, and estimate where they could be in the future.
      </p>

      {isSample && (
        <div style={{ background: "#fff", border: "3px solid #4E22B8", borderRadius: 20, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
          <b style={{ fontSize: 16 }}>This is sample data</b>
          <span style={{ fontSize: 15, lineHeight: 1.5, color: INK }}>
            You haven&apos;t set up an investing account yet. Connect a Solo 401(k), Roth IRA, brokerage or other account and this page fills in with your real balances,
            contributions and projections. Your accounts also show up on your Dashboard.
          </span>
        </div>
      )}
      {!isSample && rows.length === 1 && (
        <div style={{ fontSize: 14, color: MUTED }}>
          Only one investing account so far. Add another, such as a Roth IRA or brokerage, to see them side by side.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16 }}>
        {[{ label: "all", kind: "ALL ACCOUNTS", name: "Everything combined", balance: allBalance, color: INK, sub: `${rows.length} account${rows.length === 1 ? "" : "s"}` }]
          .concat(
            rows.map((r) => ({
              label: r.label,
              kind: KIND[r.group] || String(r.group || "").toUpperCase(),
              name: r.label,
              balance: Math.max(0, r.balance),
              color: r.color,
              sub: isSample ? "Sample" : r.s.allTimeAvg > 0 ? `Avg ${currency(r.s.allTimeAvg)} a month via PrioritySave` : "No PrioritySave contributions yet",
            }))
          )
          .map((c) => {
            const on = sel === c.label;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setSel(c.label)}
                aria-pressed={on}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, textAlign: "left", padding: 20, borderRadius: 30,
                  cursor: "pointer", color: INK, minHeight: 44,
                  border: on ? "3px solid #4E22B8" : "2px solid #B9A3F0", background: "#fff",
                }}
              >
                <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "#5D5372" }}>{c.kind}</span>
                  <span style={{ width: 16, height: 16, borderRadius: 5, background: c.color, flex: "none" }} />
                </span>
                <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>{c.name}</span>
                <span style={{ ...monoStyle, fontSize: 28, fontWeight: 700 }}>{currency(c.balance)}</span>
                <span style={{ fontSize: 14, color: MUTED }}>{c.sub}</span>
              </button>
            );
          })}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { href: "/accounts", label: isSample ? "+ Connect your first account" : "+ Connect an account" },
          { href: "/splits", label: "+ Add an account manually (trust, SEP IRA, other)" },
        ].map((b) => (
          <Link
            key={b.href}
            href={b.href}
            style={{ display: "inline-flex", alignItems: "center", minHeight: 46, padding: "0 22px", borderRadius: 999, border: "2px dashed #4E22B8", background: "#fff", color: ACCENT, fontSize: 16, fontWeight: 800 }}
          >
            {b.label}
          </Link>
        ))}
      </div>

      <Card className="space-y-5" style={{ borderRadius: 30, border: "2px solid #B9A3F0", background: "#fff", padding: "26px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "#5D5372" }}>PROJECTION ESTIMATOR · {selName}</div>
            <div style={{ fontSize: 15, color: MUTED }}>In {years} years at {ret}% a year, this could grow to about</div>
          </div>
          <div style={{ ...monoStyle, fontSize: 40, fontWeight: 600, lineHeight: 1 }}>{currency(finalTotal)}</div>
        </div>

        <div style={{ background: "#F8F5FF", border: "2px solid #E7DEFA", borderRadius: 18, padding: "10px 6px 4px" }}>
        <svg viewBox="0 0 900 380" width="100%" role="img" aria-label="Projected balance growth over time, by year" style={{ display: "block" }}>
          {tickYears.map((y) => (
            <line key={`v${y}`} x1={px(y)} y1="20" x2={px(y)} y2="310" stroke="#E3D8FA" strokeWidth="1" />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={`g${f}`}>
              <line x1="104" y1={py(maxV * f)} x2="880" y2={py(maxV * f)} stroke="#BFAEEA" strokeWidth="1.5" />
              <text x="94" y={py(maxV * f) + 5} textAnchor="end" fontSize="15" fontWeight="800" fill="#241337" fontFamily="IBM Plex Mono, monospace">
                {currency(maxV * f)}
              </text>
            </g>
          ))}
          {tickYears.map((y) => (
            <g key={`t${y}`}>
              <line x1={px(y)} y1="310" x2={px(y)} y2="316" stroke="#241337" strokeWidth="2" />
              <text x={px(y)} y="334" textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>{y === 0 ? "Today" : `Year ${y}`}</text>
              <text x={px(y)} y="352" textAnchor="middle" fontSize="13" fontWeight="600" fill={MUTED}>{startYear + y}</text>
            </g>
          ))}
          <line x1="104" y1="310" x2="880" y2="310" stroke="#241337" strokeWidth="2" />
          <line x1="104" y1="20" x2="104" y2="310" stroke="#241337" strokeWidth="2" />
          {lineDefs.map((l) => (
            <path key={l.key} d={pathOf(l.key)} fill="none" stroke={l.color} strokeWidth={l.w} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {lineDefs.map((l) => (
            <circle key={`e${l.key}`} cx={px(years)} cy={py(chartData[chartData.length - 1][l.key])} r="7" fill={l.color} stroke="#fff" strokeWidth="3" />
          ))}
          <text x="492" y="374" textAnchor="middle" fontSize="14" fontWeight="700" fill={MUTED}>Years from today</text>
        </svg>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, fontSize: 15, color: INK }}>
          {legend.map((k) => (
            <span
              key={k.label}
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 14, fontWeight: 700,
                background: k.color === INK ? INK : "#F3EEFF", color: k.color === INK ? "#fff" : INK, border: k.color === INK ? "none" : "2px solid #E7DEFA",
              }}
            >
              <span style={{ width: 22, height: 6, borderRadius: 3, background: k.color === INK ? "#fff" : k.color, flex: "none" }} />
              <span style={{ flex: 1 }}>{k.label}</span>
              <span style={{ ...monoStyle, fontWeight: 700 }}>{currency(chartData[chartData.length - 1][k.color === INK ? "Total" : k.label] || 0)}</span>
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "22px 32px", background: "#F3EEFF", border: "2px solid #E7DEFA", borderRadius: 18, padding: 20 }}>
          <label className="block text-base font-semibold" style={{ color: INK }}>
            <span className="flex justify-between items-center">
              <span>Years to grow</span>
              <b style={{ ...monoStyle, background: "#fff", borderRadius: 999, padding: "4px 14px", color: ACCENT }}>{years}</b>
            </span>
            <input type="range" min="5" max="40" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full" style={{ accentColor: "#4E22B8", height: 28 }} />
          </label>
          <label className="block text-base font-semibold" style={{ color: INK }}>
            <span className="flex justify-between items-center">
              <span>Average yearly return</span>
              <b style={{ ...monoStyle, background: "#fff", borderRadius: 999, padding: "4px 14px", color: ACCENT }}>{ret}%</b>
            </span>
            <input type="range" min="1" max="12" step="0.5" value={ret} onChange={(e) => setRet(Number(e.target.value))} className="w-full" style={{ accentColor: "#4E22B8", height: 28 }} />
          </label>
          {chosen.map((a) => (
            <label key={a.label} className="block text-base font-semibold" style={{ color: INK }}>
              <span className="flex justify-between items-center gap-3">
                <span>
                  {a.label}: monthly contribution{" "}
                  <span className="font-normal" style={{ color: MUTED, fontSize: 13 }}>
                    ({a.s.hasHistory ? `your PrioritySave average: ${currency(a.s.allTimeAvg)}` : "example amount until you have history"})
                  </span>
                </span>
                <b style={{ ...monoStyle, background: "#fff", borderRadius: 999, padding: "4px 14px", color: a.color }}>{currency(contrib[a.label] || 0)}</b>
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(3000, Math.ceil(((a.s.start || 0) * 3) / 50) * 50)}
                step="50"
                value={contrib[a.label] || 0}
                onChange={(e) => setContrib((c) => ({ ...c, [a.label]: Number(e.target.value) }))}
                className="w-full"
                style={{ accentColor: a.color, height: 28 }}
              />
            </label>
          ))}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: MUTED }}>
          This is an estimate, not a promise. Real returns change from year to year, and taxes and fees are not included. Roth IRA contributions have income limits and a yearly cap; check the current rules or ask your CPA.
        </div>
      </Card>

      <Card className="space-y-2" style={{ borderRadius: 30, border: "2px solid #B9A3F0", background: "#fff", padding: "26px 28px" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "#5D5372" }}>
            CONTRIBUTIONS VIA PRIORITYSAVE
          </div>
          <div className="text-sm" style={{ color: "var(--color-text-muted, #5D5372)" }}>
            What you have added to each account. Click an account to see every month.
          </div>
        </div>
        {rows.map((a) => {
          const isOpen = open === a.label;
          const mx = Math.max(1, ...a.s.last12.map((m) => m.amount));
          const prevKey = a.months.length >= 2 ? a.months[a.months.length - 2].month : "";
          return (
            <div key={a.label} style={{ background: "#fff", border: "2px solid #E7DEFA", borderRadius: 18, padding: "12px 16px", borderLeft: `8px solid ${a.color}` }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : a.label)}
                aria-expanded={isOpen}
                className="w-full text-left py-3 grid gap-3 items-center"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", minHeight: 44, background: "transparent" }}
              >
                <span className="flex items-center gap-2 font-bold">
                  {a.label}
                </span>
                <Stat label={`LAST MONTH${prevKey ? ` (${monthName(prevKey).toUpperCase()})` : ""}`} value={currency(a.s.lastAmt)} />
                <Stat label={`THIS MONTH SO FAR${thisMonth ? ` (${monthName(thisMonth).toUpperCase()})` : ""}`} value={currency(a.s.nowAmt)} />
                <Stat label="ALL-TIME AVERAGE" value={a.s.hasHistory || a.s.allTimeAvg > 0 ? currency(a.s.allTimeAvg) : "—"} />
                <span className="text-sm font-bold justify-self-start sm:justify-self-end" style={{ color: ACCENT, border: "2px solid #4E22B8", borderRadius: 999, padding: "10px 18px", background: "#fff", minHeight: 44, display: "inline-flex", alignItems: "center" }}>
                  {isOpen ? "Hide history" : "View history"}
                </span>
              </button>
              {isOpen && (
                <div className="mb-3 rounded-2xl p-4 space-y-2" style={{ background: "var(--color-accent-100, #F8F5FF)" }}>
                  {a.s.last12.length === 0 ? (
                    <div className="text-sm">No completed months yet. Your history will start filling in after your first full month.</div>
                  ) : (
                    <>
                      <div className="flex flex-wrap justify-between gap-2 text-sm">
                        <b>Last {a.s.last12.length} months: {currency(a.s.total12)}</b>
                        <span>About {currency(a.s.avg12)} a month</span>
                      </div>
                      {a.s.last12.map((m) => (
                        <div key={m.month} className="grid items-center gap-3 text-sm" style={{ gridTemplateColumns: "64px minmax(0,1fr) 84px" }}>
                          <span className="font-semibold">{monthLabel(m.month)}</span>
                          <span style={{ height: 16, borderRadius: 8, background: "#E8DEFB", display: "block" }}>
                            <span style={{ display: "block", height: 16, borderRadius: 8, background: a.color, width: `${m.amount ? Math.max(3, (m.amount / mx) * 100) : 0}%` }} />
                          </span>
                          <span className="text-right font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{currency(m.amount)}</span>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="text-xs" style={{ color: "var(--color-text-muted, #5D5372)" }}>
                    {isSample ? "Sample numbers. Your real contributions will show here." : "Only contributions made through PrioritySave transfers are counted here."}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Card className="space-y-2" style={{ borderRadius: 30, border: "2px solid #B9A3F0", background: "#fff", padding: "26px 28px" }}>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.14em", color: "#5D5372" }}>IN {years} YEARS, BY ACCOUNT</div>
        {rows.map((a) => (
          <div key={a.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "14px 16px", background: "#F8F5FF", border: "2px solid #E7DEFA", borderRadius: 14, fontSize: 17, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 16, height: 16, borderRadius: 5, background: a.color }} />
              {a.label}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
              {currency(futureValue(Math.max(0, a.balance), ret, years * 12, contrib[a.label] || 0))}
            </span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px", marginTop: 8, background: INK, color: "#fff", borderRadius: 14, fontSize: 18, fontWeight: 800 }}>
          <span>Total</span>
          <span style={{ fontFamily: "var(--font-mono)" }}>
            {currency(rows.reduce((t, a) => t + futureValue(Math.max(0, a.balance), ret, years * 12, contrib[a.label] || 0), 0))}
          </span>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.04em", color: "#4A3F63" }}>{label}</span>
      <span style={{ fontSize: 19, fontWeight: 700, fontFamily: "var(--font-mono)", color: INK }}>{value}</span>
    </span>
  );
}
