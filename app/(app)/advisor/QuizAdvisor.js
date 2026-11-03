"use client";

// Tax Savings Quiz + chat. Quiz answers are the ONLY thing the chat knows
// about the person (no linked-account data). The "See what was sent" panel
// shows exactly what leaves the browser.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { QUIZ_QUESTIONS, questionView } from "@/lib/quizEngine";
import { OptionButton } from "@/components/quiz/QuizShared";
import { maskSensitive } from "@/lib/privacyFilter";

const KICKOFF = "Based on my quiz answers, what are my top tax savings options?";
// Suggested follow-ups that fit the person's own quiz answers.
function startersFor(answers) {
  const has = (id, v) => (Array.isArray(answers[id]) ? answers[id].includes(v) : answers[id] === v);
  const work = answers.work || [];
  const out = [];
  const add = (q) => { if (!out.includes(q)) out.push(q); };
  if (work.includes("retired") && !work.includes("self_employed") && !work.includes("business_owner")) {
    if (has("retiredIncome", "withdraws_pretax")) add("How much could I convert to a Roth each year without a big tax hit?");
    if (has("retiredIncome", "takes_social_security")) add("How much of my Social Security will be taxed?");
    if (has("retiredIncome", "rmd_age")) add("How are required minimum distributions calculated, and can I reduce them?");
    if (has("retiredIncome", "on_medicare")) add("Could my income raise my Medicare premiums?");
    if (has("retiredIncome", "leaving_to_heirs")) add("How are inherited IRAs taxed for my kids?");
    if (has("retiredIncome", "considering_move")) add("How do states tax retirement income?");
    add("Which accounts should I withdraw from first?");
    add("How can I use charitable giving to lower my taxes in retirement?");
  } else if (work.includes("business_owner")) {
    add("Which retirement plan makes sense for me and my employees?");
    if (has("employerSituation", "offers_health_insurance")) add("How does the small employer health insurance credit work?");
    if (has("employerSituation", "reimburses_expenses")) add("How does an accountable plan work?");
    add("Would an S-corp save me money?");
    if (has("business", "drives_for_business")) add("How do I deduct vehicle costs?");
  } else if (work.includes("self_employed")) {
    add("How much could I put into a Solo 401(k)?");
    if (has("business", "home_office")) add("What are the home office rules?");
    if (has("business", "drives_for_business")) add("How do I deduct vehicle costs?");
    if (has("estimatedTaxes", "annual_or_unsure")) add("How do quarterly estimated taxes work?");
    add("What can I deduct for meals and travel, and what receipts do I need?");
  } else if (work.includes("w2")) {
    add("How should I set my withholding so I don't owe in April?");
    add("How much can I put into my 401(k) this year?");
    if (has("workBenefits", "rsu_espp")) add("How are RSUs and my stock purchase plan taxed?");
    if (has("workBenefits", "fsa_available")) add("How much can I put into an FSA?");
    if (answers.hsaStatus === "has_hsa" || answers.hsaStatus === "hdhp_no_hsa") add("How much can I put into an HSA?");
  }
  add("What should I do before year end to lower my taxes?");
  return out.slice(0, 3);
}

function answerLines(answers) {
  return QUIZ_QUESTIONS.map((q0) => {
    const q = questionView(q0, answers);
    const v = answers[q.id];
    if (!v || (Array.isArray(v) && !v.length)) return null;
    const labels = (Array.isArray(v) ? v : [v]).map((x) => q.options.find((o) => o.value === x)?.label).filter(Boolean);
    return { q: q.prompt.replace(/ Select all that apply\.?/, ""), a: labels.join("; ") };
  }).filter(Boolean);
}


const NUM_FIELDS = {
  netProfit: "Net profit from your business this year (so far or expected)",
  wages: "Your W-2 pay this year (before taxes)",
  contributed: "Retirement contributions you have made so far this year",
  employees: "Number of employees (not counting you)",
  payroll: "Total yearly pay for those employees",
  ownerPay: "What you pay yourself in W-2 salary (leave blank if none)",
};
function cleanNums(n) {
  const out = {};
  for (const k of Object.keys(NUM_FIELDS)) {
    const v = Number(String(n?.[k] ?? "").replace(/[^0-9.]/g, ""));
    if (Number.isFinite(v) && v > 0) out[k] = Math.round(v);
  }
  return out;
}
const money = (v) => "$" + Number(v).toLocaleString("en-US");

function NumberInput({ label, value, onChange, prefix = "$" }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ display: "block", fontSize: 13, marginBottom: 4 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {prefix && <span style={{ opacity: 0.6 }}>{prefix}</span>}
        <input inputMode="numeric" value={value || ""} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
          className="border border-[var(--color-divider)] rounded-lg px-3 py-2 text-sm" style={{ flex: 1, minWidth: 0 }} />
      </span>
    </label>
  );
}

function NumbersStep({ answers, nums, setNums, onSkip, onContinue, onBack }) {
  const work = answers.work || [];
  const biz = work.includes("self_employed") || work.includes("business_owner");
  const w2 = work.includes("w2");
  const owner = work.includes("business_owner");
  const [calc, setCalc] = useState(false);
  const [rev, setRev] = useState("");
  const [exp, setExp] = useState("");
  const [pull, setPull] = useState({ state: "idle" });
  async function pullFromPrioritySave() {
    setPull({ state: "loading" });
    try {
      const res = await fetch("/api/business-financials");
      const d = await res.json();
      const f = d.financials;
      if (!res.ok || !f || !f.grossReceipts) { setPull({ state: "none" }); return; }
      const { taxYear, updatedAt, grossReceipts, ...rest } = f;
      const expenses = Object.values(rest).reduce((a, v) => a + (Number(v) || 0), 0);
      setRev(String(Math.round(grossReceipts)));
      setExp(String(Math.round(expenses)));
      setNums((p) => ({ ...p, netProfit: String(Math.max(0, Math.round(grossReceipts - expenses))) }));
      setPull({ state: "ok", updatedAt, taxYear });
    } catch { setPull({ state: "none" }); }
  }
  const net = Math.max(0, (Number(String(rev).replace(/,/g, "")) || 0) - (Number(String(exp).replace(/,/g, "")) || 0));
  const set = (k) => (v) => setNums((p) => ({ ...p, [k]: v }));
  return (
    <Card style={{ padding: "clamp(20px, 4vw, 32px)" }}>
      <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>Optional last step</div>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, margin: "0 0 8px" }}>Want to see your own numbers instead of examples?</h2>
      <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "var(--color-neutral-700)" }}>
        Rough numbers are fine. The chat will use them to show estimates for you instead of &quot;say you earn...&quot; examples. They are only sent with your chat messages, never saved, and you can skip this.
      </p>
      {biz && (
        <div>
          <div className="p-3 rounded-lg mb-3" style={{ background: "#EDE6FF" }}>
            <p className="text-xs" style={{ margin: "0 0 8px" }}>
              Already tracking your business in PrioritySave? We can fill this in from the business numbers you entered there. They only help if they are up to date for this year, so check them below before continuing.
            </p>
            <button type="button" className="text-xs underline" onClick={pullFromPrioritySave} disabled={pull.state === "loading"}>
              {pull.state === "loading" ? "Looking..." : "Use my PrioritySave numbers"}
            </button>
            {pull.state === "ok" && (
              <p className="text-xs" style={{ margin: "8px 0 0" }}>
                Filled in from your {pull.taxYear} business numbers, last updated {pull.updatedAt ? new Date(pull.updatedAt).toLocaleDateString() : "unknown"}. If that is out of date, update them in PrioritySave or edit the number below. Revenue was {money(Number(rev))} and expenses {money(Number(exp))}.
              </p>
            )}
            {pull.state === "none" && <p className="text-xs" style={{ margin: "8px 0 0" }}>We did not find business numbers for this year. Enter them below instead.</p>}
          </div>
          <NumberInput label={NUM_FIELDS.netProfit} value={nums.netProfit} onChange={set("netProfit")} />
          <button type="button" className="underline text-xs" style={{ marginBottom: 12 }} onClick={() => setCalc((c) => !c)}>
            {calc ? "Hide the calculator" : "Not sure? Help me calculate it"}
          </button>
          {calc && (
            <div className="p-3 rounded-lg mb-3" style={{ background: "var(--color-neutral-200)" }}>
              <p className="text-xs" style={{ margin: "0 0 10px" }}>Net profit is what your business brought in minus what it spent, before income taxes and before any retirement contributions you make for yourself. Your profit and loss report or Schedule C has both numbers.</p>
              <NumberInput label="Total business income (revenue) for the year" value={rev} onChange={setRev} />
              <NumberInput label="Total business expenses for the year" value={exp} onChange={setExp} />
              <p className="text-sm" style={{ margin: "0 0 8px" }}>Estimated net profit: <strong>{money(net)}</strong></p>
              <button type="button" className="text-xs underline" disabled={!net} onClick={() => { setNums((p) => ({ ...p, netProfit: String(net) })); setCalc(false); }}>Use this number</button>
            </div>
          )}
        </div>
      )}
      {w2 && <NumberInput label={NUM_FIELDS.wages} value={nums.wages} onChange={set("wages")} />}
      {owner && (
        <div>
          <NumberInput label={NUM_FIELDS.employees} value={nums.employees} onChange={set("employees")} prefix="" />
          <NumberInput label={NUM_FIELDS.payroll} value={nums.payroll} onChange={set("payroll")} />
          <NumberInput label={NUM_FIELDS.ownerPay} value={nums.ownerPay} onChange={set("ownerPay")} />
        </div>
      )}
      <NumberInput label={NUM_FIELDS.contributed} value={nums.contributed} onChange={set("contributed")} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22, gap: 8, flexWrap: "wrap" }}>
        <GhostButton onClick={onBack}>Back</GhostButton>
        <div style={{ display: "flex", gap: 8 }}>
          <GhostButton onClick={onSkip}>Skip</GhostButton>
          <PrimaryButton onClick={onContinue}>See my options</PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

export default function QuizAdvisor() {
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [numStage, setNumStage] = useState(false);
  const [nums, setNums] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [waited, setWaited] = useState(0);
  useEffect(() => {
    if (!sending) { setWaited(0); return; }
    const t = setInterval(() => setWaited((w) => w + 1), 1000);
    return () => clearInterval(t);
  }, [sending]);
  const waitingText = waited < 6 ? "Reading your quiz answers..." : waited < 18 ? "Checking the current IRS numbers..." : waited < 40 ? "Writing your options. This can take up to a minute the first time." : "Still working, almost there...";
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [offer, setOffer] = useState(null); // { reply, priceCents, limitsCents, limitReached, text, hidden }
  const [extra, setExtra] = useState(null); // { count, spentCents, limitCents }
  const [optingIn, setOptingIn] = useState(false);
  const [showSent, setShowSent] = useState(false);
  const endRef = useRef(null);
  const started = useRef(false);


  const visible = useMemo(() => QUIZ_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)).map((q) => questionView(q, answers)), [answers]);
  const current = stepIndex < visible.length ? visible[stepIndex] : null;

  function selectSingle(q, value) {
    setAnswers((p) => ({ ...p, [q.id]: value }));
  }
  function toggleMulti(q, value) {
    setAnswers((p) => {
      const cur = p[q.id] || [];
      const next = value === "none" ? (cur.includes("none") ? [] : ["none"])
        : cur.includes(value) ? cur.filter((v) => v !== value) : [...cur.filter((v) => v !== "none"), value];
      return { ...p, [q.id]: next };
    });
  }
  function canAdvance() {
    if (!current) return true;
    const v = answers[current.id];
    return current.type === "single" ? !!v : Array.isArray(v) && v.length > 0;
  }
  function goNext() {
    if (!canAdvance()) return;
    if (stepIndex + 1 >= visible.length) setNumStage(true);
    else setStepIndex((i) => i + 1);
  }
  function startOver() {
    setOffer(null); setExtra(null); setAnswers({}); setNums({}); setNumStage(false); setStepIndex(0); setDone(false); setMessages([]); setError(""); started.current = false;
  }

  async function send(text, hidden = false) {
    const content = (text ?? input).trim();
    if (!content || sending || moreLoading) return;
    const shown = maskSensitive(content).text;
    const next = [...messages, { role: "user", content: shown, hidden }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError("");
    try {
      const isKickoff = hidden && content === KICKOFF && messages.length === 0;
      const post = (phase) =>
        fetch("/api/advisor/quiz-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers, numbers: cleanNums(nums), phase, messages: next.map(({ role, content }) => ({ role, content })) }),
        });
      // First reply: ask for the main list and the extra ideas at the same time,
      // show the main list as soon as it is ready, and add the rest when it lands.
      const morePromise = isKickoff ? post("extras").then((r) => r.json().then((d) => ({ ok: r.ok, d }))).catch(() => null) : null;
      const res = await post(isKickoff ? "main" : undefined);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      if (data.overageOffer) {
        // Over the included messages: show the pay-as-you-go choice and keep this question to resend.
        setMessages(messages);
        setOffer({ ...data.overageOffer, reply: data.reply, text: content, hidden });
        setRemaining(0);
        setSending(false);
        return;
      }
      setOffer(null);
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.overage) setExtra(data.overage);
      if (data.usage) setRemaining(data.usage.remaining);
      if (morePromise) {
        setMoreLoading(true);
        setSending(false);
        const more = await morePromise;
        const tail = more?.ok && more.d?.reply
          ? more.d.reply
          : "These are suggestions to bring to your CPA, not tax or legal advice. What would you like to dig into?";
        setMessages((cur) => {
          const out = cur.slice();
          const last = out.length - 1;
          if (last >= 0 && out[last].role === "assistant") out[last] = { ...out[last], content: out[last].content + "\n\n" + tail };
          return out;
        });
        setMoreLoading(false);
      }
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    }
    setSending(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  async function chooseLimit(limitCents) {
    setOptingIn(true);
    setError("");
    try {
      const res = await fetch("/api/advisor/overage", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limitCents }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Could not save that.");
      const o = offer;
      setOffer(null);
      setOptingIn(false);
      if (o) await send(o.text, o.hidden);
    } catch (e) {
      setError(e.message || "Could not save that.");
      setOptingIn(false);
    }
  }

  useEffect(() => {
    if (done && !started.current) {
      started.current = true;
      send(KICKOFF, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const lines = answerLines(answers);
  const numLines = Object.entries(cleanNums(nums)).map(([k, v]) => ({ q: NUM_FIELDS[k] + ":", a: k === "employees" ? String(v) : money(v) }));
  lines.push(...numLines);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "0 0 8px" }}>Tax Savings Quiz</h1>
        <p style={{ margin: 0, color: "var(--color-neutral-700)", fontSize: 15, lineHeight: 1.5 }}>
          Answer a few questions and get your top tax savings options to look into, then ask follow-up questions in the chat. This is a guide to
          bring to your CPA, not tax or legal advice.
        </p>
      </div>

      <div className="text-xs mb-5 p-3 rounded-lg" style={{ background: "var(--color-neutral-200)", color: "var(--color-neutral-700)" }}>
        <p style={{ margin: 0 }}>
          <strong>Your tax savings chat</strong>{" "}
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#EDE6FF", color: "#3B1C7A" }}>Beta</span>
          <br />
          The chat only knows your quiz answers. It cannot see your accounts or transactions, and your messages aren&apos;t saved.{" "}
          <button type="button" className="underline" onClick={() => setShowSent((s) => !s)}>See what was sent</button>{" · "}
          <Link href="/security" className="underline">How we protect your data</Link>
        </p>
        {showSent && (
          <div className="mt-3">
            <p className="font-semibold mb-1">Sent to the AI with each message:</p>
            <ul style={{ paddingLeft: 16, listStyle: "disc", margin: "0 0 8px" }}>
              {lines.length ? lines.map((l, i) => <li key={i}>{l.q} {l.a}</li>) : <li>Your quiz answers so far (none yet)</li>}
            </ul>
            <p className="mb-1">Your latest chat message, after phone numbers, emails, SSNs and card or account numbers are masked:</p>
            <p style={{ fontStyle: "italic", margin: "0 0 8px" }}>{lastUser ? lastUser.content : "(nothing yet)"}</p>
            <p style={{ margin: 0 }}>Nothing else: no name, email, bank, or transaction data. To check current-year limits, the AI may also search official IRS and government sites using only your tax question.</p>
          </div>
        )}
      </div>

      {!done && numStage && (
        <NumbersStep answers={answers} nums={nums} setNums={setNums} onBack={() => setNumStage(false)}
          onSkip={() => { setNums({}); setNumStage(false); setDone(true); }} onContinue={() => { setNumStage(false); setDone(true); }} />
      )}

      {!done && !numStage && (
        <Card style={{ padding: "clamp(20px, 4vw, 32px)" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>
            Question {stepIndex + 1} of {visible.length}
          </div>
          {current && (
            <div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, margin: "0 0 16px" }}>{current.prompt}</h2>
              <p style={{ margin: "-6px 0 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#6B4FD8" }}>
                {current.type === "multi" ? "Choose all that apply" : "Choose one"}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {current.options.map((o) => {
                  const v = answers[current.id];
                  const selected = current.type === "single" ? v === o.value : Array.isArray(v) && v.includes(o.value);
                  return (
                    <OptionButton key={o.value} selected={selected} multi={current.type === "multi"} label={o.label}
                      onClick={() => (current.type === "single" ? selectSingle(current, o.value) : toggleMulti(current, o.value))} />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                <GhostButton onClick={() => setStepIndex((i) => Math.max(i - 1, 0))} disabled={stepIndex === 0}>Back</GhostButton>
                <PrimaryButton onClick={goNext} disabled={!canAdvance()}>
                  {stepIndex + 1 >= visible.length ? "See my options" : "Next"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </Card>
      )}

      {done && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold">Your tax savings chat</h2>
          </div>
          <div className="space-y-3">
            {messages.filter((m) => !m.hidden).map((m, i) => (
              <div key={i} className="text-sm px-3 py-2 rounded-xl"
                style={{ whiteSpace: "pre-wrap", background: m.role === "user" ? "#EDE6FF" : "var(--color-neutral-200)",
                  marginLeft: m.role === "user" ? "auto" : 0, maxWidth: "92%", width: "fit-content" }}>
                {m.content}
              </div>
            ))}
            {sending && (
              <div role="status" aria-live="polite" className="mt-2">
                <style>{`@keyframes psdot{0%,80%,100%{opacity:.25;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}@keyframes psbar{0%{left:-35%}100%{left:100%}}`}</style>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--color-neutral-700)" }}>
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: 999, background: "#6B4FD8", animation: `psdot 1.2s ${i * 0.2}s infinite ease-in-out` }} />
                    ))}
                  </span>
                  <span>{waitingText}</span>
                </div>
                <div style={{ position: "relative", height: 3, marginTop: 8, borderRadius: 999, background: "rgba(107,79,216,.15)", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, height: "100%", width: "35%", borderRadius: 999, background: "#6B4FD8", animation: "psbar 1.4s infinite ease-in-out" }} />
                </div>
              </div>
            )}
            {moreLoading && (
              <p role="status" aria-live="polite" className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
                Checking for more ideas a CPA might raise for your situation...
              </p>
            )}
            {error && <p className="text-xs" style={{ color: "#9C3B22" }}>{error}</p>}
            {offer && !sending && (
              <div className="p-3 rounded-lg text-sm" style={{ background: "#EDE6FF" }}>
                <p style={{ margin: "0 0 8px" }}>{offer.reply}</p>
                <p className="text-xs" style={{ margin: "0 0 10px" }}>
                  Extra messages are ${(offer.priceCents / 100).toFixed(2)} each and appear on your next PrioritySave invoice. Pick a monthly spending limit. We stop when you reach it, and you can change it anytime.
                </p>
                <div className="flex flex-wrap gap-2">
                  {offer.limitsCents.map((c) => (
                    <button key={c} type="button" disabled={optingIn} onClick={() => chooseLimit(c)}
                      className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-divider)] bg-white hover:bg-[var(--color-neutral-200)]">
                      Up to ${c / 100} a month ({Math.floor(c / offer.priceCents)} messages)
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {messages.length > 1 && messages.length < 4 && !sending && (
            <div className="flex flex-wrap gap-2 mt-4">
              {startersFor(answers).map((q) => (
                <button key={q} type="button" onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-divider)] hover:bg-[var(--color-neutral-200)]">{q}</button>
              ))}
            </div>
          )}

          <form className="flex items-center gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…"
              className="flex-1 border border-[var(--color-divider)] rounded-lg px-3 py-2 text-sm" style={{ minWidth: 0 }} />
            <PrimaryButton type="submit" disabled={sending || moreLoading || !input.trim()} className="text-xs px-4 py-2">Send</PrimaryButton>
          </form>
          <div className="flex justify-between mt-2">
            <p className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
              {extra ? `Extra messages this month: ${extra.count} ($${(extra.spentCents / 100).toFixed(2)} of your $${extra.limitCents / 100} limit)` : remaining !== null ? `${remaining} messages left this month` : ""}
            </p>
            <button type="button" className="text-[11px] underline" onClick={startOver}>Retake the quiz</button>
          </div>
        </Card>
      )}
    </div>
  );
}
