"use client";

// Onboarding step 3 (optional): add a limit to any category.
//   Total Savings Goal  -> row.categoryCap  (stops at a total balance)
//   Monthly Category Cap -> row.max         (stops at a monthly amount)
// Both fields already exist in the split engine (lib/allocations.js), so this
// screen only sets them. A blank amount is stored as "no cap", never as $1.

import { useState, useRef, useEffect } from "react";

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
        Two kinds of caps. Tap one to see how it works.
      </div>
      <div className="pp-lim-pair">
        <CapCard
          kind="Type 1"
          title="Total savings goal"
          subtitle="A major savings goal"
          graph={<TotalGraph />}
          text="Set the amount you're saving up for. Once the balance gets there, this category's split drops to 0%."
          examples={["Wedding", "New car", "Down payment"]}
        />
        <CapCard
          kind="Type 2"
          title="Monthly cap"
          subtitle="A recurring expense"
          graph={<MonthlyGraph />}
          text="Set the most this category needs each month. Once it gets that much, its split drops to 0% until the 1st."
          examples={["Rent", "Car payment", "Insurance"]}
        />
      </div>
    </div>
  );
}

const PURPLE = "#4E22B8";
const LINE = "#E7DEFA";
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";
const START_TIP = "If you've already started saving for this category, add the amount here.";

// Hover (and keyboard focus) explanation for "Starting balance".
function Tip({ children, text }) {
  return (
    <span className="pp-tip" tabIndex={0} aria-label={text} title={text}>
      {children}
      <span className="pp-tip-box" role="tooltip">{text}</span>
    </span>
  );
}

// Step 3 (optional): caps on the FINAL tier only. Priority tiers already have
// their required monthly caps from "Set Your Splits", so they are only recapped.
//   Monthly cap          -> row.max          (stops at a monthly amount, resets monthly)
//   Total savings goal   -> row.categoryCap  (stops at a total; resumes below it)
//                           + row.startingBalance (what is already saved)
export default function OnboardingLimits({ rows, onUpdate, priorityRows = [], onEditPriority }) {
  const live = rows.filter((r) => Number(r.pct) > 0);
  const flagsOf = (r) => ({ monthly: hasVal(r.max), total: hasVal(r.categoryCap) });
  const [flags, setFlags] = useState(() => {
    const t = {};
    rows.forEach((r) => { t[r.id] = flagsOf(r); });
    return t;
  });
  const flagsFor = (r) => flags[r.id] || flagsOf(r);
  const [openId, setOpenId] = useState(null);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!openId) return undefined;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenId(null); };
    const esc = (e) => { if (e.key === "Escape") setOpenId(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [openId]);

  // Tick or untick one kind of cap. Unticking clears that amount; the other stays.
  const toggle = (r, kind) => {
    const f = flagsFor(r);
    const next = { ...f, [kind]: !f[kind] };
    setFlags((p) => ({ ...p, [r.id]: next }));
    if (!next[kind]) onUpdate(r.id, kind === "monthly" ? { max: null } : { categoryCap: null });
  };
  const setAmount = (r, kind, raw) => {
    const n = Number(raw);
    const v = raw === "" || !Number.isFinite(n) || n <= 0 ? null : n;
    onUpdate(r.id, kind === "monthly" ? { max: v } : { categoryCap: v });
  };
  const labelFor = (f) => (f.monthly && f.total ? "Monthly cap + goal" : f.monthly ? "Monthly cap" : f.total ? "Total savings goal" : "No cap");

  const priorityList = priorityRows
    .filter((r) => hasVal(r.max))
    .map((r) => `${r.label} ${money(Number(r.max))}`)
    .join(" · ");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`
        .pp-cap-card{background:#fff;border:2px solid #9A72F0;border-radius:22px;padding:6px 20px 10px}
        .pp-cap-row{padding:12px 0;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-top:1.5px solid ${LINE}}
        .pp-cap-row:first-of-type{border-top:0}
        .pp-cap-dot{width:9px;height:9px;border-radius:50%;background:#9A72F0;flex:none}
        .pp-cap-name{flex:1 1 130px;min-width:0;font-size:17px;font-weight:700;overflow-wrap:anywhere}
        .pp-cap-pct{background:#F4EEFF;border-radius:999px;padding:4px 12px;font-family:${MONO};font-weight:700;font-size:16px;color:${PURPLE}}
        .pp-cap-menu{position:relative}
        .pp-cap-sel{min-width:190px;height:40px;display:flex;align-items:center;justify-content:space-between;gap:10px;font:inherit;font-size:15px;font-weight:700;color:#241337;border:2px solid #D9C9FF;border-radius:12px;padding:0 12px;background:#fff;cursor:pointer}
        .pp-cap-pop{position:absolute;right:0;top:calc(100% + 6px);z-index:20;min-width:100%;background:#fff;border:2px solid #9A72F0;border-radius:12px;padding:6px;box-shadow:0 10px 24px rgba(78,34,184,.15)}
        .pp-cap-opt{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-size:15px;font-weight:700;color:#241337;cursor:pointer;white-space:nowrap}
        .pp-cap-opt:hover{background:#F4EEFF}
        .pp-cap-opt input{width:18px;height:18px;accent-color:#4E22B8}
        .pp-cap-both{width:100%;font-size:13px;font-weight:600;color:#6B4FB8}
        .pp-cap-detail{width:100%;display:flex;gap:8px;flex-wrap:wrap;padding:0 0 4px 19px}
        .pp-cap-chip{display:inline-flex;align-items:center;gap:6px;border:2px solid #9A72F0;border-radius:12px;padding:3px 10px;font-size:13px;font-weight:800;color:${PURPLE};white-space:nowrap}
        .pp-cap-chip.soft{border-color:#D9C9FF}
        .pp-cap-chip input{flex:none;width:92px;max-width:92px;box-sizing:border-box;border:0;background:transparent;font-family:${MONO};font-weight:700;font-size:15px;color:#241337;text-align:left;padding:2px 0;outline:none;-moz-appearance:textfield}
        .pp-cap-chip input::-webkit-outer-spin-button,.pp-cap-chip input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        .pp-cap-def{flex:1;background:#EDE6FF;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.45;display:flex;flex-direction:column;gap:8px}
        .pp-cap-ex{margin-top:auto;display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:10px;padding:8px 12px;gap:8px}
        .pp-tip{position:relative;display:inline-flex;align-items:center;cursor:help;outline:none}
        .pp-tip-box{display:none;position:absolute;left:0;bottom:calc(100% + 8px);width:240px;z-index:30;background:#241337;color:#fff;border-radius:10px;padding:9px 12px;font-size:13px;font-weight:600;line-height:1.4;white-space:normal;text-transform:none;letter-spacing:0}
        .pp-tip:hover .pp-tip-box,.pp-tip:focus .pp-tip-box{display:block}
        @media (max-width:560px){.pp-cap-defs{flex-direction:column}}
      `}</style>

      <p style={{ margin: 0, fontSize: 15, color: "#4A3F63", lineHeight: 1.5 }}>
        Optional.{priorityRows.length > 0 ? " Your top and secondary priority bills are already capped." : ""}
      </p>

      {priorityList && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: `1.5px solid ${LINE}`, borderRadius: 14, padding: "10px 16px", fontSize: 14 }}>
          <span><b>Already capped:</b> {priorityList} <span style={{ color: "#574A68" }}>(monthly)</span></span>
          {onEditPriority && (
            <button type="button" onClick={onEditPriority} style={{ background: "transparent", border: 0, font: "inherit", fontWeight: 800, color: PURPLE, cursor: "pointer" }}>Edit</button>
          )}
        </div>
      )}

      <div className="pp-cap-defs" style={{ display: "flex", gap: 12 }}>
        <div className="pp-cap-def">
          <div><b style={{ color: PURPLE }}>Monthly cap</b><br />Stops at a monthly amount. Resets every month.</div>
          <div className="pp-cap-ex"><span style={{ fontWeight: 700 }}>Business Expenses (OPEX)</span><span style={{ fontFamily: MONO, fontWeight: 700, color: PURPLE }}>$1,500</span></div>
        </div>
        <div className="pp-cap-def">
          <div><b style={{ color: PURPLE }}>Total savings goal</b><br />Stops when you reach your total. Does not reset.</div>
          <div className="pp-cap-ex"><span style={{ fontWeight: 700 }}>Wedding Fund</span><span style={{ fontFamily: MONO, fontWeight: 700, color: PURPLE }}>$25,000</span></div>
        </div>
      </div>

      <div style={{ background: "#EDE6FF", borderRadius: 14, padding: "12px 16px", fontSize: 14, lineHeight: 1.55 }}>
        <b style={{ color: PURPLE }}>When a category reaches its cap or goal,</b> PrioritySave resets it to 0% and the other categories in this tier
        automatically increase to absorb that percentage.
      </div>

      <div className="pp-cap-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "12px 0 2px" }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: PURPLE }}>Final Splits</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#8A7FA0" }}>Optional caps</span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.5, color: "#4A3F63", margin: "0 0 4px" }}>
          Tick a monthly cap, a total savings goal, or both for any category you want to stop funding once it is full. Monthly caps reset each month.
          Total savings goals reset when the category dips below the target savings amount.
        </p>
        {live.map((r) => {
          const f = flagsFor(r);
          const isOpen = openId === r.id;
          return (
            <div className="pp-cap-row" key={r.id}>
              <span className="pp-cap-dot" />
              <span className="pp-cap-name">{r.label}</span>
              <span className="pp-cap-pct">{Math.round((Number(r.pct) || 0) * 100) / 100}%</span>
              <div className="pp-cap-menu" ref={isOpen ? menuRef : null}>
                <button type="button" className="pp-cap-sel" aria-haspopup="true" aria-expanded={isOpen} aria-label={`Cap for ${r.label}`} onClick={() => setOpenId(isOpen ? null : r.id)}>
                  <span>{labelFor(f)}</span><span aria-hidden="true">▾</span>
                </button>
                {isOpen && (
                  <div className="pp-cap-pop" role="group" aria-label={`Cap types for ${r.label}`}>
                    <label className="pp-cap-opt"><input type="checkbox" checked={f.monthly} onChange={() => toggle(r, "monthly")} />Monthly cap</label>
                    <label className="pp-cap-opt"><input type="checkbox" checked={f.total} onChange={() => toggle(r, "total")} />Total savings goal</label>
                  </div>
                )}
              </div>
              {(f.monthly || f.total) && (
                <div className="pp-cap-detail">
                  {f.monthly && (
                    <label className="pp-cap-chip">
                      Monthly cap $
                      <input type="number" inputMode="decimal" min={1} step="any" aria-label={`${r.label} monthly cap amount`} placeholder="1,500"
                        value={hasVal(r.max) ? r.max : ""} onChange={(e) => setAmount(r, "monthly", e.target.value)} />
                    </label>
                  )}
                  {f.total && (
                    <>
                      <label className="pp-cap-chip">
                        Goal $
                        <input type="number" inputMode="decimal" min={1} step="any" aria-label={`${r.label} savings goal amount`} placeholder="25,000"
                          value={hasVal(r.categoryCap) ? r.categoryCap : ""} onChange={(e) => setAmount(r, "total", e.target.value)} />
                      </label>
                      <label className="pp-cap-chip soft">
                        <Tip text={START_TIP}>Starting balance</Tip> $
                        <input type="number" inputMode="decimal" min={0} step="any" aria-label={`${r.label} starting balance`} placeholder="0"
                          value={r.startingBalance ?? ""} onChange={(e) => onUpdate(r.id, { startingBalance: e.target.value.replace(/^0+(?=\d)/, "") })} />
                      </label>
                    </>
                  )}
                  {f.monthly && f.total && (
                    <div className="pp-cap-both">Using both? Whichever limit is reached first stops new money for this category.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
