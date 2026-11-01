import { redirect } from "next/navigation";
import { getAuthedUser, supabaseAdmin } from "@/lib/supabaseServer";
import Homepage from "@/components/Homepage";
import NativeHomeRedirect from "@/components/NativeHomeRedirect";

// The homepage previously had no page-specific metadata at all and fell
// back to the generic root-layout default ("PrioritySave Simple" / "Route
// your money before you spend it.") -- the single highest-value page on
// the site to have real title/description/OG tags, since it's the one
// most likely to get linked/shared and the one most worth ranking for
// brand searches. Copy mirrors the actual homepage h1/subhead in
// components/Homepage.js rather than being written fresh, so search
// snippets and social previews say the same thing the page does.
export const metadata = {
  title: "PrioritySave | Split Every Deposit Between Savings, Taxes, and Investments",
  description:
    "PrioritySave calculates your split the moment a deposit lands, showing exactly how much to send to retirement, savings, and taxes based on the percentages you set.",
  alternates: {
    canonical: "https://www.prioritysave.com/",
  },
  openGraph: {
    type: "website",
    title: "PrioritySave | Split Every Deposit Between Savings, Taxes, and Investments",
    description: "PrioritySave calculates your split the moment a deposit lands, showing exactly how much to send to retirement, savings, and taxes based on the percentages you set.",
    url: "https://www.prioritysave.com/",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PrioritySave",
  url: "https://www.prioritysave.com/",
  description: "PrioritySave calculates how self-employed and business income should split into savings, taxes, and investments the moment it's deposited, based on the percentages you set.",
};

export default async function RootPage() {
  const user = await getAuthedUser();
  if (!user) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        <NativeHomeRedirect />
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
