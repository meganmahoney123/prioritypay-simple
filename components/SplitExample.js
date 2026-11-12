"use client";

import { useState, useRef, useEffect } from "react";
import { TIER_CSS } from "./TierCards";

// "Confused? Here's an example of how splits work": a collapsed dropdown with a
// small simulator. Pick $500, $2,000 or $5,000 and the example rows fill one at
// a time. The numbers are a fixed example (the same starting setup people see
// in onboarding), worked out with the same rules the real split uses: priority
// tiers fill first up to their monthly caps, the rest flows down, and the final
// tier is split by percent.

const PURPLE = "#4E22B8";
const GREEN = "#2E7D4F";
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const AMOUNTS = [500, 2000, 5000];
const usd = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

// tier, name, kind, cap or percent, dollars per example deposit, fill 0..1 per deposit
const ROWS = [
  [1, "Rent", "cap", 1500, [500, 1500, 1500], [500 / 1500, 1, 1]],
  [2, "Car payment", "cap", 300, [0, 275, 300], [0, 275 / 300, 1]],
  [2, "Insurance", "cap", 150, [0, 150, 150], [0, 1, 1]],
  [2, "Utilities", "cap", 75, [0, 75, 75], [0, 1, 1]],
  [3, "Tax Reserve", "pct", 40, [0, 0, 1190], [0, 0, 0.4]],
  [3, "Savings", "pct", 20, [0, 0, 595], [0, 0, 0.2]],
  [3, "Guilt-Free Spending", "pct", 15, [0, 0, 446], [0, 0, 0.15]],
];
const STAY = [0, 0, 744];
const FLOW = { 1: [0, 500, 3500], 2: [0, 0, 2975] };
const TIERS = {
  1: ["Top Priority", "Even split, then waterfall"],
  2: ["Secondary Priority", "Even split, then waterfall"],
  3: ["Final", "By percent, can be under 100%"],
};

const CSS = `
.pp-ex-chip{padding:7px 16px;border-radius:999px;font-family:${MONO};font-weight:700;font-size:15px;background:#fff;color:${PURPLE};border:1px solid #DDD5F3;cursor:pointer}
.pp-ex-chip[aria-pressed="true"]{background:${PURPLE};color:#fff;border-color:${PURPLE}}
.pp-ex-val{position:relative;width:96px;height:24px;flex:none;font-family:${MONO};font-weight:700;font-size:17px;color:${PURPLE};text-align:right}
.pp-ex-val span{position:absolute;right:0;top:0;transition:opacity .35s}
.pp-ex-bar{flex:1 1 100%;margin:0 0 0 19px;max-width:calc(100% - 19px);height:8px;background:#F0EAFB;border-radius:99px;overflow:hidden}
.pp-ex-bar i{display:block;height:100%;width:0;border-radius:99px;transition:width .7s ease,background .3s}
.pp-tier-stack .pp-tier-head + .pp-tier-row{border-top:0}
.pp-ex-eq{color:#8A7FA0;font-weight:800}
.pp-ex-flow{position:relative;box-sizing:border-box;height:38px;line-height:34px;padding:0;font-size:13px}
.pp-ex-flow span{position:absolute;top:0;left:0;right:0;text-align:center;transition:opacity .35s}
`;

export default function SplitExample() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null); // 0, 1, 2 or null (nothing picked yet)
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Tapping a chip (even the one already showing) empties the bars for a
  // moment first so the fill plays again from the top.
  const pick = (i) => {
    clearTimeout(timer.current);
    setSel(null);
    timer.current = setTimeout(() => setSel(i), 60);
  };

  const rowsByTier = [1, 2, 3].map((t) => ROWS.map((r, i) => ({ r, i })).filter((x) => x.r[0] === t));

  const stayDelay = `${ROWS.length * 0.5}s`;
  return (
    <div style={{ background: "#fff", border: "1px solid #DDD5F3", borderRadius: 18, overflow: "hidden" }}>
      <style>{TIER_CSS}{CSS}</style>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 18px", background: "#F4EEFF", border: 0, cursor: "pointer", font: "inherit", textAlign: "left" }}
      >
        <span aria-hidden style={{ fontSize: 17 }}>💡</span>
        <span style={{ flex: 1, fontSize: 16, fontWeight: 600, color: PURPLE }}>Confused? Here&apos;s an example of how splits work</span>
        <span style={{ color: PURPLE, fontWeight: 600 }}>{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div style={{ padding: "16px 18px 18px", display: "grid", gap: 18 }}>
          <div style={{ fontSize: 14, color: "#4A3F63", lineHeight: 1.5 }}>
            This is a made-up example, not your numbers. Pick a deposit and watch the money fill the tiers from the top down.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Deposit</span>
            {AMOUNTS.map((a, i) => (
              <button key={a} type="button" className="pp-ex-chip" aria-pressed={sel === i} onClick={() => pick(i)}>{usd(a)}</button>
            ))}
            {sel === null && <span style={{ fontSize: 13, color: "#4A3F63" }}>Tap an amount to watch it fill.</span>}
          </div>
          {/* breathing room between the deposit picker and the first tier */}
          <div className="pp-tier-stack" style={{ marginTop: 6 }}>
            {rowsByTier.map((list, ti) => {
              const t = ti + 1;
              return (
                <div key={t}>
                  <div className="pp-tier-card">
                    <div className="pp-tier-head">
                      <span className={`pp-tier-num${t === 3 ? " out" : ""}`}>{t}</span>
                      <div className="pp-tier-title">{TIERS[t][0]}</div>
                      <span className="pp-tier-tag">{TIERS[t][1]}</span>
                    </div>
                    {list.map(({ r, i }) => {
                      const [, name, kind, rule, amts, fills] = r;
                      const d = `${i * 0.5}s`;
                      const full = kind === "cap" && sel !== null && fills[sel] >= 0.999;
                      return (
                        <div key={name} className="pp-tier-row" style={{ flexWrap: "wrap" }}>
                          <span className="pp-tier-dot" />
                          <span className="pp-tier-namefixed">{name}</span>
                          {kind === "cap" ? (
                            <span className="pp-tier-cap">
                              Monthly cap
                              <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 15, color: "#241337" }}>$ {rule.toLocaleString("en-US")}</span>
                            </span>
                          ) : (
                            <span className="pp-tier-pill">{rule}%</span>
                          )}
                          <span className="pp-ex-eq">=</span>
                          <span className="pp-ex-val">
                            <span style={{ opacity: sel === null ? 1 : 0, color: "#B7ADC9" }}>—</span>
                            {amts.map((v, k) => (
                              <span key={k} style={{ opacity: sel === k ? 1 : 0, transitionDelay: sel === k ? d : "0s", color: v === 0 ? "#B7ADC9" : full ? GREEN : PURPLE }}>{usd(v)}</span>
                            ))}
                          </span>
                          <span className="pp-ex-bar">
                            <i style={{ width: sel === null ? "0%" : `${fills[sel] * 100}%`, background: full ? GREEN : "#9A72F0", transitionDelay: sel === null ? "0s" : d }} />
                          </span>
                        </div>
                      );
                    })}
                    {t === 3 && (
                      <div className="pp-tier-row" style={{ background: "#FBF9FF", margin: "0 -18px", padding: "11px 18px" }}>
                        <span className="pp-tier-dot" style={{ background: "#D2C4F0" }} />
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#4A3F63" }}>
                          Stays where it was deposited <span style={{ fontSize: 12 }}>(the other 25%)</span>
                        </span>
                        <span className="pp-ex-val">
                          {STAY.map((v, k) => (
                            <span key={k} style={{ opacity: sel === k ? 1 : 0, transitionDelay: sel === k ? stayDelay : "0s", color: v === 0 ? "#B7ADC9" : "#4A3F63" }}>{usd(v)}</span>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                  {t < 3 && (
                    <div className="pp-tier-flow pp-ex-flow">
                      <span style={{ opacity: sel === null ? 1 : 0 }}>↓ Cap reached? The rest flows down</span>
                      {FLOW[t].map((v, k) => (
                        <span key={k} style={{ opacity: sel === k ? 1 : 0 }}>↓ {usd(v)} flows down{v === 0 ? ", nothing left for the next tier" : ""}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
