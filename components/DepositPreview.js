"use client";

import { useMemo, useState } from "react";
import { computeAllocations, currency, tierOf } from "@/lib/allocations";

// "See how a deposit would flow": runs the real split engine on a few sample
// deposits ($500, $2,000, $10,000) plus one amount of the person's own, using
// the split rules as they are on screen right now. Nothing is saved or moved.
//
// `later` (Deposit Splits tab only) pretends every monthly cap has already been
// filled earlier this month, to show how a later deposit waterfalls past it.

const PURPLE = "#4E22B8";
const LINE = "#E7DEFA";
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const PRESETS = [500, 2000, 10000];

export default function DepositPreview({ percent, showLaterToggle = false, title = "See how a deposit would flow" }) {
  const [custom, setCustom] = useState("");
  const [later, setLater] = useState(false);

  const customAmt = Number(custom) > 0 ? Number(custom) : null;
  const amounts = customAmt ? [...PRESETS, customAmt] : PRESETS;

  const results = useMemo(() => {
    const used = {};
    if (later) percent.forEach((r) => { if (Number(r.max) > 0) used[r.id] = Number(r.max); });
    return amounts.map((amt) => {
      const { allocated } = computeAllocations({ fixed: [], percent }, amt, used);
      return allocated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [percent, later, customAmt]);

  // Priority tiers first (in tier order), then the final tier.
  const rows = [...percent].sort((a, b) => ((tierOf(a) || 99) - (tierOf(b) || 99)));
  const stays = amounts.map((amt, i) => Math.max(0, amt - rows.reduce((n, r) => n + (results[i][r.id] || 0), 0)));

  return (
    <div style={{ background: "#fff", border: `2px solid ${"#9A72F0"}`, borderRadius: 22, padding: "14px 20px 16px", display: "grid", gap: 10 }}>
      <style>{`
        .pp-dp-wrap{overflow-x:auto}
        .pp-dp{border-collapse:collapse;width:100%;font-size:14px}
        .pp-dp th{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${PURPLE};text-align:right;padding:6px 8px;white-space:nowrap}
        .pp-dp th:first-child,.pp-dp td:first-child{text-align:left}
        .pp-dp td{padding:9px 8px;border-top:1.5px solid ${LINE};text-align:right;font-family:${MONO};font-weight:700;white-space:nowrap}
        .pp-dp td:first-child{font-family:inherit;font-weight:700;white-space:normal;min-width:130px}
        .pp-dp td.zero{color:#B9AECF;font-weight:600}
        .pp-dp tr.stay td{color:#574A68;font-weight:600}
        .pp-dp-in{display:inline-flex;align-items:center;gap:4px;border:2px solid #D9C9FF;border-radius:10px;padding:2px 8px}
        .pp-dp-in input{width:84px;border:0;outline:none;background:transparent;font-family:${MONO};font-weight:700;font-size:14px;text-align:right;-moz-appearance:textfield}
        .pp-dp-in input::-webkit-outer-spin-button,.pp-dp-in input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: PURPLE }}>{title}</div>
        <span style={{ fontSize: 13, color: "#574A68" }}>Based on your splits above. Nothing is moved.</span>
      </div>
      <div className="pp-dp-wrap">
        <table className="pp-dp">
          <thead>
            <tr>
              <th>Category</th>
              {PRESETS.map((a) => <th key={a}>{currency(a)}</th>)}
              <th>
                <span className="pp-dp-in">
                  $
                  <input type="number" inputMode="decimal" min={1} step="any" placeholder="Your own" aria-label="Try your own deposit amount" value={custom} onChange={(e) => setCustom(e.target.value)} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.label}</td>
                {amounts.map((_, i) => {
                  const v = results[i][r.id] || 0;
                  return <td key={i} className={v > 0.005 ? "" : "zero"}>{v > 0.005 ? currency(v) : "$0"}</td>;
                })}
                {!customAmt && <td className="zero">&nbsp;</td>}
              </tr>
            ))}
            <tr className="stay">
              <td>Stays where it landed</td>
              {amounts.map((_, i) => <td key={i}>{stays[i] > 0.005 ? currency(stays[i]) : "$0"}</td>)}
              {!customAmt && <td>&nbsp;</td>}
            </tr>
          </tbody>
        </table>
      </div>
      {showLaterToggle && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          <input type="checkbox" checked={later} onChange={(e) => setLater(e.target.checked)} style={{ width: 18, height: 18, accentColor: PURPLE }} />
          Later in the month: my monthly caps are already full
        </label>
      )}
    </div>
  );
}
