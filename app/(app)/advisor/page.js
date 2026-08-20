"use client";

// Was the "Tax Strategy Assistant" chat UI (see git history / lib/advisorPrompt.js
// and app/api/advisor/chat/route.js, both left in place but unused). Megan
// didn't find the chat useful and asked to replace it with the same Tax
// Savings Quiz used on the public marketing site (prioritypay.co/tax-savings-quiz),
// reusing lib/quizEngine.js and the shared components in components/quiz/
// so this can't drift from the public version.
//
// Differences from the public quiz, since the visitor here is already a
// logged-in account holder:
//   - No email-capture step -- we already have their email.
//   - Answers are matched client-side via matchStrategies() directly,
//     not posted to /api/quiz/submit -- that route's rate-limiting,
//     honeypot, and simple_quiz_leads insert exist specifically to guard
//     an anonymous public surface and don't apply to an authenticated user.
//   - No "try PriorityPay free" closing CTA, since they're already a
//     customer.

import { useMemo, useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { QUIZ_QUESTIONS, matchStrategies } from "@/lib/quizEngine";
import { OptionButton } from "@/components/quiz/QuizShared";
import QuizResultsView from "@/components/quiz/QuizResultsView";

export default function AdvisorPage() {
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [results, setResults] = useState(null);

  const visibleQuestions = useMemo(
    () => QUIZ_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers]
  );

  const currentQuestion = stepIndex < visibleQuestions.length ? visibleQuestions[stepIndex] : null;

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
    if (stepIndex + 1 >= visibleQuestions.length) {
      setResults(matchStrategies(answers));
    } else {
      setStepIndex((i) => i + 1);
    }
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function startOver() {
    setAnswers({});
    setStepIndex(0);
    setResults(null);
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "0 0 8px" }}>Tax Savings Quiz</h1>
        <p style={{ margin: 0, color: "var(--color-neutral-700)", fontSize: 15, lineHeight: 1.5 }}>
          Answer a few questions about your situation to get a personalized list of tax strategies worth
          researching, then download a report to bring to your CPA or tax attorney. This points you toward things
          to look into; it isn't tax or legal advice.
        </p>
      </div>

      {!results && (
        <Card style={{ padding: "clamp(20px, 4vw, 32px)" }}>
          <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", marginBottom: 18 }}>
            Question {stepIndex + 1} of {visibleQuestions.length}
          </div>

          {currentQuestion && (
            <div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 22, margin: "0 0 18px" }}>
                {currentQuestion.prompt}
              </h2>
              {currentQuestion.options.map((opt) => {
                const val = answers[currentQuestion.id];
                const selected = currentQuestion.type === "single" ? val === opt.value : Array.isArray(val) && val.includes(opt.value);
                return (
                  <OptionButton
                    key={opt.value}
                    selected={selected}
                    label={opt.label}
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
                <PrimaryButton onClick={goNext} disabled={!canAdvance()}>
                  {stepIndex + 1 >= visibleQuestions.length ? "Show my results" : "Next"}
                </PrimaryButton>
              </div>
            </div>
          )}
        </Card>
      )}

      {results && (
        <QuizResultsView
          results={results}
          onStartOver={startOver}
          emptyStateNote="We didn't find a strong match based on your answers. Try the quiz again with different answers."
        />
      )}
    </div>
  );
}
