"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Btn from "./PublicBtn";
import PriorityPayLogo from "./PriorityPayLogo";

// Sticky nav for every logged-out/public page (Homepage, and now the
// /calculators/* resource pages). Extracted out of Homepage.js so those
// resource pages get the same header -- including the "Resources"
// dropdown -- without duplicating ~50 lines of markup per page. Tokens
// (--color-*, --font-*) are expected to already be set on an ancestor
// (see TOKENS in Homepage.js) -- this component doesn't define its own.
const RESOURCES = [
  { href: "/calculators/moneysimulator", label: "Money Simulator" },
  { href: "/calculators/taxestimator", label: "Tax Estimator" },
  { href: "/calculators/emergencyfund", label: "Emergency Fund" },
  { href: "/calculators/debtpayoff", label: "Debt Payoff" },
  { href: "/calculators/retirementcalculator", label: "Solo 401k vs SEP IRA" },
];

export default function PublicHeader() {
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "16px clamp(18px, 4vw, 40px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px 24px",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "var(--color-text)" }}>
          <PriorityPayLogo size={21} />
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{ position: "relative" }}
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
          >
            <button
              onClick={() => setResourcesOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 14,
                background: "transparent",
                border: 0,
                color: "var(--color-text)",
                cursor: "pointer",
                padding: "10px 12px",
              }}
              aria-haspopup="true"
              aria-expanded={resourcesOpen}
            >
              Resources <ChevronDown size={14} />
            </button>
            {resourcesOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  minWidth: 190,
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-divider)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-md)",
                  padding: 6,
                }}
              >
                {RESOURCES.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "block",
                      padding: "9px 12px",
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      color: "var(--color-text)",
                      textDecoration: "none",
                      borderRadius: "var(--radius-sm)",
                    }}
                    onClick={() => setResourcesOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Btn href="/login" variant="secondary">Log in</Btn>
          <Btn href="/signup" variant="primary">Get started</Btn>
        </nav>
      </div>
    </header>
  );
}
