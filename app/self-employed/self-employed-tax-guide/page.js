import SelfEmployedTaxGuideClient from "./SelfEmployedTaxGuideClient";

// Second entry in the Self Employed guide series (see
// sole-proprietor-vs-llc-vs-s-corp/page.js for the first, and
// app/self-employed/page.js for the hub they're both linked from).
//
// SEO notes for this one:
// - Title leads with the exact target phrase ("Taxes for Self Employed")
//   rather than a cute headline, matching how the sole-proprietor page's
//   title leads with its own target phrase -- title-tag proximity to the
//   query is still the single strongest on-page ranking signal, and this is
//   a page worth actually trying to rank, not just a support doc.
// - robots.max-snippet:-1 / max-image-preview:large again match the sole-
//   proprietor page -- lets Google/Bing show a long snippet or full table
//   instead of truncating, and (separately) lets AI answer engines quote
//   more of the page when citing it.
// - Article JSON-LD's headline/description intentionally differ in wording
//   from the <title>/meta description (not a copy-paste) -- duplicate exact
//   strings across visible title and structured data is a common miss that
//   makes the structured data look auto-generated rather than authored.
// - BreadcrumbList JSON-LD mirrors the sole-proprietor page's shape exactly
//   (Home / Blog / Self Employed / this article) so this page files under
//   the same hub in Google's understanding of the site, not as an orphan.
export const metadata = {
  title: "Taxes for Self Employed: The Complete 2026 Guide (Forms, Deadlines, Deductions) | PriorityPay",
  description:
    "Every form, deadline, deduction and credit that applies to self-employment taxes in 2026, in plain English -- plus a 4-question filter that shortens the guide to just what applies to your situation.",
  alternates: {
    canonical: "https://www.prioritypay.co/self-employed/self-employed-tax-guide",
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
  },
  openGraph: {
    type: "article",
    title: "The Complete Guide to Taxes for Self Employed (2026)",
    description:
      "Forms, deadlines, deductions and credits for self-employment taxes, explained in plain English -- with a filter that shortens the guide to your situation.",
    url: "https://www.prioritypay.co/self-employed/self-employed-tax-guide",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "The Ultimate Guide to Taxes For Self Employed",
  description:
    "A complete, plain-English reference covering how self-employment taxes work, every form you may need to file, all deadlines and payment methods, what counts as income, how the tax bill is calculated, business deductions, tax credits, how much to set aside, and what to do after filing -- for the 2026 tax year.",
  datePublished: "2026-08-27",
  dateModified: "2026-08-27",
  author: { "@type": "Organization", name: "PriorityPay" },
  publisher: { "@type": "Organization", name: "PriorityPay" },
  mainEntityOfPage: "https://www.prioritypay.co/self-employed/self-employed-tax-guide",
  inLanguage: "en-US",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.prioritypay.co/" },
    { "@type": "ListItem", position: 2, name: "Blog" },
    { "@type": "ListItem", position: 3, name: "Self Employed", item: "https://www.prioritypay.co/self-employed" },
    {
      "@type": "ListItem",
      position: 4,
      name: "Taxes for Self Employed: The Complete Guide",
      item: "https://www.prioritypay.co/self-employed/self-employed-tax-guide",
    },
  ],
};

export default function SelfEmployedTaxGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <SelfEmployedTaxGuideClient />
    </>
  );
}
