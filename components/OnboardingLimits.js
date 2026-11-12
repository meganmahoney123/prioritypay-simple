"use client";

// Onboarding step 3 (optional): add a limit to any category.
//   Total Category Cap  -> row.categoryCap  (stops at a total balance)
//   Monthly Category Cap -> row.max         (stops at a monthly amount)
// Both fields already exist in the split engine (lib/allocations.js), so this
// screen only sets them. A blank amount is stored as "no cap", never as $1.

import { useState } from "react";

const SAMPLE = 10000;
const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
const hasVal = (v) => v !== null && v !== undefined && v !== "";

const FONT = "var(--font-body)";

function TotalGraph() {
  return (
    <svg
      viewBox="0 0 330 184"
      width="100%"
      role="img"
      aria-label="Graph: the Wedding Fund balance climbs up and to the right until it reaches the $25,000 goal. After that point the line goes flat because the split for that category drops to 0%."
      style={{ display: "block", maxWidth: 560 }}
    >
      <text x="10" y="14" fontSize="12" fontWeight="600" fill="#241337" fontFamily={FONT}>Wedding Fund balance over time</text>
      <line x1="56" y1="120" x2="320" y2="120" stroke="#B9AED3" strokeWidth="1.5" />
      <line x1="56" y1="26" x2="56" y2="120" stroke="#B9AED3" strokeWidth="1.5" />
      <line x1="56" y1="40" x2="320" y2="40" stroke="#4E22B8" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d="M56,120 L56,118 C100,112 150,78 192,40 L318,40 L318,120 Z" fill="#D9C9FF" />
      <path d="M56,118 C100,112 150,78 192,40 L318,40" fill="none" stroke="#6D3BE0" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="192" cy="40" r="6" fill="#6D3BE0" stroke="#FFFFFF" strokeWidth="2" />
      <text x="50" y="44" fontSize="11.5" fontWeight="700" fill="#4E22B8" textAnchor="end" fontFamily={FONT}>$25,000</text>
      <text x="50" y="124" fontSize="11.5" fill="#6B6280" textAnchor="end" fontFamily={FONT}>$0</text>
      <text x="124" y="111" fontSize="11" fill="#2A1550" fontFamily={FONT}>Balance keeps growing</text>
      <text x="256" y="62" fontSize="11.5" fontWeight="700" fill="#4E22B8" textAnchor="middle" fontFamily={FONT}>Goal reached:</text>
      <text x="256" y="76" fontSize="11.5" fontWeight="700" fill="#4E22B8" textAnchor="middle" fontFamily={FONT}>split drops to 0%</text>
      <text x="188" y="136" fontSize="11" fill="#6B6280" textAnchor="middle" fontFamily={FONT}>Time →</text>
      <text x="50" y="164" fontSize="11.5" fill="#6B6280" textAnchor="end" fontFamily={FONT}>Split</text>
      <rect x="56" y="148" width="136" height="24" rx="6" fill="#6D3BE0" />
      <text x="124" y="164" fontSize="11.5" fontWeight="700" fill="#FFFFFF" textAnchor="middle" fontFamily={FONT}>10% of each deposit</text>
      <rect x="192" y="148" width="126" height="24" rx="6" fill="#E4DFEF" />
      <text x="255" y="164" fontSize="11.5" fontWeight="700" fill="#2A1550" textAnchor="middle" fontFamily={FONT}>0%</text>
    </svg>
  );
}

function MonthlyGraph() {
  return (
    <svg
      viewBox="0 0 330 100"
      width="100%"
      role="img"
      aria-label="Picture: the Rent category fills to its $2,000 monthly cap in September and October, and is partway there in November. It starts over each month."
      style={{ display: "block", maxWidth: 560 }}
    >
      <line x1="8" y1="22" x2="322" y2="22" stroke="#4E22B8" strokeWidth="2" strokeDasharray="4 3" />
      <text x="322" y="14" fontSize="12" fontWeight="700" fill="#4E22B8" textAnchor="end" fontFamily={FONT}>Cap: $2,000 a month</text>
      <rect x="30" y="22" width="64" height="56" rx="6" fill="#6D3BE0" />
      <text x="62" y="55" fontSize="12" fontWeight="700" fill="#FFFFFF" textAnchor="middle" fontFamily={FONT}>$2,000</text>
      <rect x="133" y="22" width="64" height="56" rx="6" fill="#6D3BE0" />
      <text x="165" y="55" fontSize="12" fontWeight="700" fill="#FFFFFF" textAnchor="middle" fontFamily={FONT}>$2,000</text>
      <rect x="236" y="22" width="64" height="56" rx="6" fill="#F3EEFF" />
      <rect x="236" y="50" width="64" height="28" rx="6" fill="#B79CF5" />
      <text x="268" y="68" fontSize="12" fontWeight="700" fill="#241337" textAnchor="middle" fontFamily={FONT}>$1,000</text>
      <line x1="8" y1="78" x2="322" y2="78" stroke="#C9BBE8" strokeWidth="1" />
      <text x="62" y="94" fontSize="12" fill="#4B4160" textAnchor="middle" fontFamily={FONT}>Sep</text>
      <text x="165" y="94" fontSize="12" fill="#4B4160" textAnchor="middle" fontFamily={FONT}>Oct</text>
      <text x="268" y="94" fontSize="12" fill="#4B4160" textAnchor="middle" fontFamily={FONT}>Nov</text>
      <path d="M100,50 H126 M120,45 L126,50 L120,55 M203,50 H229 M223,45 L229,50 L223,55" fill="none" stroke="#6B6280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chips({ items }) {
  return (
    <div style={{ borderTop: "1px solid #EFE8FF", paddingTop: 12, display: "grid", gap: 8 }}>
      <span style={{ fontSize: 13, color: "#4B4160" }}>Examples:</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map((t) => (
          <span key={t} style={{ padding: "5px 12px", borderRadius: 14, background: "#F3EEFF", color: "#4E22B8", fontSize: 13.5, fontWeight: 600 }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function CapCard({ kind, title, subtitle, graph, text, examples }) {
  return (
    <details className="pp-lim-card">
      <summary>
        <span style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "#6B6280", fontWeight: 600 }}>{kind}</span>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", color: "#241337" }}>{title}</span>
          <span style={{ fontSize: 16, color: "#4E22B8", fontWeight: 600 }}>{subtitle}</span>
        </span>
        <svg className="pp-lim-chev" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" style={{ flex: "none" }}>
          <circle cx="18" cy="18" r="17" fill="#F3EEFF" stroke="#D9C9FF" />
          <path d="M11 15l7 7 7-7" fill="none" stroke="#4E22B8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div style={{ display: "grid", gap: 12, paddingTop: 16 }}>
        {graph}
        <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: "#2A1550" }}>{text}</p>
        <Chips items={examples} />
      </div>
    </details>
  );
}

// Shared "two kinds of limits" explainer (same cards as onboarding), also used
// by the "What's a cap?" panel on the Income Split Rules page.
export function CapExplainer() {
  return (
    <div>
      <style>{`
        .pp-lim-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
        .pp-lim-card{border:1px solid #D9C9FF;border-radius:22px;background:#fff;padding:20px}
        .pp-lim-card>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .pp-lim-card>summary::-webkit-details-marker{display:none}
        .pp-lim-card[open] .pp-lim-chev{transform:rotate(180deg)}
        @media (max-width:720px){ .pp-lim-pair{grid-template-columns:1fr} }
      `}</style>
      <div style={{ fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4E22B8", fontWeight: 600, marginBottom: 12 }}>
        Two kinds of limits. Tap one to see how it works.
      </div>
      <div className="pp-lim-pair">
        <CapCard
          kind="Type 1"
          title="Total Category Cap"
          subtitle="A major savings goal"
          graph={<TotalGraph />}
          text="Set the amount you're saving up for. Once the balance gets there, this category's split drops to 0%."
          examples={["Wedding", "New car", "Down payment"]}
        />
        <CapCard
          kind="Type 2"
          title="Monthly Category Cap"
          subtitle="A recurring expense"
          graph={<MonthlyGraph />}
          text="Set the most this category needs each month. Once it gets that much, its split drops to 0% until the 1st."
          examples={["Rent", "Car payment", "Insurance"]}
        />
      </div>
    </div>
  );
}

export default function OnboardingLimits({ rows, onUpdate }) {
  const live = rows.filter((r) => Number(r.pct) > 0);
  const [types, setTypes] = useState(() => {
    const t = {};
    rows.forEach((r) => {
      t[r.id] = hasVal(r.max) ? "monthly" : hasVal(r.categoryCap) ? "total" : "none";
    });
    return t;
  });

  const amountOf = (r, type) => (type === "monthly" ? r.max : type === "total" ? r.categoryCap : null);

  const setType = (r, type) => {
    const carry = amountOf(r, types[r.id] || "none");
    setTypes((p) => ({ ...p, [r.id]: type }));
    onUpdate(r.id, {
      max: type === "monthly" && hasVal(carry) ? carry : null,
      categoryCap: type === "total" && hasVal(carry) ? carry : null,
    });
  };

  const setAmount = (r, type, raw) => {
    const n = Number(raw);
    const v = raw === "" || !Number.isFinite(n) || n <= 0 ? null : n;
    onUpdate(r.id, type === "monthly" ? { max: v, categoryCap: null } : { categoryCap: v, max: null });
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <style>{`
        .pp-lim-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:start}
        .pp-lim-card{border:1px solid #D9C9FF;border-radius:22px;background:#fff;padding:20px}
        .pp-lim-card>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px}
        .pp-lim-card>summary::-webkit-details-marker{display:none}
        .pp-lim-card[open] .pp-lim-chev{transform:rotate(180deg)}
        .pp-lim-head,.pp-lim-row{display:grid;grid-template-columns:minmax(0,1fr) 224px 52px 120px;gap:14px;align-items:start}
        .pp-lim-head{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b6280;padding:0 0 8px;border-bottom:1px solid #E3D8FA}
        .pp-lim-row{padding:14px 0;border-bottom:1px solid #EFE8FF;font-size:15px}
        .pp-lim-row select{width:100%;height:40px;font-size:14.5px;border:1px solid #E3D8FA;border-radius:10px;padding:0 10px;font:inherit;background:#fff;color:var(--color-text)}
        .pp-lim-amt{display:grid;gap:4px;justify-items:end;margin-top:8px}
        .pp-lim-amt label{display:flex;align-items:center;gap:4px;font-size:15px;color:#6b6280}
        .pp-lim-amt input{width:92px;box-sizing:border-box;height:36px;border:1px solid #B79CF5;border-radius:10px;text-align:right;padding:0 8px;font:inherit;color:var(--color-text);background:#fff}
        .pp-lim-amt small{font-size:12px;color:#6b6280}
        @media (max-width:720px){
          .pp-lim-pair{grid-template-columns:1fr}
          .pp-lim-head{display:none}
          .pp-lim-row{grid-template-columns:minmax(0,1fr) auto;gap:8px 12px}
          .pp-lim-row .pp-lim-sel{grid-column:1/-1;grid-row:2}
        }
      `}</style>

      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", maxWidth: "36em" }}>
        Once you reach your savings goal for a particular category, it might not make sense to continue adding money to that category.
        That&apos;s why you can set limits.
        <br /><br />
        Once a category reaches a limit, PrioritySave resets that category to 0%. Other categories automatically increase accordingly to absorb the percentage that was allocated to that category. For Monthly category caps, it resets each month. For
        total category cap, a split is only turned on again if a withdrawal causes the category to dip below its cap.
      </p>

      <div>
        <div style={{ fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4E22B8", fontWeight: 600, marginBottom: 12 }}>
          Two kinds of limits. Tap one to see how it works.
        </div>
        <div className="pp-lim-pair">
          <CapCard
            kind="Type 1"
            title="Total Category Cap"
            subtitle="A major savings goal"
            graph={<TotalGraph />}
            text="Set the amount you're saving up for. Once the balance gets there, this category's split drops to 0%."
            examples={["Wedding", "New car", "Down payment"]}
          />
          <CapCard
            kind="Type 2"
            title="Monthly Category Cap"
            subtitle="A recurring expense"
            graph={<MonthlyGraph />}
            text="Set the most this category needs each month. Once it gets that much, its split drops to 0% until the 1st."
            examples={["Rent", "Car payment", "Insurance"]}
          />
        </div>
      </div>

      <div style={{ border: "1px solid #D9C9FF", borderRadius: 18, background: "#EDE6FF", padding: "14px 18px", fontSize: 15, lineHeight: 1.55, color: "#2A1550" }}>
        <b>Not sure? Leave it at None.</b> Limits only make sense when more money in a category stops being useful. For many categories
        (like Tax Reserve, Retirement and Investments), limits don&apos;t make sense.
      </div>

      <div>
        <div className="pp-lim-head" aria-hidden="true">
          <span>Category</span>
          <span>Add cap?</span>
          <span style={{ textAlign: "right" }}>%</span>
          <span style={{ textAlign: "right" }}>Sample {money(SAMPLE)}</span>
        </div>
        {live.map((r) => {
          const type = types[r.id] || "none";
          const pct = Number(r.pct) || 0;
          return (
            <div className="pp-lim-row" key={r.id}>
              <span style={{ paddingTop: 9, overflowWrap: "anywhere" }}>{r.label}</span>
              <span className="pp-lim-sel">
                <select aria-label={`Add cap for ${r.label}`} value={type} onChange={(e) => setType(r, e.target.value)}>
                  <option value="none">None</option>
                  <option value="total">Total Category Cap</option>
                  <option value="monthly">Monthly Category Cap</option>
                </select>
              </span>
              <span style={{ textAlign: "right", paddingTop: 9, color: "#6b6280" }}>{Math.round(pct * 10) / 10}%</span>
              <span style={{ textAlign: "right" }}>
                <span style={{ display: "block", paddingTop: 9, fontFamily: "var(--font-mono)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {money((pct / 100) * SAMPLE)}
                </span>
                {type !== "none" && (
                  <span className="pp-lim-amt">
                    <label>
                      $
                      <input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        step="any"
                        aria-label={`${r.label} ${type === "monthly" ? "monthly" : "total"} cap amount`}
                        placeholder={type === "monthly" ? "2,000" : "25,000"}
                        value={hasVal(amountOf(r, type)) ? amountOf(r, type) : ""}
                        onChange={(e) => setAmount(r, type, e.target.value)}
                      />
                    </label>
                    <small>{type === "monthly" ? "Most per month" : "Stop at a total of"}</small>
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <div style={{ paddingTop: 12, fontSize: 14, color: "color-mix(in srgb, var(--color-text) 62%, transparent)" }}>
          Guilt-Free Spending has no limit.
        </div>
      </div>
    </div>
  );
}
