"use client";

import { useEffect, useState } from "react";
import InvestmentGrowthProjection from "@/components/InvestmentGrowthProjection";
import { isW2NoSideHustle, isW2WithSideHustle } from "@/lib/allocations";

// Split out of the Dashboard (components/AccountBalances.js's old
// belowDistribution slot) into its own tab, by request -- the Dashboard
// was getting crowded, and this forward-looking projection card doesn't
// need to live next to the backward-looking "how your money has been
// distributed" pie charts to make sense on its own. The card itself
// (components/InvestmentGrowthProjection.js) is unchanged and fetches its
// own numbers from /api/allocations/investment-projection per block; this
// page's only job is fetching persona (to pick which Retirement blocks
// apply, exactly as Dashboard did) and rendering the same blocks list.
export default function ProjectionsPage() {
  const [persona, setPersona] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const profileRes = await fetch("/api/profile").then((r) => r.json()).catch(() => null);
      setPersona(profileRes?.profile?.persona || null);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-neutral-500">Loading…</p>;

  return (
    <div className="space-y-6" style={{ maxWidth: 900 }}>
      <InvestmentGrowthProjection
        title="Your Investment & Retirement Projections"
        taxNote
        blocks={
          isW2NoSideHustle(persona)
            ? [
                {
                  group: "Investments",
                  startingLabel: "Investment",
                  subHeading: "Investments",
                  emptyStateText: "Once you're contributing to Investments, we'll show you where that could grow.",
                },
                {
                  group: "Retirement",
                  retirementType: "traditional_401k",
                  startingLabel: "401k",
                  subHeading: "401k",
                  emptyStateText: "Once you're contributing to your 401k, we'll show you where that could grow.",
                },
                {
                  group: "Retirement",
                  retirementType: "traditional_ira",
                  startingLabel: "IRA",
                  subHeading: "IRA",
                  emptyStateText: "Once you're contributing to your IRA, we'll show you where that could grow.",
                },
              ]
            : isW2WithSideHustle(persona)
            ? [
                {
                  group: "Investments",
                  startingLabel: "Investment",
                  subHeading: "Investments",
                  emptyStateText: "Once you're contributing to Investments, we'll show you where that could grow.",
                },
                {
                  group: "Retirement",
                  retirementType: "traditional_401k",
                  startingLabel: "401k",
                  subHeading: "401k (Job)",
                  emptyStateText: "Once you're contributing to your 401k, we'll show you where that could grow.",
                },
                {
                  group: "Retirement",
                  retirementType: "traditional_ira",
                  startingLabel: "IRA",
                  subHeading: "IRA (Job)",
                  emptyStateText: "Once you're contributing to your IRA, we'll show you where that could grow.",
                },
                {
                  group: "Retirement (Side Income)",
                  retirementType: "solo_401k",
                  startingLabel: "Solo 401k",
                  subHeading: "Solo 401k (Side Income)",
                  emptyStateText: "Once you're contributing to your Solo 401k, we'll show you where that could grow.",
                },
              ]
            : [
                {
                  group: "Investments",
                  startingLabel: "Investment",
                  subHeading: "Investments",
                  emptyStateText: "Once you're contributing to Investments, we'll show you where that could grow.",
                },
                {
                  group: "Retirement",
                  retirementType: "solo_401k",
                  startingLabel: "Solo 401k",
                  subHeading: "Solo 401k",
                  emptyStateText: "Once you're contributing to your Solo 401k, we'll show you where that could grow.",
                },
              ]
        }
      />
    </div>
  );
}
