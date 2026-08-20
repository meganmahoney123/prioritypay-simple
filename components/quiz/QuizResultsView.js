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
    <div>
      <Card style={{ padding: "clamp(20px, 4vw, 32px)", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <p className="text-sm" style={{ margin: 0, maxWidth: 560, color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
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
                  fontWeight: 600,
                  fontSize: 14,
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-accent)",
                  background: "var(--color-accent)",
                  color: "#fff",
                  cursor: downloading ? "default" : "pointer",
                  opacity: downloading ? 0.6 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {downloading ? "Building PDF..." : "Download report (PDF)"}
              </button>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "color-mix(in srgb, var(--color-text) 50%, transparent)" }}>
                Built in your browser -- to hand to a CPA or tax attorney.
              </p>
              {downloadError && (
                <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#b3452c" }}>{downloadError}</p>
              )}
            </div>
          )}
        </div>
      </Card>

      {results.results.length === 0 && (
        <Card style={{ padding: 24 }}>
          <p className="text-sm" style={{ margin: 0 }}>
            {emptyStateNote || "We didn't find a strong match based on your answers. Try the quiz again with different answers."}
          </p>
        </Card>
      )}

      {results.results.map((group) => (
        <Card key={group.category} style={{ padding: "clamp(18px, 4vw, 28px)", marginBottom: 18 }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 400, fontSize: 20, margin: "0 0 4px" }}>
            {group.category}
          </h3>
          {CATEGORY_BLURBS[group.category] && (
            <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: "0 0 16px" }}>
              {CATEGORY_BLURBS[group.category]}
            </p>
          )}
          {group.strategies.map((s) => (
            <StrategyCard key={s.id} s={s} />
          ))}
        </Card>
      ))}

      {ctaSlot}

      <p className="text-sm" style={{ color: "color-mix(in srgb, var(--color-text) 55%, transparent)", textAlign: "center", margin: "24px 0" }}>
        This is general educational information based on your quiz answers, not tax, legal, or financial advice.
        Confirm anything before acting on it with a CPA or attorney licensed in your state.
      </p>

      <div style={{ textAlign: "center" }}>
        <GhostButton onClick={onStartOver}>Start over</GhostButton>
      </div>
    </div>
  );
}
