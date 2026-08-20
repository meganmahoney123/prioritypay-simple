import AdvisoryFeeCalculatorPublicClient from "./AdvisoryFeeCalculatorPublicClient";

export const metadata = {
  title: "Free Advisory Fee Calculator | PriorityPay",
  description:
    "See what a 1% advisory fee actually costs over time, compared to paying for advice a la carte or managing your own investments -- with your real account balances and fee schedule, entirely in your browser.",
  alternates: {
    canonical: "https://www.prioritypay.co/calculators/advisoryfeecalculator",
  },
  openGraph: {
    type: "website",
    title: "Free Advisory Fee Calculator",
    url: "https://www.prioritypay.co/calculators/advisoryfeecalculator",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function AdvisoryFeeCalculatorPage() {
  return <AdvisoryFeeCalculatorPublicClient />;
}
