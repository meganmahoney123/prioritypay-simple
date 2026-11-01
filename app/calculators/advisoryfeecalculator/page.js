import AdvisoryFeeCalculatorPublicClient from "./AdvisoryFeeCalculatorPublicClient";

export const metadata = {
  title: "Free Advisory Fee Calculator | PrioritySave",
  description:
    "See what a 1% advisory fee actually costs over time, compared to paying for advice a la carte or managing your own investments, with your real account balances and fee schedule, entirely in your browser.",
  alternates: {
    canonical: "https://www.prioritysave.com/calculators/advisoryfeecalculator",
  },
  openGraph: {
    type: "website",
    title: "Free Advisory Fee Calculator",
    url: "https://www.prioritysave.com/calculators/advisoryfeecalculator",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function AdvisoryFeeCalculatorPage() {
  return <AdvisoryFeeCalculatorPublicClient />;
}
