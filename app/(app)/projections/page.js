"use client";

import InvestmentGrowthProjection from "@/components/InvestmentGrowthProjection";

// Split out of the Dashboard (components/AccountBalances.js's old
// belowDistribution slot) into its own tab, by request -- the Dashboard
// was getting crowded, and this forward-looking projection card doesn't
// need to live next to the backward-looking "how your money has been
// distributed" pie charts to make sense on its own.
//
// Redone (Sep 2026) into a single combined calculator across every
// investable category (Investments + Retirement + Retirement (Side
// Income)) instead of one persona-dependent block per category -- so this
// page no longer needs to fetch the person's persona to decide which
// blocks to render; InvestmentGrowthProjection now fetches its own single
// combined total from /api/allocations/investment-projection.
export default function ProjectionsPage() {
  return (
    <div className="space-y-6" style={{ maxWidth: 900 }}>
      <InvestmentGrowthProjection title="Your Investment & Retirement Projections" taxNote />
    </div>
  );
}
