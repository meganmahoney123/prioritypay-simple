import Link from "next/link";
import PriorityPayLogo from "./PriorityPayLogo";

// Shared footer for every public/marketing page (Homepage and all
// /calculators/*, /tax-savings-quiz, /self-employed, /business-owner,
// /w2 pages). Previously only Homepage had any footer at all -- every
// other public page had no legal links or business identification
// anywhere on the page, and Terms/Privacy were reachable only from the
// signup screen. That's a real gap for a business handling financial
// data: reviewers (Plaid, App Store, anyone doing diligence) check that a
// live, public site clearly names the legal entity and links its
// Terms/Privacy, not just that the pages exist somewhere.
//
// Restyled per the Aug 2026 Bloom redesign (spec 02): light footer
// (#FAF7FD, 1px #EFE7FA top rule, purple logo) replacing the old dark
// (#171614) footer -- this is shared chrome, so the swap applies to
// every public page at once, matching the light footer already used on
// Homepage/onboarding.
export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer
      style={{
        background: "#FAF7FD",
        color: "#6B5E7A",
        borderTop: "1px solid #EFE7FA",
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
          <div style={{ marginBottom: 14 }}>
            <PriorityPayLogo size={19} payColor="#4E22B8" />
          </div>
          <p style={{ fontSize: 12, margin: 0, color: "#8A7C99" }}>&copy; {year} PriorityPay LLC. All rights reserved.</p>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#8A7C99",
              marginBottom: 12,
            }}
          >
            Legal
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/terms" style={{ color: "#4B3D5E", fontSize: 13.5, textDecoration: "none" }}>
              Terms of Service
            </Link>
            <Link href="/privacy" style={{ color: "#4B3D5E", fontSize: 13.5, textDecoration: "none" }}>
              Privacy Policy
            </Link>
            <Link href="/contact" style={{ color: "#4B3D5E", fontSize: 13.5, textDecoration: "none" }}>
              Contact
            </Link>
          </div>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, maxWidth: "60em", color: "#6B5E7A" }}>
          PriorityPay calculates how to split deposits between accounts you connect and control, and shows you
          exactly what to send. It is not a bank, broker-dealer, or investment adviser, and does not hold, invest, or
          move your funds — every transfer is one you complete yourself. Account connections are made through Plaid
          Inc.
        </p>
      </div>
    </footer>
  );
}
