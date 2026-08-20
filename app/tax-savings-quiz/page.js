import TaxSavingsQuizClient from "./TaxSavingsQuizClient";

export const metadata = {
  title: "Free Tax Savings Quiz | PriorityPay",
  description:
    "Answer a few questions about your income, family, and business setup to get a personalized list of tax strategies worth researching. Free, no account needed.",
  alternates: {
    canonical: "https://www.prioritypay.co/tax-savings-quiz",
  },
  openGraph: {
    type: "website",
    title: "Free Tax Savings Quiz",
    description: "Find tax strategies worth researching for your specific situation.",
    url: "https://www.prioritypay.co/tax-savings-quiz",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function TaxSavingsQuizPage() {
  return <TaxSavingsQuizClient />;
}
