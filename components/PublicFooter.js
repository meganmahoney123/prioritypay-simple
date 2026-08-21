import Link from "next/link";
import PriorityPayLogo from "./PriorityPayLogo";

// Shared footer for every public/marketing page (Homepage and all
// /calculators/*, /tax-savings-quiz, /self-employed, /business-owner,
// /w2 pages). Previously only Homepage had any footer at all -- every
// other public page had no legal links or business identification
// anywhere on the page, and Terms/Privacy were reachable only from the
// signup screen. That's a real gap for a business applying for Dwolla's
// Access API: reviewers check that a live, public site clearly names
// the legal entity and links its Terms/Privacy, not just that the pages
// exist somewhere. Hardcoded colors (not --color-* tokens) on purpose,
// same as the original Homepage footer, so it renders identically
// whether or not an ancestor sets LEDGER_TOKENS.
export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        background: "#171614",
        color: "color-mix(in srgb, #f3f2f2 55%, transparent)",
        borderTop: "1px solid color-mix(in srgb, #f3f2f2 14%, transparent)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "40px clamp(18px, 4vw, 40px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "22px 48px",
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ color: "#f3f2f2", marginBottom: 14 }}>
            <PriorityPayLogo size={19} markColor="var(--color-accent-400)" payColor="var(--color-accent-400)" />
          </div>
          <p style={{ fontSize: 12, margin: 0, color: "color-mix(in srgb, #f3f2f2 45%, transparent)" }}>
            &copy; {year} PriorityPay LLC. All rights reserved.
          </p>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "color-mix(in srgb, #f3f2f2 40%, transparent)",
              marginBottom: 12,
            }}
          >
            Legal
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/terms" style={{ color: "color-mix(in srgb, #f3f2f2 70%, transparent)", fontSize: 13.5, textDecoration: "none" }}>
              Terms of Service
            </Link>
            <Link href="/privacy" style={{ color: "color-mix(in srgb, #f3f2f2 70%, transparent)", fontSize: 13.5, textDecoration: "none" }}>
              Privacy Policy
            </Link>
            <a href="mailto:megan@ignitemysite.com" style={{ color: "color-mix(in srgb, #f3f2f2 70%, transparent)", fontSize: 13.5, textDecoration: "none" }}>
              Contact
            </a>
          </div>
        </div>

        <p style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, maxWidth: "60em" }}>
          PriorityPay routes money between accounts you connect and control. It is not a bank, broker-dealer, or
          investment adviser, and does not hold or invest your funds. Money movement is performed by Dwolla, Inc., a
          licensed payment processor; account connections are made through Plaid Inc.
        </p>
      </div>
    </footer>
  );
}
