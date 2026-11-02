"use client";

// Tax Savings Quiz is "coming soon" in the app while the chat is reworked:
// the plan is a short quiz, then the chat itself suggests a few top tax
// savings options to look into (no more If / You could / The benefit
// cards), and the person can keep asking questions. The previous working
// version lives on in ./AdvisorLive.js (not routed) and the API route
// /api/advisor/chat is unchanged, so turning it back on later is just
// re-exporting that component from this page.

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";

const QUESTIONS = [
  {
    n: 1,
    prompt: "Which of these describes your work?",
    options: ["Self-employed / freelance / sole proprietor", "I own a business with an LLC, S-corp, or C-corp", "I have a W-2 job"],
    pick: 0,
  },
  {
    n: 2,
    prompt: "What's your approximate annual household income before taxes?",
    options: ["Under $75,000", "$75,000 - $150,000", "$150,000 - $250,000"],
    pick: 1,
  },
  {
    n: 3,
    prompt: "Do you currently save into a retirement account?",
    options: ["Yes, through an employer plan", "Yes, an IRA or self-directed plan", "Not yet"],
    pick: 2,
  },
];

const USER_MESSAGE = "What are the top things I should look into to save on taxes?";

const REPLY = [
  "Based on your answers, here are a few of the best places to start:",
  "",
  "1. A Solo 401(k). Retirement contributions can lower your taxable income, and self-employed people often have more room than they expect.",
  "2. The qualified business income (QBI) deduction. It can reduce the tax on part of your self-employment income.",
  "3. Business expenses you may be missing, like a home office, software, and mileage.",
  "",
  "Want me to explain any of these in more detail?",
].join("\n");

const STEPS = [
  { title: "Answer a few questions", body: "About your work, income and savings, so the suggestions fit your situation." },
  { title: "Get your top options", body: "The chat lists the first tax-saving ideas worth researching, based on your answers." },
  { title: "Ask anything else", body: "Follow up in plain language and dig into the ones that matter to you." },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function Demo() {
  // scene: 0..QUESTIONS.length-1 are quiz questions, QUESTIONS.length is the chat
  const [scene, setScene] = useState(0);
  const [picked, setPicked] = useState(false);
  const [userShown, setUserShown] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const reduce =
      typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setScene(QUESTIONS.length);
      setUserShown(true);
      setTyped(REPLY.length);
      return undefined;
    }
    (async () => {
      while (!cancelled) {
        for (let i = 0; i < QUESTIONS.length && !cancelled; i++) {
          setScene(i);
          setPicked(false);
          setUserShown(false);
          setThinking(false);
          setTyped(0);
          await sleep(1500);
          if (cancelled) return;
          setPicked(true);
          await sleep(1100);
        }
        if (cancelled) return;
        setScene(QUESTIONS.length);
        setPicked(false);
        setUserShown(false);
        setThinking(false);
        setTyped(0);
        await sleep(700);
        if (cancelled) return;
        setUserShown(true);
        await sleep(900);
        if (cancelled) return;
        setThinking(true);
        await sleep(1300);
        if (cancelled) return;
        setThinking(false);
        for (let c = 1; c <= REPLY.length && !cancelled; c++) {
          setTyped(c);
          await sleep(16);
        }
        await sleep(4500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const inChat = scene === QUESTIONS.length;
  const q = !inChat ? QUESTIONS[scene] : null;
  const activeStep = inChat ? (typed > 0 ? 2 : 1) : 0;

  return (
    <div aria-hidden="true">
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {STEPS.map((s, i) => (
          <span
            key={s.title}
            style={{
              fontSize: 12,
              letterSpacing: "0.04em",
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--color-divider)",
              background: i === activeStep ? "var(--color-accent)" : "transparent",
              color: i === activeStep ? "#fff" : "color-mix(in srgb, var(--color-text) 60%, transparent)",
              transition: "background .3s, color .3s",
            }}
          >
            {i + 1}. {["Quiz", "Top options", "Ask more"][i]}
          </span>
        ))}
      </div>

      <div
        style={{
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-md)",
          background: "var(--color-neutral-100)",
          padding: "clamp(16px, 3vw, 24px)",
          minHeight: 400,
        }}
      >
        {q && (
          <div key={scene} style={{ animation: "ps-soon-in .35s ease" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 14 }}>
              Question {q.n} of 10
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 20, margin: "0 0 14px", lineHeight: 1.25 }}>{q.prompt}</div>
            {q.options.map((opt, i) => {
              const sel = picked && i === q.pick;
              return (
                <div
                  key={opt}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    marginBottom: 10,
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-divider)"}`,
                    background: sel ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "var(--color-surface, #fff)",
                    fontSize: 14.5,
                    transition: "border-color .25s, background .25s",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      flexShrink: 0,
                      borderRadius: "50%",
                      border: `2px solid ${sel ? "var(--color-accent)" : "var(--color-divider)"}`,
                      background: sel ? "var(--color-accent)" : "transparent",
                      transition: "all .25s",
                    }}
                  />
                  {opt}
                </div>
              );
            })}
          </div>
        )}

        {inChat && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {userShown && (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 16,
                  background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
                  fontSize: 14,
                  animation: "ps-soon-in .3s ease",
                }}
              >
                {USER_MESSAGE}
              </div>
            )}
            {thinking && (
              <div style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>Thinking...</div>
            )}
            {typed > 0 && (
              <div
                style={{
                  alignSelf: "flex-start",
                  maxWidth: "92%",
                  padding: "12px 16px",
                  borderRadius: 16,
                  background: "var(--color-surface, #fff)",
                  border: "1px solid var(--color-divider)",
                  fontSize: 14,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {REPLY.slice(0, typed)}
              </div>
            )}
          </div>
        )}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 12, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
        Example only. The real assistant tailors its suggestions to your quiz answers.
      </p>
      <style>{`@keyframes ps-soon-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

export default function AdvisorPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: 0 }}>Tax Savings Quiz</h1>
          <span
            style={{
              fontSize: 11.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 999,
              background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
              color: "var(--color-accent-700, var(--color-accent))",
            }}
          >
            Coming soon
          </span>
        </div>
        <p style={{ margin: 0, color: "var(--color-neutral-700)", fontSize: 15, lineHeight: 1.55 }}>
          We&apos;re building a quiz that learns about your situation, then a chat that tells you the top options
          worth researching to lower your taxes, and lets you ask follow-up questions. Here&apos;s a preview of how
          it will work.
        </p>
      </div>

      <Card style={{ padding: "clamp(16px, 4vw, 28px)", marginBottom: 20 }}>
        <Demo />
      </Card>

      <Card style={{ padding: "clamp(16px, 4vw, 28px)" }}>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 16 }}>
          {STEPS.map((s, i) => (
            <li key={s.title} style={{ display: "flex", gap: 14 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: "1px solid var(--color-accent)",
                  color: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                }}
              >
                {i + 1}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-heading)", fontSize: 16 }}>{s.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.5, color: "color-mix(in srgb, var(--color-text) 70%, transparent)" }}>{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
        <p style={{ margin: "18px 0 0", fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
          General educational information, not tax, legal, or financial advice. Confirm anything with a CPA or
          attorney licensed in your state.
        </p>
      </Card>
    </div>
  );
}
