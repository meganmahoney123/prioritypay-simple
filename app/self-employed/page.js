import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

// Hub landing page for the "Self Employed" Blog category -- linked from
// the Blog dropdown (components/PublicHeader.js), which only shows hub
// names, not article titles. This page is where the article list lives.
export const metadata = {
  title: "Self Employed | PriorityPay Blog",
  description: "Guides and calculators for freelancers and independent contractors -- taxes, entity structure, and managing income that isn't a steady paycheck.",
  alternates: { canonical: "https://www.prioritypay.co/self-employed" },
};

const ARTICLES = [
  {
    href: "/self-employed/self-employed-tax-guide",
    title: "Taxes for Self Employed: The Complete Guide",
    dek: "Understand the basics of how taxes work for self employed individuals. This guide discusses every form, deadline, deduction and credit that applies to self-employment taxes, in plain English.",
  },
  {
    href: "/self-employed/sole-proprietor-vs-llc-vs-s-corp",
    title: "Sole Proprietor vs. LLC vs. S-Corp",
    dek: "See what a year looks like as each structure side by side, using your own numbers. Free 2026 calculator plus a plain-English guide.",
  },
];

export default function SelfEmployedHubPage() {
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
            <span style={{ color: "var(--color-text)", fontWeight: 700 }}>Self Employed</span>
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
            Self Employed
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.6, maxWidth: "34em", margin: "0 0 42px", color: "var(--color-neutral-800)" }}>
            Guides to help self employed individuals navigate taxes, entity structure, and the aspects of managing
            money that don't come with a steady paycheck.
          </p>

          <div style={{ display: "grid", gap: 16 }}>
            {ARTICLES.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="self-employed-hub-card"
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid var(--color-divider)",
                  borderRadius: 28,
                  background: "var(--color-surface)",
                  boxShadow: "0 18px 40px -32px rgba(52,26,102,0.3)",
                  padding: "30px 32px",
                  transition: "border-color 160ms ease, background 160ms ease",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(24px, 2.6vw, 30px)",
                    fontWeight: 800,
                    letterSpacing: "-0.025em",
                    margin: "0 0 10px",
                  }}
                >
                  {a.title}
                </h2>
                <p style={{ fontSize: 17, lineHeight: 1.6, margin: 0, color: "var(--color-neutral-800)" }}>{a.dek}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .self-employed-hub-card:hover {
          border-color: var(--color-accent-400) !important;
          background: #FDFCFF !important;
        }
      `}</style>
      <PublicFooter />
    </div>
  );
}
