"use client";

import { useMemo, useState } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import { QUIZ_QUESTIONS } from "@/lib/quizEngine";
import { OptionButton } from "@/components/quiz/QuizShared";
import QuizResultsView from "@/components/quiz/QuizResultsView";

export default function TaxSavingsQuizClient() {
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [results, setResults] = useState(null);

  const visibleQuestions = useMemo(
    () => QUIZ_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers]
  );

  const totalSteps = visibleQuestions.length + 1; // +1 for email capture step
  const currentQuestion = stepIndex < visibleQuestions.length ? visibleQuestions[stepIndex] : null;
  const onEmailStep = stepIndex === visibleQuestions.length;

  function selectSingle(question, value) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function toggleMulti(question, value) {
    setAnswers((prev) => {
      const current = prev[question.id] || [];
      let next;
      if (value === "none") {
        next = current.includes("none") ? [] : ["none"];
      } else if (current.includes(value)) {
        next = current.filter((v) => v !== value);
      } else {
        next = [...current.filter((v) => v !== "none"), value];
      }
      return { ...prev, [question.id]: next };
    });
  }

  function canAdvance() {
    if (!currentQuestion) return true;
    const val = answers[currentQuestion.id];
    if (currentQuestion.type === "single") return !!val;
    return Array.isArray(val) && val.length > 0;
  }

  function goNext() {
    if (!canAdvance()) return;
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
  }
  function goBack() {
    setSubmitError("");
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function submitQuiz() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setSubmitError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answers, website }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setResults(data);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  function startOver() {
    setAnswers({});
    setStepIndex(0);
    setEmail("");
    setResults(null);
    setSubmitError("");
  }

  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "48px clamp(18px, 4vw, 28px) 80px" }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
          Tax Savings Quiz
        </h1>
        <p className="text-sm" style={{ maxWidth: 580, color: "#574A68", margin: "0 0 32px" }}>
          Answer a few questions about your situation and get a personalized list of tax strategies worth researching. Free, no account needed. This points you toward things to look into, not specific financial advice.
        </p>

        {!results && (
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid #EFE7FA",
              borderRadius: 30,
              padding: 34,
              boxShadow: "0 24px 50px -34px rgba(52,26,102,0.3)",
            }}
          >
            {/* Redesigned progress: "Question N of M" + a filled track, instead of the old tiny gray caps label. M always reads from the live question count. */}
            {!onEmailStep && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#4E22B8", marginBottom: 10 }}>
                  Question {stepIndex + 1} of {visibleQuestions.length}
                </div>
                <div style={{ height: 8, borderRadius: 999, background: "#EFE7FA", overflow: "hidden" }}>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: "#6D3BE0",
                      width: `${((stepIndex + 1) / visibleQuestions.length) * 100}%`,
                      transition: "width 260ms ease",
                    }}
                  />
                </div>
              </div>
            )}
            {onEmailStep && (
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6D3BE0", marginBottom: 18 }}>
                Last step
              </div>
            )}

            {currentQuestion && (
              <div>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 30px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.025em", margin: "0 0 6px" }}>
                  {currentQuestion.prompt}
                </h2>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#6B5E7A", margin: "0 0 18px" }}>
                  {currentQuestion.type === "single" ? "Choose one" : "Select all that apply"}
                </p>
                {currentQuestion.options.map((opt) => {
                  const val = answers[currentQuestion.id];
                  const selected = currentQuestion.type === "single" ? val === opt.value : Array.isArray(val) && val.includes(opt.value);
                  return (
                    <OptionButton
                      key={opt.value}
                      selected={selected}
                      label={opt.label}
                      multi={currentQuestion.type !== "single"}
                      onClick={() =>
                        currentQuestion.type === "single"
                          ? selectSingle(currentQuestion, opt.value)
                          : toggleMulti(currentQuestion, opt.value)
                      }
                    />
                  );
                })}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                  <GhostButton onClick={goBack} disabled={stepIndex === 0}>Back</GhostButton>
                  <PrimaryButton onClick={goNext} disabled={!canAdvance()}>Next</PrimaryButton>
                </div>
              </div>
            )}

            {onEmailStep && (
              <div>
                <h2 style={{ fontSize: "clamp(24px, 3vw, 30px)", fontWeight: 800, lineHeight: 1.2, letterSpacing: "-0.025em", margin: "0 0 10px" }}>
                  Where should we send your results?
                </h2>
                <p className="text-sm" style={{ color: "#574A68", margin: "0 0 16px" }}>
                  We'll show your results here right away, and email you a copy.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    fontFamily: "var(--font-body)",
                    fontSize: 18,
                    color: "var(--color-text)",
                    background: "#FAF7FD",
                    border: "1px solid #E3D6FA",
                    borderRadius: 16,
                    padding: 17,
                    marginBottom: 8,
                  }}
                />
                {/* Honeypot: hidden from real users via off-screen positioning, not display:none (some bots skip display:none fields) */}
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                  aria-hidden="true"
                />
                {submitError && (
                  <p className="text-sm" style={{ color: "#b3452c", margin: "8px 0 0" }}>{submitError}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
                  <GhostButton onClick={goBack} disabled={submitting}>Back</GhostButton>
                  <PrimaryButton onClick={submitQuiz} disabled={submitting}>
                    {submitting ? "Finding your strategies..." : "Show my results"}
                  </PrimaryButton>
                </div>
              </div>
            )}
          </div>
        )}

        {results && (
          <QuizResultsView
            results={results}
            onStartOver={startOver}
            emptyStateNote="We didn't find a strong match based on your answers. Try the quiz again with different answers, or create a free PriorityPay account to set up automatic tax reserving."
            ctaSlot={
              <div style={{ background: "#3B1C7A", color: "#fff", borderRadius: 30, padding: "clamp(28px, 4vw, 40px)", textAlign: "center" }}>
                <h3 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                  Want to keep a copy, or automate the parts that involve moving money?
                </h3>
                <p className="text-sm" style={{ margin: "0 auto 22px", maxWidth: 480, fontSize: 16, lineHeight: 1.6, opacity: 0.85 }}>
                  A free PriorityPay account saves this report to your email and can automatically set aside money
                  for taxes, retirement, and savings from every deposit, on the percentages you choose.
                </p>
                <a
                  href="/signup"
                  style={{
                    display: "inline-flex",
                    textDecoration: "none",
                    background: "#fff",
                    color: "#3B1C7A",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: 16,
                    borderRadius: 999,
                    padding: "16px 30px",
                  }}
                >
                  Try PriorityPay free
                </a>
              </div>
            }
          />
        )}
      </div>
      <PublicFooter />
    </div>
  );
}
