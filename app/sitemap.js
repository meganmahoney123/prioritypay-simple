// Generates /sitemap.xml -- every public marketing/calculator/guide page,
// so search engines can discover them without depending purely on
// internal-link crawling. Excludes the authenticated app, auth pages
// (login/signup carry no unique indexable content), and the noindexed
// legal pages (terms/privacy).
const BASE = "https://www.prioritypay.co";

export default function sitemap() {
  const lastModified = new Date();

  const routes = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/calculators/moneysimulator", priority: 0.9, changeFrequency: "monthly" },
    { path: "/calculators/taxestimator", priority: 0.8, changeFrequency: "monthly" },
    { path: "/calculators/emergencyfund", priority: 0.8, changeFrequency: "monthly" },
    { path: "/calculators/debtpayoff", priority: 0.8, changeFrequency: "monthly" },
    { path: "/calculators/retirementcalculator", priority: 0.8, changeFrequency: "monthly" },
    { path: "/calculators/compoundinterest", priority: 0.8, changeFrequency: "monthly" },
    { path: "/calculators/advisoryfeecalculator", priority: 0.8, changeFrequency: "monthly" },
    { path: "/self-employed", priority: 0.7, changeFrequency: "weekly" },
    { path: "/business-owner", priority: 0.6, changeFrequency: "weekly" },
    { path: "/w2", priority: 0.6, changeFrequency: "weekly" },
    { path: "/self-employed/sole-proprietor-vs-llc-vs-s-corp", priority: 0.8, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
