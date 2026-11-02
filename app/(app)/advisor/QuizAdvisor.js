"use client";

// Tax Savings Quiz + chat. Quiz answers are the ONLY thing the chat knows
// about the person (no linked-account data). The "See what was sent" panel
// shows exactly what leaves the browser.
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { QUIZ_QUESTIONS } from "@/lib/quizEngine";
import { OptionButton } from "@/components/quiz/QuizShared";
import { maskSensitive } from "@/lib/privacyFilter";
import { isW2NoSideHustle } from "@/lib/allocations";

const KICKOFF = "Based on my quiz answers, what are my top tax savings options?";
const STARTERS = [
  "How much could I put into a Solo 401(k)?",
  "What are the home office rules?",
  "What can I deduct for meals and travel, and what receipts do I need?",
];

function answerLines(answers) {
  return QUIZ_QUESTIONS.map((q) => {
    const v = answers[q.id];
    if (!v || (Array.isArray(v) && !v.length)) return null;
    const labels = (Array.isArray(v) ? v : [v]).map((x) => q.options.find((o) => o.value === x)?.label).filter(Boolean);
    return { q: q.prompt.replace(/ Select all that apply\.?/, ""), a: labels.join("; ") };
  }).filter(Boolean);
}

export default function QuizAdvisor() {
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(null);
  const [showSent, setShowSent] = useState(false);
  const endRef = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => setBlocked(isW2NoSideHustle(d.profile?.persona))).catch(() => {});
  }, []);

  const visible = useMemo(() => QUIZ_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)), [answers]);
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
    if (stepIndex + 1 >= visible.length) setDone(true);
    else setStepIndex((i) => i + 1);
  }
  function startOver() {
    setAnswers({}); setStepIndex(0); setDone(false); setMessages([]); setError(""); started.current = false;
  }

  async function send(text, hidden = false) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const shown = maskSensitive(content).text;
    const next = [...messages, { role: "user", content: shown, hidden }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/advisor/quiz-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.usage) setRemaining(data.usage.remaining);
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    }
    setSending(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  useEffect(() => {
    if (done && !started.current) {
      started.current = true;
      send(KICKOFF, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  if (blocked) {
    return (
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Card className="p-6 text-sm">
          The Tax Savings Quiz is built around self-employment and business tax strategies, so it isn&apos;t relevant for a W2-only income setup.
        </Card>
      </div>
    );
  }

  const lines = answerLines(answers);
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

      {!done && (
        <Card style={{ padding: "clamp(20px, 4vw, 32px)" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.6, marginBottom: 18 }}>
            Question {stepIndex + 1} of {visible.length}
          </div>
          {current && (
            <div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, margin: "0 0 16px" }}>{current.prompt}</h2>
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
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ background: "#EDE6FF", color: "#3B1C7A" }}>Beta</span>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--color-neutral-700)" }}>
            The chat only knows your quiz answers. It cannot see your accounts or transactions, and your messages aren&apos;t saved.{" "}
            <button type="button" className="underline" onClick={() => setShowSent((s) => !s)}>See what was sent</button>{" · "}
            <Link href="/security" className="underline">How we protect your data</Link>
          </p>

          {showSent && (
            <div className="text-xs mb-4 p-3 rounded-lg" style={{ background: "var(--color-neutral-200)" }}>
              <p className="font-semibold mb-1">Sent to the AI with each message:</p>
              <ul style={{ paddingLeft: 16, listStyle: "disc", margin: "0 0 8px" }}>
                {lines.map((l, i) => <li key={i}>{l.q} {l.a}</li>)}
              </ul>
              <p className="mb-1">Your latest message, after phone numbers, emails, SSNs and card or account numbers are masked:</p>
              <p style={{ fontStyle: "italic", margin: "0 0 8px" }}>{lastUser ? lastUser.content : "(nothing yet)"}</p>
              <p style={{ margin: 0 }}>Nothing else: no name, email, bank, or transaction data. To check current-year limits, the AI may also search official IRS and government sites using only your tax question.</p>
            </div>
          )}

          <div className="space-y-3">
            {messages.filter((m) => !m.hidden).map((m, i) => (
              <div key={i} className="text-sm px-3 py-2 rounded-xl"
                style={{ whiteSpace: "pre-wrap", background: m.role === "user" ? "#EDE6FF" : "var(--color-neutral-200)",
                  marginLeft: m.role === "user" ? "auto" : 0, maxWidth: "92%", width: "fit-content" }}>
                {m.content}
              </div>
            ))}
            {sending && <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Thinking…</p>}
            {error && <p className="text-xs" style={{ color: "#9C3B22" }}>{error}</p>}
            <div ref={endRef} />
          </div>

          {messages.length > 1 && messages.length < 4 && !sending && (
            <div className="flex flex-wrap gap-2 mt-4">
              {STARTERS.map((q) => (
                <button key={q} type="button" onClick={() => send(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-divider)] hover:bg-[var(--color-neutral-200)]">{q}</button>
              ))}
            </div>
          )}

          <form className="flex items-center gap-2 mt-4" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a question…"
              className="flex-1 border border-[var(--color-divider)] rounded-lg px-3 py-2 text-sm" style={{ minWidth: 0 }} />
            <PrimaryButton type="submit" disabled={sending || !input.trim()} className="text-xs px-4 py-2">Send</PrimaryButton>
          </form>
          <div className="flex justify-between mt-2">
            <p className="text-[11px]" style={{ color: "var(--color-neutral-700)" }}>
              {remaining !== null ? `${remaining} messages left this month` : ""}
            </p>
            <button type="button" className="text-[11px] underline" onClick={startOver}>Retake the quiz</button>
          </div>
        </Card>
      )}
    </div>
  );
}
