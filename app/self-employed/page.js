import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

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
    href: "/self-employed/sole-proprietor-vs-llc-vs-s-corp",
    title: "Sole Proprietor vs. LLC vs. S-Corp",
    dek: "See what a year looks like as each structure side by side, using your own numbers. Free 2026 calculator plus a plain-English guide.",
  },
];

export default function SelfEmployedHubPage() {
  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <div style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "46px 22px 90px" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 13, marginBottom: 22, color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
            <Link href="/" style={{ color: "inherit" }}>Home</Link> / Blog / Self Employed
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <span style={{ width: 30, height: 1, background: "var(--color-accent)" }} />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>Blog</span>
          </div>

          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, lineHeight: 1.08, letterSpacing: "-0.02em", margin: "0 0 14px" }}>
            Self Employed
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, maxWidth: "36em", margin: "0 0 42px", color: "color-mix(in srgb, var(--color-text) 76%, transparent)" }}>
            Guides for freelancers and independent contractors -- taxes, entity structure, and the parts of managing money that don't come with a steady paycheck.
          </p>

          <div style={{ display: "grid", gap: 18 }}>
            {ARTICLES.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                style={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-neutral-100)",
                  boxShadow: "var(--shadow-sm)",
                  padding: "24px 26px",
                }}
              >
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 400, margin: "0 0 8px" }}>{a.title}</h2>
                <p style={{ fontSize: 15.5, lineHeight: 1.6, margin: 0, color: "color-mix(in srgb, var(--color-text) 74%, transparent)" }}>{a.dek}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
