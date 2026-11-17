"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, PrimaryButton, GhostButton, currency } from "@/components/ui";
import GoalCover from "@/components/GoalCover";
import GoalPlanner from "@/components/GoalPlanner";
import { GOAL_COVERS, guessCover, coverByKey, coverCredit } from "@/lib/goalCovers";

// Savings Goals. A goal is a category with a total goal amount (its cap), so
// the list below is built from the categories that have one. Open a goal for
// its picture, target, date and the payments that lowered it.
const PURPLE = "#6D3BE0";

function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const [y, m] = dateStr.slice(0, 10).split("-").map(Number);
  const now = new Date();
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}
function fmtDate(d) {
  if (!d) return null;
  const [y, m] = String(d).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function ProgressBar({ pct, color = PURPLE, h = 10 }) {
  return (
    <div style={{ height: h, borderRadius: 999, background: "#E7DEFA", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color, borderRadius: 999 }} />
    </div>
  );
}

function CoverPicker({ label, cover, photoUrl, onPick, onUpload, uploading }) {
  const fileRef = useRef(null);
  return (
    <div>
      <div className="text-[13px] font-bold mb-2" style={{ color: "#4E22B8" }}>Picture</div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {GOAL_COVERS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onPick(c.key)}
            className="text-left"
            style={{ outline: !photoUrl && (cover || guessCover(label)) === c.key ? `3px solid ${PURPLE}` : "none", borderRadius: 14 }}
            aria-label={c.label}
          >
            <GoalCover cover={c.key} height={54} radius={12} />
            <span className="block text-[11px] mt-1 text-center" style={{ color: "var(--color-neutral-700)" }}>{c.label}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <GhostButton onClick={() => fileRef.current?.click()} disabled={uploading} className="text-[14px] px-4 py-2">
          {uploading ? "Uploading…" : "Upload your own photo"}
        </GhostButton>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      </div>
    </div>
  );
}

function GoalsList({ goals, balances, categories, reload }) {
  const [adding, setAdding] = useState(false);
  const [cat, setCat] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [cover, setCover] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const goalLabels = new Set(goals.map((g) => g.label));
  const free = categories.filter((l) => !goalLabels.has(l));

  const save = async () => {
    setErr(null);
    if (!cat) return setErr("Pick a category.");
    if (!(Number(target) > 0)) return setErr("Enter a target amount.");
    setSaving(true);
    const res = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: cat, target: Number(target), goalDate: date || null, cover: cover || guessCover(cat) }),
    }).then((r) => r.json()).catch(() => ({ error: "Couldn't reach the server." }));
    setSaving(false);
    if (res.error) return setErr(res.error);
    setAdding(false); setCat(""); setTarget(""); setDate(""); setCover("");
    reload();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Savings Goals</h1>
          <p className="text-[15px] mt-1" style={{ color: "var(--color-neutral-700)" }}>The things you are saving for, in one place. Every deposit moves these bars.</p>
        </div>
        <PrimaryButton onClick={() => setAdding((v) => !v)} className="text-base px-4 py-2 shrink-0">+ Add a goal</PrimaryButton>
      </div>

      {adding && (
        <Card className="p-5 space-y-3">
          <p className="text-[15px]" style={{ color: "var(--color-neutral-700)" }}>
            A goal belongs to one of your categories, so saving for it works through your splits. Need a new category? Add it on Deposit Splits first.
          </p>
          {free.length === 0 ? (
            <p className="text-[15px]">Every category already has a goal.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="text-[14px] font-semibold">Category
                  <select value={cat} onChange={(e) => { setCat(e.target.value); setCover(guessCover(e.target.value)); }} className="block w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-base font-normal">
                    <option value="">Choose…</option>
                    {free.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className="text-[14px] font-semibold">Target amount
                  <input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} className="block w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-base font-mono font-normal" placeholder="$" />
                </label>
                <label className="text-[14px] font-semibold">Goal date (optional)
                  <input type="month" value={date ? date.slice(0, 7) : ""} onChange={(e) => setDate(e.target.value ? `${e.target.value}-01` : "")} className="block w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-base font-normal" />
                </label>
              </div>
              {err && <p className="text-[14px]" style={{ color: "#B42318" }}>{err}</p>}
              <div className="flex gap-2">
                <PrimaryButton onClick={save} disabled={saving} className="text-base px-4 py-2">{saving ? "Saving…" : "Save goal"}</PrimaryButton>
                <GhostButton onClick={() => setAdding(false)} className="text-base px-4 py-2">Cancel</GhostButton>
              </div>
            </>
          )}
        </Card>
      )}

      {goals.length === 0 && !adding && (
        <Card className="p-6 text-[15px]" style={{ color: "var(--color-neutral-700)" }}>
          No goals yet. Add one, or set a total goal on a category from Deposit Splits, and it appears here.
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {goals.map((g) => {
          const bal = Number(balances[g.label]) || 0;
          const pct = g.target > 0 ? Math.min(100, Math.round((bal / g.target) * 100)) : 0;
          const left = Math.max(0, g.target - bal);
          const months = monthsUntil(g.goalDate);
          const perMonth = months && left > 0 ? Math.ceil(left / months) : null;
          return (
            <Link key={g.label} href={`/goals?label=${encodeURIComponent(g.label)}`} className="block" style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ border: "2px solid #CDB8FF", borderRadius: 22, background: "#fff", overflow: "hidden" }}>
                <GoalCover label={g.label} cover={g.cover} photoUrl={g.photoUrl} height={140} radius={0} />
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-lg font-bold truncate">{g.label}</div>
                    {pct >= 100 && <span className="text-[12px] font-bold rounded-full px-2" style={{ background: "#E8F7F3", color: "#0F6B4F" }}>Reached</span>}
                  </div>
                  <div className="flex items-baseline gap-2 mt-2 mb-2">
                    <span className="font-mono" style={{ fontSize: 24, fontWeight: 700 }}>{currency(bal)}</span>
                    <span className="text-[14px]" style={{ color: "var(--color-neutral-700)" }}>of {currency(g.target)}</span>
                    <span className="ml-auto font-mono font-bold" style={{ color: "#4E22B8" }}>{pct}%</span>
                  </div>
                  <ProgressBar pct={pct} />
                  <div className="flex justify-between text-[13px] mt-2" style={{ color: "var(--color-neutral-700)" }}>
                    <span>{g.goalDate ? <>Goal date <b style={{ color: "var(--color-text)" }}>{fmtDate(g.goalDate)}</b></> : "No date set"}</span>
                    <span>{perMonth ? `${currency(perMonth)} a month` : ""}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function GoalDetail({ goal, balance, payments, reload }) {
  const [target, setTarget] = useState(String(goal.target));
  const [date, setDate] = useState(goal.goalDate ? String(goal.goalDate).slice(0, 7) : "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(null);

  const pct = goal.target > 0 ? Math.min(100, Math.round((balance / goal.target) * 100)) : 0;
  const months = monthsUntil(goal.goalDate);
  const left = Math.max(0, goal.target - balance);

  const put = async (body) => fetch("/api/goals", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: goal.label, ...body }) }).then((r) => r.json()).catch(() => ({ error: "Couldn't reach the server." }));

  const saveDetails = async () => {
    setSaving(true); setMsg(null);
    const res = await put({ target: Number(target), goalDate: date ? `${date}-01` : null });
    setSaving(false);
    setMsg(res.error || "Saved.");
    reload();
  };
  const pickCover = async (key) => { await put({ cover: key, photoPath: null }); reload(); };
  const upload = async (file) => {
    setUploading(true); setMsg(null);
    const fd = new FormData(); fd.append("file", file);
    const up = await fetch("/api/goals/photo", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ error: "Upload failed." }));
    if (up.error) { setUploading(false); setMsg(up.error); return; }
    const res = await put({ photoPath: up.path });
    setUploading(false);
    if (res.error) setMsg(res.error);
    reload();
  };
  const changePay = async (id, action) => {
    setBusy(id);
    await fetch("/api/goal-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    setBusy(null);
    reload();
  };
  const remove = async () => {
    if (!window.confirm?.("Remove this goal? Your category and its balance stay. Only the goal amount, date and picture are cleared.") && typeof window.confirm === "function") return;
    await put({ remove: true });
    window.location.href = "/goals";
  };

  return (
    <div className="space-y-5">
      <Link href="/goals" className="text-[14px] font-bold" style={{ color: "#4E22B8", textDecoration: "none" }}>‹ All goals</Link>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{goal.label}</h1>
        <Link href={`/withdrawals?category=${encodeURIComponent(goal.label)}`} className="text-[14px] font-bold" style={{ color: "#4E22B8" }}>Record a withdrawal →</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <GoalCover label={goal.label} cover={goal.cover} photoUrl={goal.photoUrl} height={200} radius={22} />
          {!goal.photoUrl && coverCredit(coverByKey(goal.cover || guessCover(goal.label))) && (() => {
            const cr = coverCredit(coverByKey(goal.cover || guessCover(goal.label)));
            return <div className="text-[12px] mt-1" style={{ color: "var(--color-neutral-700)" }}>Photo by <a href={cr.url} target="_blank" rel="noopener noreferrer" style={{ color: "#4E22B8", fontWeight: 600 }}>{cr.by}</a> on <a href="https://unsplash.com/?utm_source=prioritysave&utm_medium=referral" target="_blank" rel="noopener noreferrer" style={{ color: "#4E22B8", fontWeight: 600 }}>Unsplash</a></div>;
          })()}
        </div>
        <Card className="p-5">
          <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#4E22B8" }}>Progress</div>
          <div className="flex items-baseline gap-2 mt-1 mb-2">
            <span className="font-mono" style={{ fontSize: 32, fontWeight: 700 }}>{currency(balance)}</span>
            <span style={{ color: "var(--color-neutral-700)" }}>of {currency(goal.target)}</span>
          </div>
          <ProgressBar pct={pct} h={12} />
          <div className="flex justify-between text-[14px] mt-2" style={{ color: "var(--color-neutral-700)" }}>
            <span>{pct}% there</span>
            <span>{goal.goalDate ? <b style={{ color: "var(--color-text)" }}>{fmtDate(goal.goalDate)}</b> : "No date set"}</span>
          </div>
          {months && left > 0 && <div className="text-[13.5px] mt-2" style={{ color: "var(--color-neutral-700)" }}>About {currency(Math.ceil(left / months))} a month to get there.</div>}
        </Card>
      </div>

      <GoalPlanner
        label={goal.label}
        kind={goal.kind}
        target={goal.target}
        onUseTotal={async (t) => { setTarget(String(t)); await put({ target: t }); reload(); }}
      />

      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-bold">Goal details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[14px] font-semibold">Target amount
            <input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} className="block w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-base font-mono font-normal" />
          </label>
          <label className="text-[14px] font-semibold">Goal date
            <input type="month" value={date} onChange={(e) => setDate(e.target.value)} className="block w-full mt-1 border border-neutral-200 rounded-lg px-3 py-2 text-base font-normal" />
          </label>
        </div>
        <CoverPicker label={goal.label} cover={goal.cover} photoUrl={goal.photoUrl} onPick={pickCover} onUpload={upload} uploading={uploading} />
        {msg && <p className="text-[14px]" style={{ color: msg === "Saved." ? "#0F6B4F" : "#B42318" }}>{msg}</p>}
        <div className="flex gap-2 items-center">
          <PrimaryButton onClick={saveDetails} disabled={saving} className="text-base px-4 py-2">{saving ? "Saving…" : "Save"}</PrimaryButton>
          <button type="button" onClick={remove} className="text-[14px] font-semibold ml-auto" style={{ color: "#B42318" }}>Remove goal</button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold mb-1">Paid so far</h2>
        <p className="text-[14px] mb-3" style={{ color: "var(--color-neutral-700)" }}>When you pay for this goal from its own category and leave “This pays for the goal” on, the goal comes down by that amount. Each one can be undone.</p>
        {payments.length === 0 ? (
          <p className="text-[15px]" style={{ color: "var(--color-neutral-700)" }}>Nothing paid from this goal yet.</p>
        ) : (
          <div>
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-[15px]" style={{ borderTop: "1px solid var(--color-divider)" }}>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate" style={{ textDecoration: p.undone ? "line-through" : "none" }}>{p.description || "Payment"}</div>
                  <div className="text-[13px]" style={{ color: "var(--color-neutral-700)" }}>{p.date}{p.undone ? " · undone" : ""}</div>
                </div>
                <span className="font-mono">{currency(p.amount)}</span>
                <button type="button" disabled={busy === p.id} onClick={() => changePay(p.id, p.undone ? "redo" : "undo")} className="font-bold text-[14px] w-12 text-right" style={{ color: "#4E22B8" }}>{p.undone ? "Redo" : "Undo"}</button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function GoalsInner() {
  const params = useSearchParams();
  const label = params.get("label");
  const [goals, setGoals] = useState([]);
  const [balances, setBalances] = useState({});
  const [categories, setCategories] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [g, b, r, w] = await Promise.all([
      fetch("/api/goals").then((x) => x.json()).catch(() => ({})),
      fetch("/api/allocations/balances").then((x) => x.json()).catch(() => ({})),
      fetch("/api/split-rules").then((x) => x.json()).catch(() => ({})),
      fetch("/api/withdrawals").then((x) => x.json()).catch(() => ({})),
    ]);
    setGoals(g.goals || []);
    setBalances(b.balances || {});
    setCategories([...new Set((r.splitRules?.percent || []).map((x) => x.label))]);
    setWithdrawals(w.withdrawals || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const payments = useMemo(() => {
    if (!label) return [];
    const out = [];
    for (const w of withdrawals) for (const g of w.goalPayments || []) {
      if (g.label === label) out.push({ id: g.id, amount: g.amount, undone: g.undone, description: w.description, date: new Date(w.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) });
    }
    return out;
  }, [withdrawals, label]);

  if (loading) return <p className="text-base" style={{ color: "var(--color-neutral-700)" }}>Loading…</p>;
  if (label) {
    const goal = goals.find((g) => g.label === label);
    if (!goal) return <div className="space-y-3"><Link href="/goals" className="text-[14px] font-bold" style={{ color: "#4E22B8" }}>‹ All goals</Link><p>That goal couldn't be found.</p></div>;
    return <GoalDetail key={goal.label + goal.target + (goal.photoUrl || "")} goal={goal} balance={Number(balances[label]) || 0} payments={payments} reload={load} />;
  }
  return <GoalsList goals={goals} balances={balances} categories={categories} reload={load} />;
}

export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsInner />
    </Suspense>
  );
}
