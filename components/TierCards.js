"use client";

import { useState, useRef, useEffect } from "react";
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

const TIER_TAG = "Even split, then waterfall";
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
.pp-tier-num{width:26px;height:26px;border-radius:50%;background:${PURPLE};color:#fff;border:2px solid ${PURPLE};display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex:none;align-self:center}
.pp-tier-num.out{background:#fff;color:${PURPLE}}
.pp-tier-tag{font-size:13px;font-weight:500;color:#4A3F63;white-space:nowrap}
.pp-tier-stack{background:#fff;border:2px solid #9A72F0;border-radius:18px;overflow:hidden}
.pp-tier-stack .pp-tier-card{border:0;border-radius:0;padding:0 18px 4px;background:#fff}
.pp-tier-stack .pp-tier-head{background:#F4EEFF;margin:0 -18px;padding:9px 18px;align-items:center;justify-content:flex-start;gap:10px}
.pp-tier-stack .pp-tier-title{flex:1}
.pp-tier-stack .pp-tier-sub{display:none}
.pp-tier-stack .pp-tier-head + .pp-tier-sub + .pp-tier-row{border-top:0}
.pp-tier-flow{text-align:center;font-size:12px;font-weight:800;color:${PURPLE};padding:5px 0;border-top:2px solid #D9C9FF;border-bottom:2px solid #D9C9FF;background:#fff}
.pp-tier-addlink{background:transparent;border:0;font:inherit;font-size:14px;font-weight:800;color:${PURPLE};cursor:pointer;padding:4px;text-align:left}
.pp-tier-arrow{text-align:center;color:${PURPLE};font-weight:800;font-size:14px;padding:2px 0}
.pp-tier-hint{font-size:13px;font-weight:600;color:#6B4FB8;width:100%}
.pp-tier-err{font-size:13px;font-weight:700;color:#B3261E;width:100%}
.pp-tier-acct{width:100%;max-width:420px}
.pp-tier-acct-l{font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#574A68;margin-bottom:4px}
`;

function Header({ n, outline, title, tag, tagTitle, total, ok, show = true, action }) {
  return (
    <div className="pp-tier-head">
      {n ? <span className={`pp-tier-num${outline ? " out" : ""}`}>{n}</span> : null}
      <div className="pp-tier-title">{title}</div>
      {tag ? <span className="pp-tier-tag" title={tagTitle}>{tag}</span> : null}
      {action || <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: ok ? PURPLE : "#B3261E", whiteSpace: "nowrap" }}>{show ? total : ""}</span>}
    </div>
  );
}

export function TierArrow({ children }) {
  return <div className="pp-tier-arrow">↓ {children}</div>;
}

function BillRow({ r, showErrors, accounts, onUpdate, onRemoveRow, focusName }) {
  const [open, setOpen] = useState(false);
  // The red "required" error only shows after they click out of the empty cap
  // box, so a brand new row never starts out looking like a mistake.
  const [touched, setTouched] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { if (focusName && nameRef.current) nameRef.current.focus(); }, [focusName]);
  const capMissing = !(Number(r.max) > 0);
  const showBad = showErrors && touched && capMissing;
  return (
    <div data-rule-id={r.id} className="pp-tier-row">
      <span className="pp-tier-dot" />
      <input ref={nameRef} className="pp-tier-name" aria-label="Bill name" placeholder="Name" value={r.label || ""} onChange={(e) => onUpdate(r.id, { label: e.target.value })} />
      <span className={`pp-tier-cap${showBad ? " pp-tier-bad" : ""}`}>
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
          onBlur={() => setTouched(true)}
          onChange={(e) => onUpdate(r.id, { max: e.target.value === "" ? null : Number(e.target.value) })}
        />
      </span>
      {accounts && (
        <button type="button" className="pp-tier-more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? "See less ▴" : "See more ▾"}
        </button>
      )}
      <button type="button" className="pp-tier-x" aria-label={`Remove ${r.label || "bill"}`} onClick={() => onRemoveRow(r.id)}>✕</button>
      {showBad && <div className="pp-tier-err">Enter a monthly cap to continue.</div>}
      {showErrors && !touched && capMissing && <div className="pp-tier-hint">Add a monthly cap to finish this row. It saves as soon as you do.</div>}
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

export default function TierCards({ percent, onUpdate, onAddRow, onRemoveRow, onAddTier, onRemoveTier, accounts, showErrors = true, minTiers = 0, children }) {
  const tiers = priorityTiers(percent);
  // Empty placeholder tiers: with `minTiers` set (Deposit Splits), at least that
  // many priority tiers are always drawn, even before they have a category, so
  // people can see the waterfall has more than one level. They are only a
  // drawing: nothing is saved until a category is added to one. "Add a
  // priority tier" adds one more placeholder while any are showing.
  const [extra, setExtra] = useState(0);
  const placeholders = Math.max(0, minTiers + extra - tiers.length);
  const shown = tiers.length + placeholders;
  const [confirming, setConfirming] = useState(null);
  const initialIds = useRef(null);
  if (initialIds.current === null) initialIds.current = new Set(percent.map((r) => r.id));
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <style>{TIER_CSS}</style>
      <div className="pp-tier-stack">
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
            <div key={t}>
              <div className="pp-tier-card">
                <Header n={t} title={tierName(t)} tag={TIER_TAG} tagTitle={TIER_SUB} action={delAction} />
                <p className="pp-tier-sub">{TIER_SUB}</p>
                {rows.map((r) => (
                  <BillRow key={r.id} r={r} showErrors={showErrors} accounts={accounts} onUpdate={onUpdate} onRemoveRow={onRemoveRow} focusName={!initialIds.current.has(r.id)} />
                ))}
                <button type="button" className="pp-tier-add" onClick={() => onAddRow(t)}>+ Add to this tier</button>
              </div>
              <div className="pp-tier-flow">↓ Cap reached? The rest flows down</div>
            </div>
          );
        })}
        {Array.from({ length: placeholders }, (_, k) => {
          const n = tiers.length + k + 1;
          return (
            <div key={`ph${n}`}>
              <div className="pp-tier-card">
                <Header n={n} title={tierName(n)} tag={TIER_TAG} tagTitle={TIER_SUB} action={placeholders + tiers.length > minTiers && k === placeholders - 1 && extra > 0 ? <button type="button" className="pp-tier-more" style={{ color: "#8A7FA0" }} onClick={() => setExtra((v) => Math.max(0, v - 1))}>Remove tier</button> : null} />
                <p className="pp-tier-sub">{TIER_SUB}</p>
                <div className="pp-tier-row" style={{ color: "#6B5F80", fontSize: 14 }}>
                  <span className="pp-tier-dot" style={{ background: "#D2C4F0" }} />
                  <span style={{ flex: 1 }}>
                    {n === 1 ? "Nothing here yet. Add the bills you want paid first, like rent." : "Nothing here yet. Add the next bills to pay once the tier above is full."}
                  </span>
                </div>
                <button type="button" className="pp-tier-add" onClick={() => onAddRow(tiers.length + 1)}>+ Add to this tier</button>
              </div>
              <div className="pp-tier-flow">↓ Cap reached? The rest flows down</div>
            </div>
          );
        })}
        {/* "+ Add a priority tier" sits just above the Final Categories card */}
        <div style={{ padding: "9px 18px", background: "#fff", borderBottom: "2px solid #D9C9FF" }}>
          <button type="button" className="pp-tier-addlink" style={{ padding: 0 }} onClick={() => (placeholders > 0 ? setExtra((v) => v + 1) : onAddTier())}>
            + Add a priority tier{shown === 0 ? " (rent, car payment, insurance... paid before anything else)" : ""}
          </button>
        </div>
        {typeof children === "function" ? children(shown) : children}
      </div>
    </div>
  );
}

// Onboarding's last tier, drawn like the two above: plain rows with a percent
// pill, no caps. Core rows (Tax Reserve, Savings...) keep their name fixed.
export function TierLastCard({ rows, onUpdate, onRemove, overflow, persona, title = "Everything else", num, retirement, children }) {
  const total = Math.round(rows.reduce((n, r) => n + (Number(r.pct) || 0), 0) * 100) / 100;
  const stays = Math.round(Math.max(0, 100 - total) * 100) / 100;
  const over = total > 100.0001;
  return (
    <div className="pp-tier-card">
      <style>{TIER_CSS}</style>
      <Header n={num} outline title={title} tag="By percent, can be under 100%" tagTitle="This is the final tier. The percentages below do NOT need to add up to 100% of your deposit." total={`${total}%`} ok={!over} />
      <p className="pp-tier-sub">
        This is the final tier. The percentages below do NOT need to add up to 100% of your deposit. For example, you could schedule just 75% of each deposit to be split among the categories below.
      </p>
      {(() => {
        // Retirement accounts are shown as ONE row (the total). How that total is
        // shared between the accounts is set in the Retirement accounts card.
        const retIds = new Set(retirement ? retirement.rows.map((x) => x.id) : []);
        let shown = false;
        return rows.map((r) => {
          if (retIds.has(r.id)) {
            if (shown) return null;
            shown = true;
            const names = retirement.rows.filter((x) => x.retirementType || x.id !== "retirement_savings").map((x) => x.label).join(", ");
            return (
              <div key="retirement-group">
                <div className="pp-tier-row">
                  <span className="pp-tier-dot" />
                  <span className="pp-tier-namefixed">
                    Retirement{names ? <span style={{ fontWeight: 500, color: "#4A3F63", fontSize: 14 }}> · {names}</span> : null}
                  </span>
                  <span className="pp-tier-pill">
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={100}
                      step="any"
                      aria-label="Retirement percent"
                      value={retirement.total === 0 ? 0 : retirement.total}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => retirement.onTotal(e.target.value)}
                    />
                    %
                  </span>
                  <button type="button" className="pp-tier-x" aria-label="Remove retirement" onClick={retirement.onRemove}>✕</button>
                </div>
                {overflow && retIds.has(overflow.id) && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, color: "#B42318", margin: "0 0 8px" }}>{overflow.message}</p>
                )}
              </div>
            );
          }
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
              });
      })()}
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
