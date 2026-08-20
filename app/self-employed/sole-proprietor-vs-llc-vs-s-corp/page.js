import EntityScenarioClient from "./EntityScenarioClient";

// SEO/LLM notes (Aug 2026 redesign pass):
// - Title/description updated to match Megan's redesigned copy ("For Self
//   Employed" framing instead of "for Freelancers").
// - robots meta added explicitly (index,follow,max-snippet:-1,max-image-
//   preview:large) so search snippets and AI answer engines can quote the
//   full guide and calculator table rather than a truncated summary.
// - Article JSON-LD carries datePublished/dateModified and an explicit
//   inLanguage tag -- both are signals answer engines use to judge
//   freshness on a topic (entity/tax rules) that changes yearly, and to
//   attribute the source correctly when citing it.
// - BreadcrumbList JSON-LD mirrors the in-page breadcrumb nav (Home / Blog
//   / Self Employed / this article) so crawlers and LLMs understand where
//   this page sits in the site's topic hierarchy -- it's filed under the
//   "Self Employed" hub, same as the on-page Blog dropdown.
export const metadata = {
  title: "For Self Employed: Sole Proprietor vs. LLC vs. S-Corp (2026 Calculator) | PriorityPay",
  description:
    "See what a year looks like as a sole proprietor, an LLC and an S-corp side by side, using your own numbers. Free 2026 calculator plus a plain-English guide to what actually changes.",
  alternates: {
    canonical: "https://www.prioritypay.co/self-employed/sole-proprietor-vs-llc-vs-s-corp",
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
  },
  openGraph: {
    type: "article",
    title: "For Self Employed: Sole Proprietor vs. LLC vs. S-Corp",
    description: "Put in your own numbers and see all three side by side. Free 2026 calculator plus a plain-English guide.",
    url: "https://www.prioritypay.co/self-employed/sole-proprietor-vs-llc-vs-s-corp",
  },
  twitter: {
    card: "summary_large_image",
  },
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Sole Proprietor vs. LLC vs. S-Corp: What Actually Changes for the Self Employed",
  description: "A plain-English guide and calculator comparing the three business structures for the self employed, for the 2026 tax year.",
  datePublished: "2026-08-20",
  dateModified: "2026-08-20",
  author: { "@type": "Organization", name: "PriorityPay" },
  publisher: { "@type": "Organization", name: "PriorityPay" },
  mainEntityOfPage: "https://www.prioritypay.co/self-employed/sole-proprietor-vs-llc-vs-s-corp",
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
      name: "Sole Proprietor vs. LLC vs. S-Corp",
      item: "https://www.prioritypay.co/self-employed/sole-proprietor-vs-llc-vs-s-corp",
    },
  ],
};

export default function EntityScenarioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <EntityScenarioClient />
    </>
  );
}
