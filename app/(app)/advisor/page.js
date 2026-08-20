"use client";

import { useEffect, useRef, useState } from "react";
import { Card, PrimaryButton, GhostButton } from "@/components/ui";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

const STARTERS = [
  "Based on my numbers, would an S-corp election actually save me money?",
  "Am I setting aside enough for taxes each month?",
  "What deduction opportunities might I be missing?",
  "How much more can I put into a Solo 401k or SEP IRA this year?",
];

const TOOL_LABELS = {
  get_profile: "your profile",
  get_income_summary: "your real income & expenses",
  get_expense_breakdown: "your real spending by merchant",
  get_business_financials: "your business financials",
  get_tax_strategies: "PriorityPay's tax strategy library",
  get_split_rules: "your split rules",
  get_retirement_contribution_room: "your retirement contribution room",
  compare_entity_tax_scenarios: "the entity tax comparison",
  get_tax_reserve_status: "your tax reserve status",
};

function Bubble({ role, text, toolsUsed }) {
  const isUser = role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 14 }}>
      <div
        style={{
          maxWidth: "82%",
          padding: "12px 16px",
          borderRadius: "var(--radius-lg)",
          background: isUser ? "var(--color-accent-700)" : "var(--color-surface)",
          color: isUser ? "#fff" : "var(--color-text)",
          fontSize: 15,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {text}
        {!isUser && toolsUsed && toolsUsed.length > 0 && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--color-divider)",
              fontSize: 11.5,
              letterSpacing: 0.3,
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            Looked at: {toolsUsed.map((t) => TOOL_LABELS[t] || t).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  async function send(text) {
    const trimmed = (text ?? input).trim();
    if (!trimmed || busy) return;
    setError("");
    const nextMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((cur) => [...cur, { role: "assistant", content: data.reply, toolsUsed: data.toolsUsed }]);
      if (data.usage) setUsage(data.usage);
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setMessages((cur) => cur.slice(0, -1));
      setInput(trimmed);
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 30, margin: "0 0 8px" }}>Tax Strategy Advisor</h1>
          {usage && (
            <span style={{ fontSize: 12.5, color: "var(--color-neutral-600)", whiteSpace: "nowrap" }}>
              {usage.remaining} of {usage.cap} questions left this month
            </span>
          )}
        </div>
        <p style={{ margin: 0, color: "var(--color-neutral-700)", fontSize: 15, lineHeight: 1.5 }}>
          Ask about your own numbers -- income, expenses, entity type, retirement room, and how you're set up in
          PriorityPay. This points you toward strategies worth researching; it isn't tax or legal advice, and it
          can't replace a real CPA or attorney who knows your full situation.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          background: "var(--color-surface)",
          border: "1px solid var(--color-divider)",
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: 13.5,
        }}
      >
        <span style={{ color: "var(--color-neutral-700)" }}>
          Running a separate business (LLC, S-corp, C-corp)? Add your business financials for more accurate advice.
        </span>
        <a href="/business-financials" style={{ color: "var(--color-accent-700)", fontWeight: 600, whiteSpace: "nowrap" }}>
          Add financials &rarr;
        </a>
      </div>

      <Card style={{ padding: 0, display: "flex", flexDirection: "column", height: "62vh", minHeight: 420 }}>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 20px 4px" }}>
          {messages.length === 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.4, color: "var(--color-neutral-600)", marginBottom: 10 }}>
                Try asking
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: "left",
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-divider)",
                      borderRadius: "var(--radius-md)",
                      padding: "10px 14px",
                      fontSize: 14,
                      fontFamily: "var(--font-body)",
                      cursor: "pointer",
                      color: "var(--color-text)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <Bubble key={i} role={m.role} text={m.content} toolsUsed={m.toolsUsed} />
          ))}
          {busy && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 14 }}>
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-surface)",
                  fontSize: 14,
                  color: "var(--color-neutral-700)",
                }}
              >
                Looking at your numbers...
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "0 20px", color: "#a3302a", fontSize: 13.5, marginBottom: 6 }}>{error}</div>
        )}

        <div style={{ borderTop: "1px solid var(--color-divider)", padding: 14, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your taxes, entity setup, or retirement room..."
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-md)",
              padding: "10px 12px",
              fontFamily: "var(--font-body)",
              fontSize: 14.5,
              background: "var(--color-bg)",
              color: "var(--color-text)",
              maxHeight: 140,
            }}
          />
          <PrimaryButton onClick={() => send()} disabled={busy || !input.trim()}>
            Send
          </PrimaryButton>
        </div>
      </Card>

      {messages.length > 0 && (
        <div style={{ marginTop: 12, textAlign: "right" }}>
          <GhostButton onClick={() => setMessages([])}>Start over</GhostButton>
        </div>
      )}

      <p style={{ marginTop: 16, fontSize: 12.5, color: "var(--color-neutral-600)", lineHeight: 1.5 }}>
        This is general educational information based on your PriorityPay data, not tax, legal, or financial advice.
        Strategies mentioned may or may not apply to your full situation. Confirm anything before acting on it with a
        CPA or attorney licensed in your state.
      </p>
    </div>
  );
}
