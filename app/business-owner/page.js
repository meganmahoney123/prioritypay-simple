import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

export const metadata = {
  title: "Business Owner | PriorityPay Blog",
  description: "Guides and calculators for business owners with a team -- payroll, entity structure, and separating business money from personal.",
  alternates: { canonical: "https://www.prioritypay.co/business-owner" },
};

export default function BusinessOwnerHubPage() {
  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "46px 22px 90px" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 22, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            <Link href="/" style={{ color: "inherit" }}>Home</Link> / Blog / Business Owner
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ width: 30, height: 1, background: "var(--color-accent)" }} />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Blog</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            Business Owner
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, maxWidth: "36em", margin: "0 0 42px", color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Guides for business owners with a team -- payroll, entity structure, and keeping business money separate from your own.
          </p>

          <div
            style={{
              border: "1px dashed var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              padding: "40px 26px",
              textAlign: "center",
              color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
            }}
          >
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontStyle: "italic", margin: 0 }}>Coming soon.</p>
            <p style={{ fontSize: 14.5, margin: "8px 0 0" }}>The first Business Owner guide is on its way.</p>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
