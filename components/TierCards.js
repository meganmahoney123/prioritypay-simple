"use client";

import AccountSelect from "./AccountSelect";
import { tierRows, tierTotals } from "@/lib/allocations";

// Tier 1 ("paid first") and tier 2 ("fixed bills") of the deposit waterfall.
// Every row has a percent (of what reaches its tier) and a REQUIRED monthly
// cap. The percents in a tier add up to exactly 100%. The last tier (everything
// else, no required caps) is not drawn here: each page keeps its own list for it.
//
// Used by onboarding (no account pickers yet -- those come in a later step) and
// by the Deposit Splits page (`accounts` passed, so each bill can pick one).

const PURPLE = "#4E22B8";
const LINE = "#E7DEFA";

const TIERS = [
  {
    tier: 1,
    title: "Tier 1 · Paid first",
    sub: "Takes its percent of each deposit until its monthly cap is reached. Every row needs a cap.",
    empty: "Nothing here yet. Add a bill you want paid before anything else, like rent.",
    addLabel: "Add a bill",
    newLabel: "New bill",
  },
  {
    tier: 2,
    title: "Tier 2 · Fixed bills",
    sub: "Splits what flows down from tier 1. Every row needs a cap; extra from a capped row goes to the others.",
    empty: "Nothing here yet. Add other bills that should come before savings.",
    addLabel: "Add a bill",
    newLabel: "New bill",
  },
];

const inputBase = {
  border: "2px solid #D9C9FF",
  borderRadius: 12,
  padding: "8px 10px",
  fontSize: 16,
  background: "#fff",
  color: "#241337",
  minWidth: 0,
};

function Arrow({ children }) {
  return (
    <div style={{ textAlign: "center", color: PURPLE, fontWeight: 800, fontSize: 14, padding: "2px 0" }}>↓ {children}</div>
  );
}

export default function TierCards({ percent, onUpdate, onSetPct, onAddRow, onRemoveRow, accounts, showErrors = false }) {
  const totals = tierTotals(percent);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {TIERS.map((cfg, i) => {
        const rows = tierRows(percent, cfg.tier);
        const total = totals[cfg.tier];
        const totalOk = rows.length === 0 || Math.abs(total - 100) <= 0.01;
        const sole = rows.length === 1;
        return (
          <div key={cfg.tier} style={{ display: "grid", gap: 12 }}>
            <div style={{ background: "#fff", border: "2px solid #9A72F0", borderRadius: 22, padding: "6px 20px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, padding: "12px 0 2px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: PURPLE }}>{cfg.title}</div>
                <span
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    fontSize: 14,
                    color: totalOk ? PURPLE : "#B3261E",
                    whiteSpace: "nowrap",
                  }}
                >
                  {rows.length === 0 ? "" : totalOk ? "100%" : `${total}% · needs 100%`}
                </span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: "#4A3F63", marginBottom: 4 }}>{cfg.sub}</div>

              {rows.length === 0 && (
                <div style={{ padding: "12px 0", fontSize: 15, color: "#574A68", borderTop: `1.5px solid ${LINE}` }}>{cfg.empty}</div>
              )}

              {rows.map((r) => {
                const capMissing = !(Number(r.max) > 0);
                return (
                  <div key={r.id} data-rule-id={r.id} style={{ padding: "12px 0", borderTop: `1.5px solid ${LINE}`, display: "grid", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        aria-label="Bill name"
                        value={r.label || ""}
                        onChange={(e) => onUpdate(r.id, { label: e.target.value })}
                        placeholder="Name"
                        style={{ ...inputBase, flex: "1 1 150px", fontWeight: 700 }}
                      />
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <input
                          aria-label={`${r.label || "Bill"} percent`}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={100}
                          step="0.01"
                          readOnly={sole}
                          value={sole ? 100 : r.pct === 0 ? "0" : r.pct ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => onSetPct(r.id, e.target.value)}
                          style={{ ...inputBase, width: 84, textAlign: "right", background: sole ? "#F4EEFF" : "#fff" }}
                        />
                        <span style={{ fontWeight: 700 }}>%</span>
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: PURPLE, whiteSpace: "nowrap" }}>Monthly cap</span>
                        <span style={{ fontWeight: 700 }}>$</span>
                        <input
                          aria-label={`${r.label || "Bill"} monthly cap`}
                          type="number"
                          inputMode="decimal"
                          min={1}
                          step="1"
                          placeholder="Required"
                          value={r.max === null || r.max === undefined ? "" : r.max}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => onUpdate(r.id, { max: e.target.value === "" ? null : Number(e.target.value) })}
                          style={{ ...inputBase, width: 110, textAlign: "right", borderColor: showErrors && capMissing ? "#B3261E" : "#D9C9FF" }}
                        />
                      </label>
                      <button
                        type="button"
                        aria-label={`Remove ${r.label || "bill"}`}
                        onClick={() => onRemoveRow(r.id)}
                        style={{ background: "#fff", border: "1px solid #D9C9FF", borderRadius: 10, padding: "6px 10px", fontWeight: 800, color: "#574A68", cursor: "pointer" }}
                      >
                        ✕
                      </button>
                    </div>
                    {showErrors && capMissing && (
                      <div style={{ fontSize: 13, color: "#B3261E", fontWeight: 700 }}>Enter a monthly cap to continue.</div>
                    )}
                    {accounts && (
                      <div style={{ maxWidth: 420 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#574A68", marginBottom: 4 }}>Paid from</div>
                        <AccountSelect value={r.accountId || ""} onChange={(id) => onUpdate(r.id, { accountId: id })} accounts={accounts} />
                      </div>
                    )}
                  </div>
                );
              })}

              {rows.length > 1 && !totalOk && (
                <div style={{ padding: "10px 0 2px", fontSize: 14, fontWeight: 700, color: "#B3261E" }}>
                  The percents in this tier add up to {total}%. Adjust them to total exactly 100%.
                </div>
              )}

              <button
                type="button"
                onClick={() => onAddRow(cfg.tier)}
                style={{ width: "100%", marginTop: 8, background: "transparent", border: "1px dashed #C4A9FA", borderRadius: 16, padding: "10px 14px", cursor: "pointer", fontSize: 15, fontWeight: 700, color: PURPLE }}
              >
                + {cfg.addLabel}
              </button>
            </div>
            <Arrow>{i === 0 ? "What is left after the caps flows down" : "Then what is left flows down"}</Arrow>
          </div>
        );
      })}
    </div>
  );
}
