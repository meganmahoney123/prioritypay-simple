"use client";

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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
const COLORS = ["#2A1550", "#6D3BE0", "#A98CF2", "#C4A9FA", "#3B1C7A"];
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

const compact = (v) => (Math.abs(v) >= 1000000 ? `$${(v / 1000000).toFixed(1).replace(/\.0$/, "")}M` : Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`);

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

  useEffect(() => {
    fetch("/api/allocations/investment-accounts")
      .then((r) => r.json())
      .then((d) => {
        const list = d.accounts || [];
        setAccounts(list);
        setThisMonth(d.thisMonth || "");
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

  const totalBalance = chosen.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const finalTotal = chartData.length ? chartData[chartData.length - 1].Total : 0;
  const multi = chosen.length > 1;
  const tickEvery = Math.max(1, Math.round(years / 8));

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: "var(--color-accent-800)" }}>
            YOUR ACCOUNTS
          </div>
          <div className="text-sm" style={{ color: "var(--color-text-muted, #5D5372)" }}>
            Pick an account to project it alone, or see everything combined.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ label: "all", name: "All accounts" }]
            .concat(rows.map((r) => ({ label: r.label, name: r.label })))
            .map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setSel(o.label)}
                aria-pressed={sel === o.label}
                className="rounded-full px-4 text-sm font-semibold"
                style={{
                  minHeight: 44,
                  border: "1.5px solid var(--color-accent-600, #6D3BE0)",
                  background: sel === o.label ? "var(--color-accent-600, #6D3BE0)" : "var(--color-surface, #fff)",
                  color: sel === o.label ? "#fff" : "var(--color-accent-800, #4E22B8)",
                }}
              >
                {o.name}
              </button>
            ))}
        </div>
        <div className="text-sm">
          <span style={{ color: "var(--color-text-muted, #5D5372)" }}>{sel === "all" ? "Combined balance" : "Balance"}: </span>
          <b style={{ fontFamily: "var(--font-mono)" }}>{currency(totalBalance)}</b>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold">
            <span className="flex justify-between">
              <span>Years to project</span>
              <b style={{ fontFamily: "var(--font-mono)" }}>{years}</b>
            </span>
            <input type="range" min="5" max="40" step="1" value={years} onChange={(e) => setYears(Number(e.target.value))} className="w-full" />
          </label>
          <label className="block text-sm font-semibold">
            <span className="flex justify-between">
              <span>Estimated yearly return</span>
              <b style={{ fontFamily: "var(--font-mono)" }}>{ret}%</b>
            </span>
            <input type="range" min="1" max="12" step="0.5" value={ret} onChange={(e) => setRet(Number(e.target.value))} className="w-full" />
          </label>
          {chosen.map((a) => (
            <label key={a.label} className="block text-sm font-semibold">
              <span className="flex justify-between gap-3">
                <span>
                  {a.label}: monthly contribution{" "}
                  <span className="font-normal" style={{ color: "var(--color-text-muted, #5D5372)" }}>
                    ({a.s.hasHistory ? `your PrioritySave average: ${currency(a.s.allTimeAvg)}` : "example amount until you have history"})
                  </span>
                </span>
                <b style={{ fontFamily: "var(--font-mono)" }}>{currency(contrib[a.label] || 0)}</b>
              </span>
              <input
                type="range"
                min="0"
                max={Math.max(3000, (a.s.start || 0) * 3)}
                step="50"
                value={contrib[a.label] || 0}
                onChange={(e) => setContrib((c) => ({ ...c, [a.label]: Number(e.target.value) }))}
                className="w-full"
              />
            </label>
          ))}
        </div>

        <div className="text-sm">
          In {years} years, an estimated <b style={{ fontFamily: "var(--font-mono)" }}>{currency(finalTotal)}</b>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3D8FA" />
              <XAxis dataKey="year" interval={tickEvery - 1} tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 12 }} width={56} />
              <Tooltip formatter={(v) => currency(v)} />
              {multi && <Legend />}
              {chosen.map((a) => (
                <Line key={a.label} type="monotone" dataKey={a.label} stroke={a.color} strokeWidth={2} dot={false} />
              ))}
              {multi && <Line type="monotone" dataKey="Total" stroke="#241337" strokeWidth={3} strokeDasharray="6 4" dot={false} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-xs" style={{ color: "var(--color-text-muted, #5D5372)" }}>
          This is an estimate, not a promise. Real returns change from year to year, and taxes and fees are not included.
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <div>
          <div className="text-xs font-bold tracking-widest" style={{ color: "var(--color-accent-800)" }}>
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
            <div key={a.label} style={{ borderBottom: "1px solid var(--color-neutral-200, #EFE8FF)" }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : a.label)}
                aria-expanded={isOpen}
                className="w-full text-left py-3 grid gap-3 items-center"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", minHeight: 44, background: "transparent" }}
              >
                <span className="flex items-center gap-2 font-bold">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: a.color, display: "inline-block" }} />
                  {a.label}
                </span>
                <Stat label={`LAST MONTH${prevKey ? ` (${monthName(prevKey).toUpperCase()})` : ""}`} value={currency(a.s.lastAmt)} />
                <Stat label={`THIS MONTH SO FAR${thisMonth ? ` (${monthName(thisMonth).toUpperCase()})` : ""}`} value={currency(a.s.nowAmt)} />
                <Stat label="ALL-TIME AVERAGE" value={a.s.hasHistory || a.s.allTimeAvg > 0 ? currency(a.s.allTimeAvg) : "—"} />
                <span className="text-sm font-bold sm:text-right" style={{ color: "var(--color-accent-800, #4E22B8)" }}>
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
                    Only contributions made through PrioritySave transfers are counted here.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted, #5D5372)" }}>{label}</span>
      <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-mono)" }}>{value}</span>
    </span>
  );
}
