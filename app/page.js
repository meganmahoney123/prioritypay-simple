import { redirect } from "next/navigation";
import { getAuthedUser, supabaseAdmin } from "@/lib/supabaseServer";
import Homepage from "@/components/Homepage";

// The homepage previously had no page-specific metadata at all and fell
// back to the generic root-layout default ("PriorityPay Simple" / "Route
// your money before you spend it.") -- the single highest-value page on
// the site to have real title/description/OG tags, since it's the one
// most likely to get linked/shared and the one most worth ranking for
// brand searches. Copy mirrors the actual homepage h1/subhead in
// components/Homepage.js rather than being written fresh, so search
// snippets and social previews say the same thing the page does.
export const metadata = {
  title: "PriorityPay -- Automatically Route Income to Savings, Taxes, and Investments",
  description:
    "PriorityPay splits every deposit the moment it lands, setting aside a percentage for retirement, savings, and taxes automatically. Built for the self-employed.",
  alternates: {
    canonical: "https://www.prioritypay.co/",
  },
  openGraph: {
    type: "website",
    title: "PriorityPay -- Automatically Route Income to Savings, Taxes, and Investments",
    description: "PriorityPay splits every deposit the moment it lands, setting aside a percentage for retirement, savings, and taxes automatically.",
    url: "https://www.prioritypay.co/",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PriorityPay",
  url: "https://www.prioritypay.co/",
  description: "PriorityPay automatically splits self-employed and business income into savings, taxes, and investments the moment it's deposited.",
};

export default async function RootPage() {
  const user = await getAuthedUser();
  if (!user) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <Homepage />
      </>
    );
  }

  const { data: profile } = await supabaseAdmin()
    .from("simple_profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  redirect(profile?.onboarded ? "/dashboard" : "/onboarding");
}
