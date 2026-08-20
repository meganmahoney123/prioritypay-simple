"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
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
  { href: "/calculators/taxestimator", label: "Tax Reserve Estimator" },
  { href: "/calculators/emergencyfund", label: "Emergency Fund" },
  { href: "/calculators/debtpayoff", label: "Debt Payoff" },
  { href: "/calculators/retirementcalculator", label: "Solo 401k + SEP IRA" },
  { href: "/calculators/compoundinterest", label: "Compound Interest" },
  { href: "/calculators/advisoryfeecalculator", label: "Advisory Fee Calculator" },
];

// The Blog dropdown itself only ever shows the three hub names -- it
// does not list individual article titles. Each hub name links straight
// to that hub's landing page (app/self-employed/page.js etc.), and the
// article list lives there, not in the nav. Self Employed already has
// one post; Business Owner and W2 show a "coming soon" state on their
// hub page until Megan files content under them.
const BLOG_HUBS = [
  { hub: "Self Employed", href: "/self-employed" },
  { hub: "Business Owner", href: "/business-owner" },
  { hub: "W2", href: "/w2" },
];

// The top-level links every nav surface (desktop row + mobile drawer)
// needs, kept in one place so the two don't drift.
const TOP_LINKS = [
  { href: "/calculators/moneysimulator", label: "Income Distribution Simulator" },
  { href: "/tax-savings-quiz", label: "Tax Savings Quiz" },
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

// Mobile drawer group heading -- plain uppercase label, not a button
// (unlike the desktop dropdowns, the drawer just lists everything flat
// since hover-driven dropdowns don't have a touch equivalent).
function DrawerGroupLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-heading)",
        fontSize: 12,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "color-mix(in srgb, var(--color-text) 50%, transparent)",
        padding: "16px 16px 6px",
      }}
    >
      {children}
    </div>
  );
}

function DrawerLink({ href, label, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "block",
        padding: "12px 16px",
        fontFamily: "var(--font-body)",
        fontSize: 16,
        color: "var(--color-text)",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}

export default function PublicHeader() {
  const [calcOpen, setCalcOpen] = useState(false);
  const [blogOpen, setBlogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          gap: "14px 24px",
        }}
      >
        <Link href="/" style={{ textDecoration: "none", color: "var(--color-text)" }}>
          <PriorityPayLogo size={21} />
        </Link>

        {/* Desktop nav row -- hidden below 880px via CSS (see the
            pp-public-nav / pp-public-hamburger media query), same
            pattern AppShell uses so there's no JS-hydration flash of an
            overflowing nav row before the breakpoint kicks in. */}
        <nav className="pp-public-nav" style={{ alignItems: "center", gap: 8 }}>
          {TOP_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: 14,
                color: "var(--color-text)",
                textDecoration: "none",
                padding: "10px 12px",
                whiteSpace: "nowrap",
              }}
            >
              {item.label}
            </Link>
          ))}

          <NavDropdown label="Calculators" open={calcOpen} setOpen={setCalcOpen}>
            {CALCULATORS.map((item) => (
              <DropdownLink key={item.href} href={item.href} label={item.label} onClick={() => setCalcOpen(false)} />
            ))}
          </NavDropdown>

          <NavDropdown label="Blog" open={blogOpen} setOpen={setBlogOpen}>
            {BLOG_HUBS.map((hub) => (
              <DropdownLink key={hub.href} href={hub.href} label={hub.hub} onClick={() => setBlogOpen(false)} />
            ))}
          </NavDropdown>

          <Btn href="/login" variant="secondary">Log in</Btn>
          <Btn href="/signup" variant="primary">Get started</Btn>
        </nav>

        {/* Mobile hamburger -- hidden above 880px via the same CSS
            breakpoint, so exactly one of the two nav surfaces is ever
            visible at a time. */}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="pp-public-hamburger"
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            background: "transparent",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            color: "var(--color-text)",
            flex: "none",
          }}
        >
          <Menu size={18} />
        </button>
      </div>

      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 70, background: "color-mix(in srgb, #171614 48%, transparent)", display: "flex", justifyContent: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(86vw, 320px)",
              height: "100%",
              overflowY: "auto",
              background: "var(--color-bg)",
              borderLeft: "1px solid var(--color-divider)",
              boxShadow: "var(--shadow-lg)",
              padding: "18px 0 28px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 16px 16px" }}>
              <PriorityPayLogo size={19} />
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                style={{ display: "inline-flex", background: "transparent", border: 0, cursor: "pointer", color: "color-mix(in srgb, var(--color-text) 50%, transparent)", padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ height: 1, background: "var(--color-divider)" }} />

            {TOP_LINKS.map((item) => (
              <DrawerLink key={item.href} href={item.href} label={item.label} onClick={() => setMenuOpen(false)} />
            ))}

            <DrawerGroupLabel>Calculators</DrawerGroupLabel>
            {CALCULATORS.map((item) => (
              <DrawerLink key={item.href} href={item.href} label={item.label} onClick={() => setMenuOpen(false)} />
            ))}

            <DrawerGroupLabel>Blog</DrawerGroupLabel>
            {BLOG_HUBS.map((hub) => (
              <DrawerLink key={hub.href} href={hub.href} label={hub.hub} onClick={() => setMenuOpen(false)} />
            ))}

            <div style={{ flex: 1 }} />
            <div style={{ padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn href="/login" variant="secondary" style={{ textAlign: "center" }}>Log in</Btn>
              <Btn href="/signup" variant="primary" style={{ textAlign: "center" }}>Get started</Btn>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .pp-public-nav {
          display: flex;
        }
        .pp-public-hamburger {
          display: none;
        }
        @media (max-width: 880px) {
          .pp-public-nav {
            display: none !important;
          }
          .pp-public-hamburger {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}
