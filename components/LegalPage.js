"use client";

import Link from "next/link";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

// Shared prose scaffold for /terms and /privacy -- plain, readable legal
// document styling using the same Ledger fonts/colors as the rest of the
// app, so these don't look like an unstyled default Next.js page when a
// Dwolla reviewer (or a real user) clicks through to them.
export default function LegalPage({ title, updated, children }) {
  return (
    <div style={{ ...LEDGER_TOKENS, minHeight: "100vh", background: "var(--color-bg)" }}>
      <div style={{ maxWidth: "42em", margin: "0 auto", padding: "56px 24px 80px" }}>
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: 14,
            color: "var(--color-accent-700)",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          &larr; PriorityPay
        </Link>

        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(30px, 6vw, 42px)",
            fontWeight: 400,
            margin: "20px 0 6px",
            color: "var(--color-text)",
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 14, color: "color-mix(in srgb, var(--color-text) 55%, transparent)", margin: "0 0 32px" }}>
          Last updated {updated}
        </p>

        <div
          className="pp-legal-prose"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 15.5,
            lineHeight: 1.7,
            color: "var(--color-text)",
          }}
        >
          {children}
        </div>
      </div>

      <style jsx global>{`
        .pp-legal-prose h2 {
          font-family: var(--font-heading);
          font-size: 22px;
          font-weight: 600;
          margin: 34px 0 10px;
        }
        .pp-legal-prose p {
          margin: 0 0 14px;
        }
        .pp-legal-prose ul {
          margin: 0 0 14px;
          padding-left: 22px;
        }
        .pp-legal-prose li {
          margin: 0 0 6px;
        }
        .pp-legal-prose a {
          color: var(--color-accent-700);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .pp-legal-prose strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
