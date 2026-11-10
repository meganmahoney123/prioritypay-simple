"use client";

// Onboarding step 2: one simple card. A live sample-deposit donut on the left,
// every category on the right with its percent, its dollars and a remove (x).
// It only reads/writes the same `percent` rows the rest of onboarding uses, so
// nothing about how splits are saved or calculated changes here.

import { isCoreRow } from "@/lib/allocations";

const SAMPLE = 10000;
const RAMP = ["#D9C9FF", "#C4A9FA", "#9A72F0", "#6D3BE0", "#4E22B8", "#3B1C7A", "#2A1550"];
const GUILT = "#EDE6FF";

const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const pctText = (p) => `${Math.round(p * 10) / 10}%`;

export default function SimpleSplitCard({ rows, onUpdate, onRemove, overflow, persona }) {
  const colorFor = (i) => RAMP[i % RAMP.length];
  const used = rows.reduce((s, r) => s + Math.max(0, Number(r.pct) || 0), 0);
  const over = used > 100.0001;
  const rest = Math.max(0, 100 - used);
  const total = Math.max(100, used);

  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = [
    ...rows.map((r, i) => ({ key: r.id, pct: Math.max(0, Number(r.pct) || 0), color: colorFor(i) })),
    { key: "guilt", pct: rest, color: GUILT },
  ]
    .filter((a) => a.pct > 0)
    .map((a) => {
      const len = (a.pct / total) * C;
      const el = { ...a, len, offset };
      offset += len;
      return el;
    });

  return (
    <div className="pp-ssc" role="group" aria-label={`Sample ${money(SAMPLE)} deposit split`}>
      <style>{`
        .pp-ssc{border:1px solid #D9C9FF;border-radius:24px;background:#fff;padding:20px 22px;display:grid;gap:14px}
        .pp-ssc .pp-ssc-body{display:grid;grid-template-columns:150px minmax(0,1fr);gap:24px;align-items:center}
        .pp-ssc .pp-ssc-row{display:grid;grid-template-columns:12px minmax(0,1fr) 92px 76px 32px;gap:10px;align-items:center;font-size:15px;min-height:40px}
        .pp-ssc .pp-ssc-pct{display:flex;align-items:center;justify-content:flex-end;gap:4px;color:#6b6280}
        .pp-ssc input.pp-ssc-in{width:52px;box-sizing:border-box;height:34px;border:1px solid #E3D8FA;border-radius:10px;text-align:right;padding:0 8px;font:inherit;color:var(--color-text);background:#fff}
        .pp-ssc input.pp-ssc-name{width:100%;min-width:0;box-sizing:border-box;height:34px;border:1px solid transparent;border-radius:10px;padding:0 6px;margin-left:-6px;font:inherit;color:var(--color-text);background:transparent}
        .pp-ssc input.pp-ssc-name:hover,.pp-ssc input.pp-ssc-name:focus{border-color:#E3D8FA;background:#fff}
        .pp-ssc .pp-ssc-x{width:32px;height:32px;border:0;background:transparent;border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer}
        .pp-ssc .pp-ssc-x:hover{background:#F3EEFF}
        @media (max-width:640px){
          .pp-ssc .pp-ssc-body{grid-template-columns:1fr;justify-items:center}
          .pp-ssc .pp-ssc-list{width:100%}
          .pp-ssc .pp-ssc-row{grid-template-columns:12px minmax(0,1fr) 78px 64px 28px;gap:6px;font-size:14px}
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          Sample: {money(SAMPLE)} deposit
        </span>
        {over && <span style={{ fontSize: 13, fontWeight: 700, color: "#B42318" }}>Over 100% ({pctText(used)})</span>}
      </div>

      <div className="pp-ssc-body">
        <svg viewBox="0 0 132 132" width="150" height="150" aria-hidden="true" style={{ flex: "none" }}>
          <g transform="rotate(-90 66 66)">
            <circle cx="66" cy="66" r={R} fill="none" stroke="#F3EEFF" strokeWidth="22" />
            {arcs.map((a) => (
              <circle
                key={a.key}
                cx="66"
                cy="66"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth="22"
                strokeDasharray={`${Math.max(0, a.len - (arcs.length > 1 ? 1.2 : 0))} ${C}`}
                strokeDashoffset={-a.offset}
                style={{ transition: "stroke-dasharray .25s ease, stroke-dashoffset .25s ease" }}
              />
            ))}
          </g>
          <text x="66" y="62" textAnchor="middle" fontSize="9" letterSpacing="1.2" fill="#6b6280">DEPOSIT</text>
          <text x="66" y="80" textAnchor="middle" fontSize="16" fontWeight="800" fill="#2A1550" fontFamily="var(--font-mono)">{money(SAMPLE)}</text>
        </svg>

        <div className="pp-ssc-list" style={{ display: "grid", gap: 4, minWidth: 0 }}>
          {rows.map((r, i) => {
            const pct = Math.max(0, Number(r.pct) || 0);
            const editableName = !isCoreRow(r, persona);
            return (
              <div key={r.id}>
                <div className="pp-ssc-row">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: colorFor(i) }} />
                  {editableName ? (
                    <input
                      className="pp-ssc-name"
                      aria-label="Category name"
                      value={r.label}
                      onChange={(e) => onUpdate(r.id, { label: e.target.value })}
                      onFocus={(e) => e.target.select()}
                    />
                  ) : (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</span>
                  )}
                  <span className="pp-ssc-pct">
                    <input
                      className="pp-ssc-in"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      aria-label={`${r.label} percent`}
                      value={r.pct === 0 || r.pct === "0" ? 0 : r.pct ?? ""}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onUpdate(r.id, { pct: e.target.value })}
                    />
                    %
                  </span>
                  <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money((pct / 100) * SAMPLE)}</span>
                  <button type="button" className="pp-ssc-x" aria-label={`Remove ${r.label}`} onClick={() => onRemove(r.id)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="#6B6280" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  </button>
                </div>
                {overflow && overflow.id === r.id && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: "#B42318", margin: "2px 0 6px" }}>{overflow.message}</p>
                )}
              </div>
            );
          })}
          <div className="pp-ssc-row" style={{ borderTop: "1px solid #EFE8FF", paddingTop: 6, marginTop: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 4, background: GUILT, border: "1px solid #C4A9FA" }} />
            <span style={{ color: "color-mix(in srgb, var(--color-text) 75%, transparent)" }}>
              Guilt-Free Spending <span style={{ fontSize: 13, opacity: 0.8 }}>(what&apos;s left)</span>
            </span>
            <span style={{ textAlign: "right", color: "#6b6280", paddingRight: 14 }}>{pctText(rest)}</span>
            <span style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{money((rest / 100) * SAMPLE)}</span>
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}
