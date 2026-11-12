"use client";

import { useState } from "react";
import AccountSelect from "./AccountSelect";
import { tierRows, priorityTiers, tierName, computeAllocations, isCoreRow, currency } from "@/lib/allocations";

// The tiered Deposit Splits layout (see the "Set your splits" design): Tier 1
// (paid first), Tier 2 (fixed bills) and the last tier, each a purple-outlined
// card with a header, a one-line explainer and plain rows. Tier 1 and 2 rows have a
// percent (of what reaches the tier) and a REQUIRED monthly cap, and each tier
// adds up to exactly 100%. The last tier needs no caps and may add up to less.
//
// Used by onboarding (no account pickers yet) and by Deposit Splits
// (`accounts` passed, so each bill can pick the account it is paid from).

const PURPLE = "#4E22B8";
const LINE = "#E7DEFA";
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)";

const TIER_SUB = "100% of each deposit is split evenly across these categories. As soon as a category meets the monthly cap, the rest of the deposit waterfalls down to the next tier.";

export const TIER_CSS = `
.pp-tier-card{background:#fff;border:2px solid #9A72F0;border-radius:22px;padding:6px 20px 8px}
.pp-tier-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:12px 0 2px}
.pp-tier-title{font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${PURPLE}}
.pp-tier-sub{font-size:14px;line-height:1.5;color:#4A3F63;margin:0 0 4px}
.pp-tier-row{padding:13px 0;border-top:1.5px solid ${LINE};display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pp-tier-dot{width:9px;height:9px;border-radius:50%;background:#9A72F0;flex:none}
.pp-tier-name{flex:1 1 130px;min-width:0;font:inherit;font-size:17px;font-weight:700;color:inherit;background:transparent;border:1.5px solid transparent;border-radius:10px;padding:4px 6px;margin-left:-6px}
.pp-tier-name:hover,.pp-tier-name:focus{border-color:#D9C9FF;background:#fff;outline:none}
.pp-tier-namefixed{flex:1 1 130px;min-width:0;font-size:17px;font-weight:700}
.pp-tier-pill{display:inline-flex;align-items:center;gap:2px;background:#F4EEFF;border-radius:999px;padding:4px 12px;font-family:${MONO};font-weight:700;font-size:16px;color:${PURPLE};white-space:nowrap}
.pp-tier-pill input{width:44px;border:0;background:transparent;font:inherit;color:inherit;text-align:right;padding:2px 0;outline:none;-moz-appearance:textfield}
.pp-tier-pill input::-webkit-outer-spin-button,.pp-tier-pill input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.pp-tier-pill input:focus{background:#fff;border-radius:6px}
.pp-tier-pill input[readonly]{cursor:default}
.pp-tier-cap{display:inline-flex;align-items:center;gap:6px;border:2px solid #9A72F0;border-radius:12px;padding:3px 10px;font-size:13px;font-weight:800;color:${PURPLE};white-space:nowrap}
.pp-tier-cap input{width:62px;border:0;background:transparent;font-family:${MONO};font-weight:700;font-size:15px;color:#241337;text-align:right;padding:2px 0;outline:none;-moz-appearance:textfield}
.pp-tier-cap input::-webkit-outer-spin-button,.pp-tier-cap input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.pp-tier-cap.pp-tier-bad{border-color:#B3261E}
.pp-tier-x{width:30px;height:30px;border:0;background:transparent;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:#8A7FA0;font-size:15px;font-weight:800}
.pp-tier-x:hover{background:#F3EEFF;color:#4A3F63}
.pp-tier-more{background:transparent;border:0;font:inherit;font-size:14px;font-weight:800;color:${PURPLE};cursor:pointer;padding:4px 6px;white-space:nowrap}
.pp-tier-details{width:100%;padding:4px 0 2px 19px;display:grid;gap:10px}
.pp-tier-add{display:block;width:100%;text-align:left;background:transparent;border:0;border-top:1.5px solid ${LINE};padding:12px 0 6px;font:inherit;font-size:15px;font-weight:800;color:${PURPLE};cursor:pointer}
.pp-tier-arrow{text-align:center;color:${PURPLE};font-weight:800;font-size:14px;padding:2px 0}
.pp-tier-err{font-size:13px;font-weight:700;color:#B3261E;width:100%}
.pp-tier-acct{width:100%;max-width:420px}
.pp-tier-acct-l{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#574A68;margin-bottom:4px}
`;

function Header({ title, total, ok, show = true, action }) {
  return (
    <div className="pp-tier-head">
      <div className="pp-tier-title">{title}</div>
      {action || <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: ok ? PURPLE : "#B3261E", whiteSpace: "nowrap" }}>{show ? total : ""}</span>}
    </div>
  );
}

export function TierArrow({ children }) {
  return <div className="pp-tier-arrow">↓ {children}</div>;
}

function BillRow({ r, showErrors, accounts, onUpdate, onRemoveRow }) {
  const [open, setOpen] = useState(false);
  const capMissing = !(Number(r.max) > 0);
  return (
    <div data-rule-id={r.id} className="pp-tier-row">
      <span className="pp-tier-dot" />
      <input className="pp-tier-name" aria-label="Bill name" placeholder="Name" value={r.label || ""} onChange={(e) => onUpdate(r.id, { label: e.target.value })} />
      <span className={`pp-tier-cap${showErrors && capMissing ? " pp-tier-bad" : ""}`}>
        Monthly cap
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15, color: "#241337" }}>$</span>
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
        />
      </span>
      {accounts && (
        <button type="button" className="pp-tier-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "See less ▴" : "See more ▾"}
        </button>
      )}
      <button type="button" className="pp-tier-x" aria-label={`Remove ${r.label || "bill"}`} onClick={() => onRemoveRow(r.id)}>✕</button>
      {showErrors && capMissing && <div className="pp-tier-err">Enter a monthly cap to continue.</div>}
      {accounts && open && (
        <div className="pp-tier-details">
          <div className="pp-tier-acct">
            <div className="pp-tier-acct-l">Bank account</div>
            <AccountSelect value={r.accountId || ""} onChange={(id) => onUpdate(r.id, { accountId: id })} accounts={accounts} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TierCards({ percent, onUpdate, onAddRow, onRemoveRow, onAddTier, onRemoveTier, accounts, showErrors = true }) {
  const tiers = priorityTiers(percent);
  const [confirming, setConfirming] = useState(null);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <style>{TIER_CSS}</style>
      {tiers.map((t) => {
        const rows = tierRows(percent, t);
        const delAction =
          confirming === t ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: "#B3261E", whiteSpace: "nowrap" }}>
              Delete this tier and its {rows.length} {rows.length === 1 ? "bill" : "bills"}?{" "}
              <button type="button" className="pp-tier-more" style={{ color: "#B3261E" }} onClick={() => { setConfirming(null); onRemoveTier(t); }}>Yes, delete</button>
              <button type="button" className="pp-tier-more" onClick={() => setConfirming(null)}>Cancel</button>
            </span>
          ) : (
            <button type="button" className="pp-tier-more" style={{ color: "#8A7FA0" }} onClick={() => setConfirming(t)}>Delete tier</button>
          );
        return (
          <div key={t} style={{ display: "grid", gap: 12 }}>
            <div className="pp-tier-card">
              <Header title={tierName(t)} action={delAction} />
              <p className="pp-tier-sub">{TIER_SUB}</p>
              {rows.map((r) => (
                <BillRow key={r.id} r={r} showErrors={showErrors} accounts={accounts} onUpdate={onUpdate} onRemoveRow={onRemoveRow} />
              ))}
              <button type="button" className="pp-tier-add" onClick={() => onAddRow(t)}>+ Add to this tier</button>
            </div>
            <TierArrow>What is left flows down</TierArrow>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAddTier}
        style={{ border: "2px dashed #9A72F0", background: "transparent", borderRadius: 18, padding: "14px 16px", font: "inherit", fontSize: 15, fontWeight: 800, color: PURPLE, cursor: "pointer" }}
      >
        + Add a priority tier{tiers.length === 0 ? " (rent, car payment, insurance... paid before anything else)" : ""}
      </button>
      {tiers.length > 0 && null}
    </div>
  );
}

// Onboarding's last tier, drawn like the two above: plain rows with a percent
// pill, no caps. Core rows (Tax Reserve, Savings...) keep their name fixed.
export function TierLastCard({ rows, onUpdate, onRemove, overflow, persona, title = "Everything else", children }) {
  const total = Math.round(rows.reduce((n, r) => n + (Number(r.pct) || 0), 0) * 100) / 100;
  const stays = Math.round(Math.max(0, 100 - total) * 100) / 100;
  const over = total > 100.0001;
  return (
    <div className="pp-tier-card">
      <style>{TIER_CSS}</style>
      <Header title={title} total={`${total}%`} ok={!over} />
      <p className="pp-tier-sub">
        This is the final tier. The percentages below do NOT need to add up to 100% of your deposit. For example, you could schedule just 75% of each deposit to be split among the categories below.
      </p>
      {rows.map((r) => {
        const editableName = !isCoreRow(r, persona);
        return (
          <div key={r.id}>
            <div className="pp-tier-row">
              <span className="pp-tier-dot" />
              {editableName ? (
                <input className="pp-tier-name" aria-label="Category name" value={r.label} onChange={(e) => onUpdate(r.id, { label: e.target.value })} onFocus={(e) => e.target.select()} />
              ) : (
                <span className="pp-tier-namefixed">{r.label}</span>
              )}
              <span className="pp-tier-pill">
                <input
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
              <button type="button" className="pp-tier-x" aria-label={`Remove ${r.label}`} onClick={() => onRemove(r.id)}>✕</button>
            </div>
            {overflow && overflow.id === r.id && (
              <p style={{ fontSize: 13, lineHeight: 1.5, color: "#B42318", margin: "0 0 8px" }}>{overflow.message}</p>
            )}
          </div>
        );
      })}
      {children}
    </div>
  );
}

// "Example: a $3,000 deposit." -- the same engine the real split uses, run on
// what is on screen, so it updates as someone edits.
const EXAMPLE = 3000;
export function TierExample({ percent }) {
  const { allocated } = computeAllocations({ fixed: [], percent }, EXAMPLE);
  const amt = (r) => allocated[r.id] || 0;
  const list = (arr) => (arr.length <= 1 ? arr[0] || "" : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`);
  const sentences = [];
  let used = 0;
  priorityTiers(percent).forEach((t) => {
    const rows = tierRows(percent, t).filter((r) => amt(r) > 0.005);
    if (!rows.length) return;
    rows.forEach((r) => { used += amt(r); });
    sentences.push(`${tierName(t).replace(" Categories", "")} sends ${list(rows.map((r) => `${currency(amt(r))} to ${r.label}`))}.`);
  });
  const left = Math.max(0, EXAMPLE - used);
  const last = tierRows(percent, 0).filter((r) => amt(r) > 0.005);
  const lastSum = last.reduce((n, r) => n + amt(r), 0);
  const stays = Math.max(0, left - lastSum);
  if (last.length) {
    sentences.push(`The remaining ${currency(left)} goes to your percent split${stays > 0.005 ? `, and ${currency(stays)} of it stays where your deposit landed` : ""}.`);
  }
  if (!sentences.length) return null;
  return (
    <div style={{ background: "#EDE6FF", borderRadius: 14, padding: "12px 16px", fontSize: 14, lineHeight: 1.55 }}>
      <b style={{ color: PURPLE }}>Example: a {currency(EXAMPLE)} deposit.</b> {sentences.join(" ")}
    </div>
  );
}
