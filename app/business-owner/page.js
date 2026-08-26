import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

export const metadata = {
  title: "Business Owner | PriorityPay Blog",
  description: "Guides and calculators for business owners with a team -- payroll, entity structure, and separating business money from personal.",
  alternates: { canonical: "https://www.prioritypay.co/business-owner" },
};

export default function BusinessOwnerHubPage() {
  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 28px 96px" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 15, marginBottom: 24, color: "var(--color-neutral-700)" }}>
            <Link href="/" style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}>
              Home
            </Link>
            {" / Blog / "}
            <span style={{ color: "var(--color-text)", fontWeight: 700 }}>Business Owner</span>
          </nav>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "var(--color-accent-200)",
              borderRadius: 999,
              padding: "8px 14px",
              marginBottom: 22,
            }}
          >
            <span style={{ width: 18, height: 2, borderRadius: 999, background: "var(--color-accent)" }} />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
              }}
            >
              Blog
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(40px, 5.4vw, 58px)",
              fontWeight: 800,
              lineHeight: 1.03,
              letterSpacing: "-0.035em",
              margin: "0 0 16px",
            }}
          >
            Business Owner
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.6, maxWidth: "34em", margin: "0 0 42px", color: "var(--color-neutral-800)" }}>
            Guides for business owners with a team &mdash; payroll, entity structure, and keeping business money
            separate from your own.
          </p>

          <div
            style={{
              border: "2px dashed var(--color-accent-400)",
              background: "#FDFCFF",
              borderRadius: 28,
              padding: "48px 28px",
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 800, color: "var(--color-accent-700)", margin: 0 }}>
              Coming soon.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--color-neutral-700)", margin: "10px 0 0" }}>
              The first Business Owner guide is on its way.
            </p>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
