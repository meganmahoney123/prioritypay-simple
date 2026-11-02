"use client";

// Beta chat shown under the Tax Savings Quiz results. Sends the quiz
// answers + matched strategy titles with every request so the assistant
// starts with a full picture (see QUIZ CONTEXT in app/api/advisor/chat).
import { useRef, useState } from "react";
import { Card, PrimaryButton } from "@/components/ui";

const STARTERS = [
  "Which of these should I look into first?",
  "How much should I be setting aside for taxes?",
  "What am I spending on that might be deductible?",
];

export default function QuizChat({ answers, results }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState(null);
  const endRef = useRef(null);

  const strategies = (results?.results || []).flatMap((g) => g.strategies.map((s) => s.title));

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, quizContext: { answers, strategies } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.usage) setRemaining(data.usage.remaining);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    }
    setSending(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-sm font-semibold">Ask about your results</h2>
        <span
          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
          style={{ background: "#EDE6FF", color: "#3B1C7A" }}
        >
          Beta
        </span>
      </div>
      <p className="text-xs text-[var(--color-neutral-700)] mb-4">
        Ask follow-up questions about the opportunities above. The assistant knows your quiz answers and can look at
        your PriorityPay data. It assumes the numbers in PriorityPay are accurate and up to date, so correct it if
        anything looks off. It isn&apos;t a CPA or attorney; confirm anything important with a professional.
      </p>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {STARTERS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={sending}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-divider)] hover:bg-[var(--color-neutral-200)]"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className="text-sm px-3 py-2 rounded-xl"
            style={{
              whiteSpace: "pre-wrap",
              background: m.role === "user" ? "#EDE6FF" : "var(--color-neutral-200)",
              marginLeft: m.role === "user" ? "auto" : 0,
              maxWidth: "92%",
              width: "fit-content",
            }}
          >
            {m.content}
          </div>
        ))}
        {sending && <p className="text-xs text-[var(--color-neutral-700)]">Thinking…</p>}
        {error && <p className="text-xs" style={{ color: "#9C3B22" }}>{error}</p>}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-center gap-2 mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          className="flex-1 border border-[var(--color-divider)] rounded-lg px-3 py-2 text-sm"
          style={{ minWidth: 0 }}
        />
        <PrimaryButton type="submit" disabled={sending || !input.trim()} className="text-xs px-4 py-2">
          Send
        </PrimaryButton>
      </form>
      {remaining !== null && (
        <p className="text-[11px] mt-2 text-[var(--color-neutral-700)]">{remaining} questions left this month</p>
      )}
    </Card>
  );
}
