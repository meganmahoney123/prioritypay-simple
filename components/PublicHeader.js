"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import Btn from "./PublicBtn";
import PriorityPayLogo from "./PriorityPayLogo";

// Sticky nav for every logged-out/public page (Homepage, and now the
// /calculators/* resource pages and the /self-employed/* blog articles).
// Extracted out of Homepage.js so those pages get the same header without
// duplicating markup. Tokens (--color-*, --font-*) are expected to already
// be set on an ancestor (see TOKENS in Homepage.js) -- this component
// doesn't define its own.
//
// Nav shape: Money Simulator stands alone (it's the flagship interactive
// tool, not just another calculator) -- "Resources" is now "Calculators"
// and holds the four numeric calculators -- "Blog" is new, organized into
// audience hubs (just "Self Employed" so far; more hubs get their own
// entry here as Megan adds them).
const CALCULATORS = [
  { href: "/calculators/taxestimator", label: "Tax Estimator" },
  { href: "/calculators/emergencyfund", label: "Emergency Fund" },
  { href: "/calculators/debtpayoff", label: "Debt Payoff" },
  { href: "/calculators/retirementcalculator", label: "Solo 401k vs SEP IRA" },
];

const BLOG_HUBS = [
  {
    hub: "Self Employed",
    items: [{ href: "/self-employed/sole-proprietor-vs-llc-vs-s-corp", label: "Sole Proprietor vs. LLC vs. S-Corp" }],
  },
];

function NavDropdown({ label, open, setOpen, children }) {
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen((v) => !v)}
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
        aria-expanded={open}
      >
        {label} <ChevronDown size={14} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            minWidth: 210,
            background: "var(--color-bg)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            padding: 6,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownLink({ href, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "block",
        padding: "9px 12px",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        color: "var(--color-text)",
        textDecoration: "none",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {label}
    </Link>
  );
}

export default function PublicHeader() {
  const [calcOpen, setCalcOpen] = useState(false);
  const [blogOpen, setBlogOpen] = useState(false);

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
          <Link
            href="/calculators/moneysimulator"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--color-text)",
              textDecoration: "none",
              padding: "10px 12px",
            }}
          >
            Money Simulator
          </Link>

          <NavDropdown label="Calculators" open={calcOpen} setOpen={setCalcOpen}>
            {CALCULATORS.map((item) => (
              <DropdownLink key={item.href} href={item.href} label={item.label} onClick={() => setCalcOpen(false)} />
            ))}
          </NavDropdown>

          <NavDropdown label="Blog" open={blogOpen} setOpen={setBlogOpen}>
            {BLOG_HUBS.map((hub) => (
              <div key={hub.hub}>
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
                    padding: "8px 12px 4px",
                  }}
                >
                  {hub.hub}
                </div>
                {hub.items.map((item) => (
                  <DropdownLink key={item.href} href={item.href} label={item.label} onClick={() => setBlogOpen(false)} />
                ))}
              </div>
            ))}
          </NavDropdown>

          <Btn href="/login" variant="secondary">Log in</Btn>
          <Btn href="/signup" variant="primary">Get started</Btn>
        </nav>
      </div>
    </header>
  );
}
