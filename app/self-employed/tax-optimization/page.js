import TaxOptimizationGuideClient from "./TaxOptimizationGuideClient";

// Third entry in the Self Employed guide series (see
// self-employed-tax-guide/page.js for the basics guide this one follows,
// sole-proprietor-vs-llc-vs-s-corp/page.js for the entity-choice piece, and
// app/self-employed/page.js for the hub all three are linked from).
//
// SEO notes, following the same conventions as self-employed-tax-guide/page.js:
// - Title leads with the target phrase ("Tax Optimization for Self Employed")
//   rather than a cute headline.
// - robots.max-snippet:-1 / max-image-preview:large match the other guides in
//   this series.
// - Article JSON-LD's headline/description intentionally differ in wording
//   from the <title>/meta description, not a copy-paste.
// - BreadcrumbList JSON-LD mirrors the other guides' shape (Home / Blog /
//   Self Employed / this article).
export const metadata = {
  title:
    "Tax Optimization for Self Employed: The Complete 2026 Guide (Retirement, S-Corp, Family Payroll) | PriorityPay",
  description:
    "Retirement accounts, entity structure, timing, and family payroll, the levers that save self-employed people money on taxes as profit grows, in plain English, plus a 5-question filter that shortens the guide to your situation.",
  alternates: {
    canonical: "https://www.prioritypay.co/self-employed/tax-optimization",
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
  },
  openGraph: {
    type: "article",
    title: "Tax Optimization for Self Employed: The Complete Guide (2026)",
    description:
      "The levers above the basics, retirement, entity structure, timing, and family payroll, explained in plain English, with a filter that shortens the guide to your situation.",
    url: "https://www.prioritypay.co/self-employed/tax-optimization",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Tax Optimization For The Self Employed: Complete Guide",
  description:
    "A complete, plain-English reference covering how self-employed people can reduce their tax bill as profit grows, retirement account choice and sequencing, health insurance, entity structure and the S-corp decision, income timing, family payroll strategies, and investment tax basics, for the 2026 tax year.",
  datePublished: "2026-09-22",
  dateModified: "2026-09-22",
  author: { "@type": "Organization", name: "PriorityPay" },
  publisher: { "@type": "Organization", name: "PriorityPay" },
  mainEntityOfPage: "https://www.prioritypay.co/self-employed/tax-optimization",
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
      name: "Tax Optimization For The Self Employed: Complete Guide",
      item: "https://www.prioritypay.co/self-employed/tax-optimization",
    },
  ],
};

export default function TaxOptimizationGuidePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <TaxOptimizationGuideClient />
    </>
  );
}
