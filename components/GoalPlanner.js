"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import { GOAL_KINDS, GROUP_SUGGESTIONS, STATUSES } from "@/lib/goalTemplates";

// The mini planner under a goal: groups of items with amounts, a status, and
// details (link, note, picture). Starts from a template for the kind of goal.
const PURPLE = "#6D3BE0";
const STATUS_STYLE = {
  idea: { bg: "#F1ECFB", fg: "#4A3F63" },
  booked: { bg: "#E6F0FF", fg: "#1F4E9E" },
  paid: { bg: "#E8F7F3", fg: "#0F6B4F" },
};

async function call(body) {
  return fetch("/api/goal-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json()).catch(() => ({ error: "Couldn't reach the server." }));
}

function ItemRow({ item, label, onChange, onError }) {
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(item.amount ? String(item.amount) : "");
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(item.link);
  const [note, setNote] = useState(item.note);
  const [busy, setBusy] = useState(false);
  const st = STATUS_STYLE[item.status] || STATUS_STYLE.idea;

  const save = async (patch) => {
    const res = await call({ action: "updateItem", label, id: item.id, ...patch });
    if (res.error) onError(res.error); else onChange(res);
  };
  const readLink = async () => {
    if (!link.trim()) return;
    setBusy(true);
    const r = await call({ action: "readLink", url: link.trim() });
    setBusy(false);
    if (r.error) return onError(r.error);
    const patch = { link: r.link || link.trim() };
    if (r.image) patch.photoUrl = r.image;
    if (r.price && !Number(amount)) { patch.amount = r.price; setAmount(String(r.price)); }
    if (r.title && (!name || /^(new item|item)$/i.test(name))) { patch.name = r.title; setName(r.title); }
    await save(patch);
    if (r.partial) onError("That site didn't share details, so the link is saved. Add the amount yourself.");
  };

  return (
    <div style={{ borderTop: "1px solid #EFE8FB" }}>
      <div className="flex items-center gap-2 py-2">
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== item.name && save({ name })}
          className="flex-1 min-w-0 border border-transparent hover:border-neutral-200 rounded-lg px-2 py-1 text-[15px] font-semibold bg-transparent" aria-label="Item name" />
        <div className="flex items-center rounded-lg border border-neutral-200 px-2 w-28">
          <span className="text-neutral-500 text-[14px]">$</span>
          <input value={amount} inputMode="decimal" placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            onBlur={() => Number(amount || 0) !== item.amount && save({ amount: Number(amount || 0) })}
            className="w-full py-1 pl-1 text-[15px] font-mono bg-transparent outline-none text-right" aria-label="Amount" />
        </div>
        <select value={item.status} onChange={(e) => save({ status: e.target.value })} aria-label="Status"
          className="rounded-full text-[13px] font-bold px-2 py-1 border-0" style={{ background: st.bg, color: st.fg }}>
          {STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-[13px] font-bold shrink-0" style={{ color: "#4E22B8" }}>
          {open ? "Hide" : "See details"}
        </button>
      </div>
      {open && (
        <div className="pb-3 pl-2 space-y-2">
          {item.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt="" style={{ width: "100%", maxWidth: 360, maxHeight: 200, objectFit: "cover", borderRadius: 14 }} referrerPolicy="no-referrer" />
          )}
          <div className="flex gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a link (reservation, listing, event)"
              className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-3 py-2 text-[14px]" />
            <GhostButton onClick={readLink} disabled={busy} className="text-[14px] px-3 py-2">{busy ? "Reading…" : "Add details via link"}</GhostButton>
          </div>
          {item.link && <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold break-all" style={{ color: "#4E22B8" }}>Open link ↗</a>}
          <textarea value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== item.note && save({ note })}
            placeholder="Notes: confirmation number, dates, what you are thinking"
            className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[14px]" rows={2} />
          <div className="flex gap-3 items-center">
            <GhostButton onClick={() => link !== item.link && save({ link })} className="text-[13px] px-3 py-1">Save link</GhostButton>
            <button type="button" className="text-[13px] font-semibold ml-auto" style={{ color: "#B42318" }}
              onClick={async () => { const res = await call({ action: "deleteItem", label, id: item.id }); res.error ? onError(res.error) : onChange(res); }}>
              Remove item
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddItem({ label, groupId, onChange, onError }) {
  const [mode, setMode] = useState(null); // null | "item" | "link"
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (!text.trim()) return;
    setBusy(true);
    let body = { action: "addItem", label, groupId };
    if (mode === "link") {
      const r = await call({ action: "readLink", url: text.trim() });
      if (r.error) { setBusy(false); return onError(r.error); }
      body = { ...body, name: r.title || "New item", amount: r.price || 0, link: r.link, photoUrl: r.image || "" };
      if (r.partial) onError("That site didn't share details, so the link is saved. Add the name and amount yourself.");
    } else body.name = text.trim();
    const res = await call(body);
    setBusy(false);
    if (res.error) return onError(res.error);
    setText(""); setMode(null); onChange(res);
  };
  if (!mode) {
    return (
      <div className="flex gap-4 pt-2" style={{ borderTop: "1px solid #EFE8FB" }}>
        <button type="button" onClick={() => setMode("item")} className="text-[14px] font-bold" style={{ color: "#4E22B8" }}>+ Add item</button>
        <button type="button" onClick={() => setMode("link")} className="text-[14px] font-bold" style={{ color: "#4E22B8" }}>+ Add from a link</button>
      </div>
    );
  }
  return (
    <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid #EFE8FB" }}>
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder={mode === "link" ? "Paste a link to a reservation, listing or event" : "What is it? (for example, Rental car)"}
        className="flex-1 min-w-0 border border-neutral-200 rounded-lg px-3 py-2 text-[15px]" />
      <PrimaryButton onClick={go} disabled={busy} className="text-[14px] px-3 py-2">{busy ? "Adding…" : "Add"}</PrimaryButton>
      <GhostButton onClick={() => { setMode(null); setText(""); }} className="text-[14px] px-3 py-2">Cancel</GhostButton>
    </div>
  );
}


// Upload a plan: scan a file, show what would change, apply only on confirm.
function UploadPlan({ label, onApplied, onError }) {
  const fileRef = useRef(null);
  const [state, setState] = useState("idle"); // idle | scanning | review | applying
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState(null);

  const scan = async (file) => {
    setState("scanning"); setMsg(null);
    const fd = new FormData(); fd.append("file", file); fd.append("label", label);
    const r = await fetch("/api/goal-plan/scan", { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ error: "Couldn't reach the server." }));
    if (fileRef.current) fileRef.current.value = "";
    if (r.error) { setState("idle"); return setMsg(r.error); }
    const list = (r.proposals || []).map((p) => ({ ...p, on: p.kind !== "same" }));
    if (!list.length) { setState("idle"); return setMsg("No costs found in that file."); }
    setRows(list); setState("review");
  };
  const apply = async () => {
    const chosen = rows.filter((r) => r.on && r.kind !== "same");
    if (!chosen.length) { setState("idle"); return; }
    setState("applying");
    const res = await call({ action: "applyPlan", label, items: chosen.map((r) => ({ group: r.group, name: r.name, amount: r.amount, existingId: r.existingId })) });
    if (res.error) { setState("review"); return onError(res.error); }
    setState("idle"); setRows([]); setMsg(`Updated your plan with ${chosen.length} change${chosen.length === 1 ? "" : "s"}.`);
    onApplied(res);
  };
  const n = (k) => rows.filter((r) => r.kind === k).length;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="font-bold text-[16px]">Already have a plan?</div>
          <div className="text-[13.5px]" style={{ color: "var(--color-neutral-700)" }}>Upload a quote or plan from a pro (PDF, photo or CSV). You review every change before anything is updated.</div>
        </div>
        <PrimaryButton onClick={() => fileRef.current?.click()} disabled={state === "scanning" || state === "applying"} className="text-[14px] px-4 py-2">
          {state === "scanning" ? "Reading your plan…" : "Upload a plan"}
        </PrimaryButton>
        <input ref={fileRef} type="file" accept=".pdf,.csv,.txt,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && scan(e.target.files[0])} />
      </div>
      {msg && <p className="text-[14px] mt-3" style={{ color: msg.startsWith("Updated") ? "#0F6B4F" : "#B42318" }}>{msg}</p>}
      {(state === "review" || state === "applying") && (
        <div className="mt-4">
          <div className="text-[14px] font-bold mb-2">Review before we change anything: {n("new")} new, {n("changed")} changed, {n("same")} already match</div>
          <div style={{ border: "1px solid #E7DEFA", borderRadius: 14 }}>
            {rows.map((r, i) => (
              <label key={i} className="flex items-center gap-3 px-3 py-2 text-[14.5px]" style={{ borderTop: i ? "1px solid #EFE8FB" : "none", opacity: r.kind === "same" ? 0.55 : 1 }}>
                <input type="checkbox" checked={r.on && r.kind !== "same"} disabled={r.kind === "same"} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                <span className="flex-1 min-w-0">
                  <span className="font-semibold">{r.name}</span>
                  <span className="block text-[12.5px]" style={{ color: "var(--color-neutral-700)" }}>{r.group}</span>
                </span>
                <span className="text-[12px] font-bold rounded-full px-2 py-0.5" style={{ background: r.kind === "new" ? "#E8F7F3" : r.kind === "changed" ? "#FFF4D6" : "#F1ECFB", color: r.kind === "new" ? "#0F6B4F" : r.kind === "changed" ? "#8A5A00" : "#4A3F63" }}>
                  {r.kind === "new" ? "New" : r.kind === "changed" ? "Changed" : "Same"}
                </span>
                <span className="font-mono text-right w-28">
                  {r.kind === "changed" ? <><s style={{ color: "#8A7FA5" }}>{currency(r.oldAmount)}</s> {currency(r.amount)}</> : currency(r.amount)}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <PrimaryButton onClick={apply} disabled={state === "applying"} className="text-[14px] px-4 py-2">{state === "applying" ? "Updating…" : "Update my plan"}</PrimaryButton>
            <GhostButton onClick={() => { setState("idle"); setRows([]); }} className="text-[14px] px-4 py-2">Cancel</GhostButton>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function GoalPlanner({ label, kind, target, onUseTotal }) {
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    fetch(`/api/goal-plan?label=${encodeURIComponent(label)}`).then((r) => r.json()).then((d) => (d.error ? setErr(d.error) : setPlan(d))).catch(() => setErr("Couldn't load the planner."));
  }, [label]);

  const apply = (res) => { setErr(null); setPlan({ groups: res.groups, items: res.items }); };
  const total = useMemo(() => (plan?.items || []).reduce((s, i) => s + i.amount, 0), [plan]);
  const sum = (st) => (plan?.items || []).filter((i) => i.status === st).reduce((s, i) => s + i.amount, 0);

  if (!plan) return <Card className="p-5 text-[15px]" style={{ color: "var(--color-neutral-700)" }}>{err || "Loading the planner…"}</Card>;

  if (plan.groups.length === 0) {
    return (
      <div className="space-y-4">
      <UploadPlan label={label} onApplied={apply} onError={setErr} />
      <Card className="p-5 space-y-3">
        <h2 className="text-lg font-bold">Plan what it costs</h2>
        <p className="text-[14px]" style={{ color: "var(--color-neutral-700)" }}>Pick what you are saving for and we will start a list of the costs that usually come with it. Change anything.</p>
        {err && <p className="text-[14px]" style={{ color: "#B42318" }}>{err}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {GOAL_KINDS.map((k) => (
            <button key={k.key} type="button" onClick={async () => { const r = await call({ action: "applyTemplate", label, kind: k.key }); r.error ? setErr(r.error) : apply(r); }}
              className="text-left rounded-2xl p-4" style={{ border: `2px solid ${kind === k.key ? PURPLE : "#E7DEFA"}`, background: "#FBF9FF" }}>
              <div className="font-bold text-[16px]">{k.label}</div>
              <div className="text-[13.5px] mt-1" style={{ color: "var(--color-neutral-700)" }}>{k.blurb}</div>
            </button>
          ))}
        </div>
      </Card>
      </div>
    );
  }

  const suggestions = (GROUP_SUGGESTIONS[kind] || GROUP_SUGGESTIONS.other).filter((s) => !plan.groups.some((g) => g.name.toLowerCase() === s.toLowerCase()));
  const addGroup = async (name) => {
    const r = await call({ action: "addGroup", label, name });
    if (r.error) return setErr(r.error);
    apply(r); setAddingGroup(false); setGroupName("");
  };

  return (
    <div className="space-y-4">
      <UploadPlan label={label} onApplied={apply} onError={setErr} />
      <Card className="p-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-2">
          <div><div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#4E22B8" }}>Plan total</div><div className="font-mono text-[28px] font-bold">{currency(total)}</div></div>
          <div><div className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>Paid</div><div className="font-mono text-[18px] font-bold">{currency(sum("paid"))}</div></div>
          <div><div className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>Booked</div><div className="font-mono text-[18px] font-bold">{currency(sum("booked"))}</div></div>
          <div><div className="text-[12px]" style={{ color: "var(--color-neutral-700)" }}>Still an idea</div><div className="font-mono text-[18px] font-bold">{currency(sum("idea"))}</div></div>
        </div>
        {total > 0 && Math.round(total) !== Math.round(target) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => onUseTotal(Math.round(total))} className="text-[14px] px-4 py-2">Use plan total as my goal</PrimaryButton>
            <span className="text-[13px]" style={{ color: "var(--color-neutral-700)" }}>Your goal is {currency(target)} now.</span>
          </div>
        )}
      </Card>
      {err && <p className="text-[14px]" style={{ color: "#B42318" }}>{err}</p>}

      {plan.groups.map((g) => {
        const items = plan.items.filter((i) => i.groupId === g.id);
        return (
          <Card key={g.id} className="p-5">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-[17px] font-bold">{g.name}</h3>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-[15px]">{currency(items.reduce((s, i) => s + i.amount, 0))}</span>
                <button type="button" aria-label={`Remove ${g.name}`} className="text-[12px] font-semibold" style={{ color: "#B42318" }}
                  onClick={async () => { if (items.length && typeof window.confirm === "function" && !window.confirm(`Remove ${g.name} and its ${items.length} item(s)?`)) return; const r = await call({ action: "deleteGroup", label, id: g.id }); r.error ? setErr(r.error) : apply(r); }}>
                  Remove
                </button>
              </div>
            </div>
            {items.map((it) => <ItemRow key={it.id} item={it} label={label} onChange={apply} onError={setErr} />)}
            <AddItem label={label} groupId={g.id} onChange={apply} onError={setErr} />
          </Card>
        );
      })}

      {addingGroup ? (
        <Card className="p-5 space-y-3">
          <h3 className="text-[17px] font-bold">Add a category</h3>
          <input autoFocus value={groupName} onChange={(e) => setGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && groupName.trim() && addGroup(groupName)}
            placeholder="Category name" className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-[15px]" />
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button key={s} type="button" onClick={() => addGroup(s)} className="rounded-full px-3 py-1 text-[13.5px] font-semibold" style={{ background: "#F1ECFB", color: "#4E22B8" }}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => groupName.trim() && addGroup(groupName)} className="text-[14px] px-4 py-2">Add category</PrimaryButton>
            <GhostButton onClick={() => { setAddingGroup(false); setGroupName(""); }} className="text-[14px] px-4 py-2">Cancel</GhostButton>
          </div>
        </Card>
      ) : (
        <button type="button" onClick={() => setAddingGroup(true)} className="w-full rounded-2xl py-3 text-[15px] font-bold" style={{ border: "2px dashed #CDB8FF", color: "#4E22B8", background: "transparent" }}>
          + Add category
        </button>
      )}
    </div>
  );
}
