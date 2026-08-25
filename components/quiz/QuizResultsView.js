"use client";

// Shared results screen for the Tax Savings Quiz -- category cards, the
// download-report button, and the closing disclaimer. Used by both the
// public quiz (app/tax-savings-quiz) and the logged-in in-app version
// (app/(app)/advisor). `ctaSlot` lets each caller supply its own closing
// call-to-action (e.g. "Try PriorityPay free" for anonymous visitors,
// nothing for people who already have an account) without forking the
// rest of the results markup.

import { useState } from "react";
import { Card, GhostButton } from "@/components/ui";
import { CATEGORY_BLURBS, StrategyCard } from "@/components/quiz/QuizShared";

export default function QuizResultsView({ results, onStartOver, ctaSlot, emptyStateNote }) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function handleDownload() {
    setDownloading(true);
    setDownloadError("");
    try {
      // Dynamically imported: pdf-lib is only needed once someone actually
      // clicks this button, so it shouldn't bloat the initial page bundle
      // for every visitor (this page is also the public marketing quiz).
      const { downloadQuizReportPdf } = await import("@/lib/quizReportPdf");
      await downloadQuizReportPdf({ results: results.results });
    } catch (err) {
      setDownloadError("Couldn't build the PDF. Try again, or copy the results from this page instead.");
    }
    setDownloading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "#EDE6FF", borderRadius: 30, padding: "clamp(20px, 4vw, 32px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <p className="text-sm" style={{ margin: 0, maxWidth: 560, fontSize: 18, fontWeight: 600, lineHeight: 1.6, color: "#3B1C7A" }}>
            Based on your answers, here are strategies worth researching, grouped by area. Each one follows the same
            shape: if this applies to you, here's something you could look into, and here's the benefit. These are
            things to be aware of and look into, not personalized financial advice.
          </p>
          {results.results.length > 0 && (
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: 15,
                  padding: "14px 24px",
                  borderRadius: 999,
                  border: "1px solid #6D3BE0",
                  background: "#6D3BE0",
                  color: "#fff",
                  cursor: downloading ? "default" : "pointer",
                  opacity: downloading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {downloading ? "Building PDF..." : "Download report (PDF)"}
              </button>
              <p style={{ margin: "8px 0 0", fontSize: 15, color: "#574A68" }}>
                Built in your browser — to hand to a CPA or tax attorney.
              </p>
              {downloadError && (
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#b3452c" }}>{downloadError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {results.results.length === 0 && (
        <Card style={{ padding: 24, borderRadius: 30 }}>
          <p className="text-sm" style={{ margin: 0 }}>
            {emptyStateNote || "We didn't find a strong match based on your answers. Try the quiz again with different answers."}
          </p>
        </Card>
      )}

      {results.results.map((group) => (
        <div key={group.category} style={{ background: "var(--color-surface)", borderRadius: 30, padding: 32 }}>
          <h3 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
            {group.category}
          </h3>
          {CATEGORY_BLURBS[group.category] && (
            <p className="text-sm" style={{ fontSize: 16, color: "#574A68", margin: "0 0 16px" }}>
              {CATEGORY_BLURBS[group.category]}
            </p>
          )}
          {group.strategies.map((s) => (
            <StrategyCard key={s.id} s={s} />
          ))}
        </div>
      ))}

      {ctaSlot}

      <p className="text-sm" style={{ fontSize: 15, color: "#6B5E7A", textAlign: "center", margin: "4px 0 0" }}>
        This is general educational information based on your quiz answers, not tax, legal, or financial advice.
        Confirm anything before acting on it with a CPA or attorney licensed in your state.
      </p>

      <div style={{ textAlign: "center" }}>
        <GhostButton onClick={onStartOver}>Start over</GhostButton>
      </div>
    </div>
  );
}
