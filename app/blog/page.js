import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";
import { BLOG_POSTS, BLOG_HUB_NAMES } from "@/lib/blogPosts";

// General blog index: every post on the site, with links into the audience
// hubs. Posts that apply to more than one audience (like the deductions
// post) live under /blog/* and are cross-listed on each hub that fits.
export const metadata = {
  title: "Blog: Taxes, Retirement, and Money for Self-Employed People and Business Owners | PrioritySave",
  description:
    "Plain-English guides on taxes, deductions, retirement accounts, and entity structure for self-employed people, solopreneurs, and business owners, with 2026 numbers.",
  alternates: { canonical: "https://www.prioritysave.com/blog" },
  openGraph: {
    title: "PrioritySave Blog",
    description:
      "Plain-English guides on taxes, deductions, retirement accounts, and entity structure for self-employed people and business owners.",
    url: "https://www.prioritysave.com/blog",
    type: "website",
  },
};

const HUBS = [
  { href: "/self-employed", label: "Self Employed" },
];

export default function BlogIndexPage() {
  return (
    <div style={BLOOM_TOKENS}>
      <PublicHeader />
      <div style={{ background: "var(--color-bg)", color: "var(--color-text)", fontFamily: "var(--font-body)", minHeight: "60vh" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "56px 28px 96px" }}>
          <nav aria-label="Breadcrumb" style={{ fontSize: 15, marginBottom: 24, color: "var(--color-neutral-700)" }}>
            <Link href="/" style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}>
              Home
            </Link>
            {" / "}
            <span style={{ color: "var(--color-text)", fontWeight: 700 }}>Blog</span>
          </nav>

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
            The PrioritySave Blog
          </h1>
          <p style={{ fontSize: 20, lineHeight: 1.6, maxWidth: "34em", margin: "0 0 26px", color: "var(--color-neutral-800)" }}>
            Plain-English guides on taxes, deductions, retirement accounts, and entity structure for self-employed
            people, solopreneurs, and business owners.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "0 0 40px" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-neutral-700)", alignSelf: "center", marginRight: 4 }}>
              Browse by topic:
            </span>
            {HUBS.map((h) => (
              <Link key={h.href} href={h.href} className="blog-hub-chip">
                {h.label}
              </Link>
            ))}
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {BLOG_POSTS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="blog-index-card"
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
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {a.hubs.map((h) => (
                    <span key={h} className="blog-tag">
                      {BLOG_HUB_NAMES[h]}
                    </span>
                  ))}
                </div>
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
        .blog-index-card:hover {
          border-color: var(--color-accent-400) !important;
          background: #FDFCFF !important;
        }
        .blog-hub-chip {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 999px;
          border: 1px solid var(--color-accent-300);
          background: var(--color-surface);
          color: var(--color-accent-700);
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
        }
        .blog-hub-chip:hover { background: var(--color-accent-100); }
        .blog-tag {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--color-accent-700);
          background: var(--color-accent-100);
          border-radius: 999px;
          padding: 4px 10px;
        }
      `}</style>
      <PublicFooter />
    </div>
  );
}
