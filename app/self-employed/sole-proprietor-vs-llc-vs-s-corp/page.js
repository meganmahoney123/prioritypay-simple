import EntityScenarioClient from "./EntityScenarioClient";

export const metadata = {
  title: "Sole Proprietor vs. LLC vs. S-Corp for Freelancers (2026 Calculator) | PriorityPay",
  description:
    "See what a year looks like as a sole proprietor, an LLC and an S-corp side by side, using your own numbers. Free 2026 calculator plus a plain-English guide to what actually changes.",
  alternates: {
    canonical: "https://www.prioritypay.co/self-employed/sole-proprietor-vs-llc-vs-s-corp",
  },
  openGraph: {
    type: "article",
    title: "Sole Proprietor vs. LLC vs. S-Corp for Freelancers",
    description: "Put in your own numbers and see all three side by side. Free 2026 calculator plus a plain-English guide.",
    url: "https://www.prioritypay.co/self-employed/sole-proprietor-vs-llc-vs-s-corp",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function EntityScenarioPage() {
  return <EntityScenarioClient />;
}
