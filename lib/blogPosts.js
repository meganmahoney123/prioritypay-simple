// Single list of every blog post, used by the general /blog index and the
// audience hub pages (/self-employed, /business-owner, /w2). A post can
// belong to more than one hub (for example, deductions apply to both
// self-employed people and business owners) but lives at one URL, so
// there is only ever one canonical page per topic. Newest or most
// important first within each list.
export const BLOG_POSTS = [
  {
    href: "/self-employed/self-employed-tax-guide",
    title: "Taxes for Self Employed: The Complete Guide",
    dek: "Understand the basics of how taxes work for self employed individuals. This guide discusses every form, deadline, deduction and credit that applies to self-employment taxes, in plain English.",
    hubs: ["self-employed"],
  },
  {
    href: "/self-employed/sole-proprietor-vs-llc-vs-s-corp",
    title: "Sole Proprietor vs. LLC vs. S-Corp",
    dek: "See what a year looks like as each structure side by side, using your own numbers. Free 2026 calculator plus a plain-English guide.",
    hubs: ["self-employed", "business-owner"],
  },
  {
    href: "/blog/how-to-save-on-taxes",
    title: "How to Save on Taxes as an Entrepreneur (2026)",
    dek: "Four high-impact strategies and two bonuses: retirement contributions, the health insurance deduction, year-end timing, the S corp election, the Augusta rule, and hiring your kids.",
    hubs: ["self-employed", "business-owner"],
  },
  {
    href: "/blog/business-tax-deductions",
    title: "10 Tax Deductions Business Owners Should Know About",
    dek: "Home office, mileage, health insurance, hiring your kids, QBI, and more, with 2026 numbers, how to qualify, and common mistakes.",
    hubs: ["self-employed", "business-owner"],
  },
  {
    href: "/self-employed/solo-401k",
    title: "What Is a Solo 401(k)? 2026 Limits and Examples",
    dek: "How self-employed people with no employees can put away up to $72,000 in 2026, with a worked tax example and the Mega Backdoor Roth.",
    hubs: ["self-employed"],
  },
  {
    href: "/self-employed/tax-optimization",
    title: "Tax Optimization for Self Employed: The Complete Guide",
    dek: "The levers above the basics: retirement, entity structure, timing, and family payroll, explained in plain English, with a filter that shortens the guide to your situation.",
    hubs: ["self-employed"],
  },
];

export const BLOG_HUB_NAMES = {
  "self-employed": "Self Employed",
  "business-owner": "Business Owner",
  w2: "W2",
};

export function postsForHub(hub) {
  return BLOG_POSTS.filter((p) => p.hubs.includes(hub));
}
