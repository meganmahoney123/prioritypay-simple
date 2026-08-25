"use client";

import Link from "next/link";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

// Shared prose scaffold for /terms and /privacy -- restyled per the Aug 2026
// "Bloom" purple redesign handoff (spec 12-terms-and-privacy.md). Deliberately
// does NOT use PublicHeader/PublicFooter -- the only chrome is the "back to
// PriorityPay" link, now with the small four-bar logo mark so the page still
// reads as PriorityPay without pulling in the full nav. Every word of both
// documents is verbatim legal text and is untouched by this pass -- this file
// only changes how it's presented.
export default function LegalPage({ title, updated, children }) {
  return (
    <div style={{ ...BLOOM_TOKENS, minHeight: "100vh", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: "44em", margin: "0 auto", padding: "56px 28px 90px" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-heading)",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--color-accent)",
            textDecoration: "none",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 14 }}>
            <span style={{ width: 2, height: 14, borderRadius: 1, background: "var(--color-accent-400)" }} />
            <span style={{ width: 2, height: 10, borderRadius: 1, background: "var(--color-accent-600)" }} />
            <span style={{ width: 2, height: 6, borderRadius: 1, background: "var(--color-accent-800)" }} />
            <span style={{ width: 2, height: 4, borderRadius: 1, background: "var(--color-accent)" }} />
          </span>
          &larr; PriorityPay
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(34px, 6vw, 46px)",
            fontWeight: 800,
            letterSpacing: "-0.035em",
            margin: "22px 0 14px",
            color: "var(--color-text)",
          }}
        >
          {title}
        </h1>
        <span
          style={{
            display: "inline-block",
            fontFamily: "var(--font-heading)",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--color-accent-700)",
            background: "var(--color-accent-100)",
            borderRadius: "var(--radius-pill)",
            padding: "7px 16px",
            margin: "0 0 32px",
          }}
        >
          Last updated {updated}
        </span>

        <div
          className="pp-legal-prose"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 17,
            lineHeight: 1.72,
            color: "var(--color-neutral-700)",
          }}
        >
          {children}
        </div>
      </div>

      <style jsx global>{`
        .pp-legal-prose h2 {
          font-family: var(--font-heading);
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--color-text);
          margin: 40px 0 10px;
        }
        .pp-legal-prose p {
          margin: 0 0 16px;
        }
        .pp-legal-prose ul {
          list-style: disc;
          margin: 0 0 16px;
          padding-left: 22px;
        }
        .pp-legal-prose li {
          margin: 0 0 9px;
        }
        .pp-legal-prose a {
          color: var(--color-accent);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .pp-legal-prose a:hover {
          color: var(--color-accent-700);
        }
        .pp-legal-prose strong {
          font-weight: 700;
          color: var(--color-text);
        }
      `}</style>
    </div>
  );
}
