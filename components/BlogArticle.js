import Link from "next/link";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { BLOOM_TOKENS } from "@/lib/bloomTheme";

// Shared layout for blog posts adapted from PrioritySave YouTube scripts
// (app/business-owner/business-tax-deductions, app/self-employed/solo-401k,
// app/self-employed/how-to-save-on-taxes). Unlike the long reference guides in this folder
// (self-employed-tax-guide, tax-optimization), which mount a design-file
// HTML string, these posts are plain readable articles written as JSX, so
// this component supplies the shared chrome: breadcrumb, header, optional
// YouTube embed, table of contents, FAQ (with FAQPage JSON-LD), a
// PrioritySave callout, related links, and Article/Breadcrumb JSON-LD.
//
// Article styles are scoped under .ps-article so they can't leak onto
// PublicHeader/PublicFooter. Copy rules for everything rendered here: no em
// dashes, never "automatically"/"automated" for the product, and
// descriptive (educational) voice rather than individualized advice.

const SITE = "https://www.prioritysave.com";

export default function BlogArticle({
  path,
  hub = { name: "Self Employed", href: "/self-employed" },
  title,
  dek,
  updated,
  readMinutes,
  videoId,
  videoTitle,
  toc = [],
  faq = [],
  related = [],
  datePublished,
  dateModified,
  children,
}) {
  const url = `${SITE}${path}`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: dek,
    datePublished,
    dateModified: dateModified || datePublished,
    author: { "@type": "Person", name: "Megan Mahoney", jobTitle: "Founder, PrioritySave" },
    publisher: { "@type": "Organization", name: "PrioritySave", url: SITE },
    mainEntityOfPage: url,
    inLanguage: "en-US",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Blog" },
      { "@type": "ListItem", position: 3, name: hub.name, item: `${SITE}${hub.href}` },
      { "@type": "ListItem", position: 4, name: title, item: url },
    ],
  };

  const faqJsonLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <div style={BLOOM_TOKENS}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <PublicHeader />
      <div className="ps-article">
        <div className="ps-wrap">
          <nav aria-label="Breadcrumb" className="ps-crumbs">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Blog</span>
            <span aria-hidden="true">/</span>
            <Link href={hub.href}>{hub.name}</Link>
          </nav>

          <header className="ps-head">
            <div className="ps-eyebrow">PrioritySave &middot; {hub.name}</div>
            <h1>{title}</h1>
            <p className="ps-dek">{dek}</p>
            <div className="ps-stamp">
              <span>
                By <b>Megan Mahoney</b>, founder of PrioritySave
              </span>
              <span>
                Updated <b>{updated}</b>
              </span>
              {readMinutes ? (
                <span>
                  <b>{readMinutes} min</b> read
                </span>
              ) : null}
              <span>
                <b>Education, not tax advice</b>
              </span>
            </div>
          </header>

          {videoId ? (
            <div className="ps-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                title={videoTitle || title}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ) : null}

          {toc.length ? (
            <nav className="ps-toc" aria-label="In this article">
              <div className="ps-toc-t">In this article</div>
              <ol>
                {toc.map((t) => (
                  <li key={t.id}>
                    <a href={`#${t.id}`}>{t.label}</a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <article className="ps-body">{children}</article>

          {faq.length ? (
            <section className="ps-body" id="faq">
              <h2>Frequently asked questions</h2>
              {faq.map((f) => (
                <details key={f.q} className="ps-faq">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>
          ) : null}

          <aside className="ps-cta">
            <div className="ps-cta-t">Have the money ready when taxes are due</div>
            <p>
              Deductions and retirement accounts only help if the money is there when the bill or the
              contribution deadline arrives. PrioritySave works out how much of each deposit belongs in each bucket,
              like taxes, retirement, and profit, so you know exactly what to set aside, without switching banks.
            </p>
            <Link href="/signup" className="ps-cta-btn">
              Try PrioritySave
            </Link>
          </aside>

          {related.length ? (
            <section className="ps-related">
              <div className="ps-related-t">Keep reading</div>
              <ul>
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href}>{r.title}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="ps-disclaimer">
            This article is general education, not tax, legal, or financial advice for any one person. Tax rules
            change and depend on your situation, so check the details with a CPA or tax professional before making
            changes. Figures are for the 2026 tax year unless noted.
          </p>
        </div>
      </div>
      <style>{ARTICLE_CSS}</style>
      <PublicFooter />
    </div>
  );
}

const ARTICLE_CSS = `
.ps-article{background:var(--color-bg);color:var(--color-text);font-family:var(--font-body)}
.ps-article .ps-wrap{max-width:780px;margin:0 auto;padding:48px 24px 96px}
.ps-article .ps-crumbs{display:flex;flex-wrap:wrap;gap:8px;font-size:15px;color:var(--color-neutral-700);margin-bottom:26px}
.ps-article .ps-crumbs a{color:var(--color-accent);font-weight:600;text-decoration:none}
.ps-article .ps-eyebrow{font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--color-accent-700);margin-bottom:14px}
.ps-article h1{font-family:var(--font-heading);font-size:clamp(34px,5vw,52px);font-weight:800;line-height:1.05;letter-spacing:-.035em;margin:0 0 16px}
.ps-article .ps-dek{font-size:20px;line-height:1.6;color:var(--color-neutral-800);margin:0 0 20px}
.ps-article .ps-stamp{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px;color:var(--color-neutral-700);padding-bottom:26px;border-bottom:1px solid var(--color-divider)}
.ps-article .ps-video{position:relative;padding-top:56.25%;margin:30px 0 8px;border-radius:22px;overflow:hidden;background:#241634;box-shadow:var(--shadow-md)}
.ps-article .ps-video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.ps-article .ps-toc{margin:30px 0 8px;padding:22px 26px;border:1px solid var(--color-divider);border-radius:22px;background:var(--color-surface)}
.ps-article .ps-toc-t{font-weight:800;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:var(--color-accent-700);margin-bottom:10px}
.ps-article .ps-toc ol{margin:0;padding-left:0;list-style:none;line-height:1.9;font-size:17px}
.ps-article .ps-toc a{color:var(--color-text);text-decoration:none}
.ps-article .ps-toc a:hover{color:var(--color-accent)}
.ps-article .ps-body{font-size:18px;line-height:1.75}
.ps-article .ps-body h2{font-family:var(--font-heading);font-size:clamp(26px,3.2vw,34px);font-weight:800;letter-spacing:-.025em;line-height:1.15;margin:52px 0 14px;scroll-margin-top:90px}
.ps-article .ps-body h3{font-family:var(--font-heading);font-size:22px;font-weight:800;letter-spacing:-.015em;margin:32px 0 8px;scroll-margin-top:90px}
.ps-article .ps-body p{margin:0 0 16px}
.ps-article .ps-body ul,.ps-article .ps-body ol{margin:0 0 18px;padding-left:24px}
.ps-article .ps-body ul{list-style:disc}
.ps-article .ps-body ol{list-style:decimal}
.ps-article .ps-body li{margin:0 0 8px}
.ps-article .ps-body a{color:var(--color-accent);font-weight:600}
.ps-article .ps-body table{width:100%;border-collapse:collapse;margin:8px 0 22px;font-size:16px;background:var(--color-surface);border-radius:16px;overflow:hidden;box-shadow:0 0 0 1px var(--color-divider)}
.ps-article .ps-body th,.ps-article .ps-body td{text-align:left;padding:11px 14px;border-bottom:1px solid var(--color-divider);vertical-align:top}
.ps-article .ps-body th{background:var(--color-accent-100);font-weight:800}
.ps-article .ps-body tr:last-child td{border-bottom:0}
.ps-article .ps-table{overflow-x:auto}
.ps-article .ps-box{margin:18px 0 22px;padding:18px 22px;border-radius:18px;background:var(--color-accent-100);border:1px solid var(--color-accent-300)}
.ps-article .ps-box p:last-child{margin-bottom:0}
.ps-article .ps-warn{margin:18px 0 22px;padding:18px 22px;border-radius:18px;background:#FDF1F3;border:1px solid #F2C4CC}
.ps-article .ps-warn p:last-child{margin-bottom:0}
.ps-article .ps-faq{border:1px solid var(--color-divider);border-radius:16px;background:var(--color-surface);padding:14px 18px;margin:0 0 10px}
.ps-article .ps-faq summary{font-weight:700;cursor:pointer}
.ps-article .ps-faq p{margin:10px 0 0}
.ps-article .ps-cta{margin:56px 0 0;padding:28px 30px;border-radius:24px;background:var(--color-surface);border:1px solid var(--color-accent-300);box-shadow:var(--shadow-md)}
.ps-article .ps-cta-t{font-family:var(--font-heading);font-size:24px;font-weight:800;letter-spacing:-.02em;margin-bottom:8px}
.ps-article .ps-cta p{font-size:17px;line-height:1.65;margin:0 0 18px;color:var(--color-neutral-800)}
.ps-article .ps-cta-btn{display:inline-block;background:var(--color-accent);color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px}
.ps-article .ps-related{margin-top:40px}
.ps-article .ps-related-t{font-weight:800;font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:var(--color-accent-700);margin-bottom:10px}
.ps-article .ps-related ul{margin:0;padding-left:20px;list-style:disc;line-height:1.9;font-size:17px}
.ps-article .ps-related a{color:var(--color-accent);font-weight:600}
.ps-article .ps-disclaimer{margin-top:36px;font-size:14px;line-height:1.6;color:var(--color-neutral-700)}
`;
