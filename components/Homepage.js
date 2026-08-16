"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
// Design: "Ledger" — one of three homepage concepts Megan designed in
// Claude Design (Atelier / Ledger / Statement), exported as static HTML
// and ported here 1:1. Colors, spacing, and type scale below are the
// design system's actual tokens (see the exported _ds/styles.css), not
// approximations — keep them in sync if the design changes upstream.

const TOKENS = {
  "--color-bg": "#f3f2f2",
  "--color-surface": "#eae9e9",
  "--color-text": "#201f1d",
  "--color-accent": "#b68235",
  "--color-accent-2": "#ac803e",
  "--color-divider": "color-mix(in srgb, #201f1d 16%, transparent)",

  "--color-neutral-100": "#f8f4f4",
  "--color-neutral-200": "#eae7e7",
  "--color-neutral-300": "#d7d3d3",
  "--color-neutral-400": "#bab6b6",
  "--color-neutral-500": "#9b9797",
  "--color-neutral-600": "#7d7979",
  "--color-neutral-700": "#605d5d",
  "--color-neutral-800": "#444141",
  "--color-neutral-900": "#2d2b2b",

  "--color-accent-100": "#fff3e4",
  "--color-accent-200": "#ffe3bf",
  "--color-accent-300": "#facb8d",
  "--color-accent-400": "#e1ad66",
  "--color-accent-500": "#c28d41",
  "--color-accent-600": "#a06f24",
  "--color-accent-700": "#7d5411",
  "--color-accent-800": "#5a3b0a",
  "--color-accent-900": "#3a270d",

  "--radius-sm": "2px",
  "--radius-md": "4px",
  "--radius-lg": "7px",

  "--shadow-sm": "0 1px 2px color-mix(in srgb, #2d2b2b 14%, transparent)",
  "--shadow-md": "0 3px 10px color-mix(in srgb, #2d2b2b 16%, transparent)",
  "--shadow-lg": "0 12px 32px color-mix(in srgb, #2d2b2b 22%, transparent)",

  "--font-heading": '"Cormorant Garamond", serif',
  "--font-body": '"Lora", serif',

  fontFamily: "var(--font-body)",
  color: "var(--color-text)",
  background: "var(--color-bg)",
  overflowX: "hidden",
};

// ---- content (matches lib/allocations.js defaults + real product copy) ----

const SPLIT_ROWS = [
  { name: "Retirement · Solo 401k", pct: "15%", amt: "$630" },
  { name: "Investments", pct: "10%", amt: "$420" },
  { name: "Savings", pct: "10%", amt: "$420" },
  { name: "Tax Reserve", pct: "10%", amt: "$420" },
];

const BENEFITS = [
  { n: "i", text: "See total saved across every bucket at a glance" },
  { n: "ii", text: "Know your taxes are already set aside before you owe them" },
  { n: "iii", text: "Spend what’s left without doing mental math first" },
];

const BUCKETS = [
  { name: "Solo 401k", amt: "$11,240" },
  { name: "Tax Reserve", amt: "$8,905" },
  { name: "Emergency Fund", amt: "$6,110" },
  { name: "Investments", amt: "$7,963" },
];

const INSTITUTIONS = [
  { name: "Venmo", kind: "Payment app" },
  { name: "PayPal", kind: "Payment app" },
  { name: "Cash App", kind: "Payment app" },
  { name: "Chase", kind: "Business checking" },
  { name: "Bank of America", kind: "Personal checking" },
  { name: "Wells Fargo", kind: "Savings" },
];

const PERCENTAGES = [
  { name: "Solo 401k", pct: "10%", bar: "50%" },
  { name: "SEP IRA", pct: "5%", bar: "25%" },
  { name: "Investments", pct: "10%", bar: "50%" },
  { name: "Tax Reserve", pct: "20%", bar: "100%" },
  { name: "Emergency Fund", pct: "10%", bar: "50%" },
  { name: "OPEX", pct: "10%", bar: "50%" },
  { name: "Savings", pct: "10%", bar: "50%" },
];

const BANK_NAMES = [
  "Venmo", "PayPal", "Cash App", "Chase", "Bank of America", "Wells Fargo",
  "Capital One", "Citibank", "U.S. Bank", "PNC Bank", "Truist", "Ally Bank",
  "Discover", "American Express", "Chime", "SoFi",
];
const MARQUEE_ITEMS = [...BANK_NAMES, "+ 12,000 more banks & credit unions"];

const CLOSEOUT_ROWS = [
  { label: "Income", value: "$14,220" },
  { label: "Business expenses", value: "$3,110" },
  { label: "W2 income (excluded)", value: "$0" },
  { label: "Net income this month", value: "$11,110" },
];

const FAQS = [
  {
    q: "Who is PriorityPay for?",
    a: "PriorityPay is built for self-employed people — freelancers, sole proprietors, single-member LLCs, and S-Corps — along with anyone earning side income, even if you also have a W2 job. If you get paid in a way that doesn't automatically set aside money for taxes and retirement the way a traditional payroll job does, PriorityPay is for you.",
  },
  {
    q: "Do I need to already have a Solo 401k or SEP IRA?",
    a: "Yes. PriorityPay isn't a bank or an investment custodian, so it doesn't open retirement or brokerage accounts for you. You open a Solo 401k, SEP IRA, or investment account with a provider of your choice, then connect it to PriorityPay so your percentage split routes money there automatically.",
  },
  {
    q: "What accounts and apps can I connect?",
    a: "Any US bank or credit union checking or savings account through Plaid — including all the major banks and roughly 12,000 smaller banks and credit unions, plus Venmo, PayPal, and Cash App directly.",
  },
  {
    q: "Does PriorityPay manage or invest my money?",
    a: "No. PriorityPay only moves money between accounts you already own and control. It is not a bank, broker-dealer, or investment adviser, and never holds or invests your funds. You stay in control of every account.",
  },
  {
    q: "Can I change my percentages later?",
    a: "Anytime, from Split Rules in your dashboard. Add or remove categories, adjust any percentage, and reconnect accounts whenever your income or goals change.",
  },
  {
    q: "Is my identity and money movement secure?",
    a: "Yes. PriorityPay verifies your identity before any money can move, and all account connections and transfers run through Plaid and Dwolla, the same infrastructure trusted by banks and other financial apps.",
  },
];

// ---- small helpers ----

function Reveal({ children, style, as: Tag = "div" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.95) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : "translateY(18px)",
        transition: "opacity 700ms ease, transform 700ms cubic-bezier(.2,.7,.2,1)",
      }}
    >
      {children}
    </Tag>
  );
}

function Btn({ href, variant, style, children }) {
  return (
    <Link href={href} className={`pp-btn pp-btn-${variant}`} style={style}>
      {children}
    </Link>
  );
}

export default function Homepage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div style={TOKENS}>
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
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              textDecoration: "none",
              color: "var(--color-text)",
            }}
          >
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 22, letterSpacing: "0.01em" }}>
              Priority
            </span>
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 22,
                fontStyle: "italic",
                color: "var(--color-accent-700)",
                marginLeft: -9,
              }}
            >
              Pay
            </span>
            <span style={{ width: 26, height: 1, background: "var(--color-accent)", marginBottom: 6 }} />
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Btn href="/login" variant="ghost">Log in</Btn>
            <Btn href="/signup" variant="primary">Get started</Btn>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(44px, 8vw, 96px) clamp(18px, 4vw, 40px) clamp(48px, 7vw, 80px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))",
          gap: "clamp(40px, 5vw, 72px)",
          alignItems: "start",
        }}
      >
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: 12,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--color-accent-700)",
                fontVariantNumeric: "lining-nums tabular-nums",
              }}
            >
              Built for the self-employed
            </span>
          </div>
          <h1
            style={{
              fontSize: "clamp(34px, 6.4vw, 62px)",
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              margin: "0 0 28px",
            }}
          >
            Automatically route income to investments and savings.
            <span style={{ fontStyle: "italic", color: "var(--color-accent-700)" }}> Before you spend it.</span>
          </h1>
          <p
            style={{
              fontSize: 18,
              lineHeight: 1.65,
              maxWidth: "30em",
              color: "color-mix(in srgb, var(--color-text) 78%, transparent)",
              margin: "0 0 32px",
            }}
          >
            PriorityPay splits every deposit the moment it lands, setting aside a percentage for retirement,
            savings, and taxes automatically.{" "}
            <em style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: 20 }}>
              Spend the rest, guilt free.
            </em>
          </p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 32 }}>
            <Btn href="/signup" variant="primary" style={{ fontSize: 15, padding: "14px 26px" }}>
              Get started free
            </Btn>
            <Btn href="/login" variant="secondary" style={{ fontSize: 15, padding: "14px 26px" }}>
              Log in
            </Btn>
          </div>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              maxWidth: "34em",
              color: "color-mix(in srgb, var(--color-text) 52%, transparent)",
              borderLeft: "1px solid var(--color-divider)",
              paddingLeft: 16,
              margin: 0,
            }}
          >
            PriorityPay moves money between the accounts you connect. It doesn&apos;t manage or invest your money
            for you. You stay in control of every account.
          </p>
        </Reveal>

        <Reveal style={{ position: "relative" }}>
          <div
            style={{
              background: "var(--color-neutral-100)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid var(--color-divider)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 12,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "color-mix(in srgb, var(--color-text) 55%, transparent)",
                }}
              >
                Deposit received
              </span>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  color: "var(--color-accent-700)",
                  fontVariantNumeric: "lining-nums tabular-nums",
                }}
              >
                Today, 9:14 AM
              </span>
            </div>
            <div
              style={{
                padding: "26px 22px",
                borderBottom: "1px solid var(--color-divider)",
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "clamp(34px, 7vw, 46px)",
                    lineHeight: 1,
                    fontVariantNumeric: "lining-nums tabular-nums",
                  }}
                >
                  $4,200
                  <span style={{ fontSize: 24, color: "color-mix(in srgb, var(--color-text) 45%, transparent)" }}>
                    .00
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 8, color: "color-mix(in srgb, var(--color-text) 60%, transparent)" }}>
                  Client payment · Bridgeway Studio
                </div>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 11,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--color-accent-700)",
                  border: "1px solid var(--color-accent)",
                  borderRadius: 999,
                  padding: "5px 12px",
                }}
              >
                Split
              </span>
            </div>
            <div style={{ padding: "8px 22px 4px" }}>
              {SPLIT_ROWS.map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto auto",
                    alignItems: "center",
                    gap: 16,
                    padding: "13px 0",
                    borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{row.name}</span>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 13,
                      color: "var(--color-accent-700)",
                      fontVariantNumeric: "lining-nums tabular-nums",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {row.pct}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 16,
                      fontVariantNumeric: "lining-nums tabular-nums",
                      minWidth: 74,
                      textAlign: "right",
                    }}
                  >
                    {row.amt}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                padding: "18px 22px 22px",
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                background: "color-mix(in srgb, var(--color-accent) 7%, transparent)",
              }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                Left to spend
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontVariantNumeric: "lining-nums tabular-nums" }}>
                $2,310.00
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* FINANCIAL ACCOUNTABILITY / 3 STEPS WITH ILLUSTRATIONS */}
      <section
        style={{
          borderTop: "1px solid var(--color-divider)",
          borderBottom: "1px solid var(--color-divider)",
          background: "var(--color-neutral-100)",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(52px, 8vw, 84px) clamp(18px, 4vw, 40px)" }}>
          <Reveal style={{ maxWidth: "40em", marginBottom: "clamp(40px, 5vw, 64px)" }}>
            <h2 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 400, lineHeight: 1.08, margin: "0 0 12px" }}>
              Financial accountability, on autopilot
            </h2>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontStyle: "italic", color: "var(--color-accent-700)", margin: 0 }}>
              Never remind yourself to save again.
            </p>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 270px), 1fr))", gap: "44px 0" }}>
            <Reveal style={{ padding: "0 clamp(20px, 3vw, 40px)", borderLeft: "1px solid var(--color-divider)" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, letterSpacing: "0.1em", color: "var(--color-accent)", fontVariantNumeric: "lining-nums tabular-nums", marginBottom: 22 }}>
                01
              </div>
              <svg viewBox="0 0 260 150" style={{ width: "100%", maxWidth: 280, height: "auto", marginBottom: 26, display: "block" }} fill="none">
                <circle cx="40" cy="8" r="2.5" fill="var(--color-accent)" />
                <path d="M40 10 V26" stroke="var(--color-accent)" strokeWidth="1" />
                <path d="M34 20 L40 28 L46 20" stroke="var(--color-accent)" strokeWidth="1" />
                <text x="54" y="16" fontFamily="Cormorant Garamond, serif" fontSize="11" fill="var(--color-accent-700)" letterSpacing="0.6">Client payment arrives</text>
                <rect x="6" y="32" width="248" height="112" rx="3" stroke="var(--color-neutral-400)" strokeWidth="1" fill="var(--color-neutral-100)" />
                <text x="20" y="52" fontFamily="Cormorant Garamond, serif" fontSize="10.5" fill="var(--color-neutral-600)" letterSpacing="1.6">CHECKING · · · · 4412</text>
                <path d="M6 60 H254" stroke="var(--color-divider)" strokeWidth="1" />
                <rect x="6" y="60" width="248" height="30" fill="var(--color-accent-100)" />
                <text x="20" y="79" fontFamily="Lora, serif" fontSize="11.5" fill="var(--color-text)">Deposit · Bridgeway Studio</text>
                <text x="240" y="79" textAnchor="end" fontFamily="Cormorant Garamond, serif" fontSize="14" fill="var(--color-accent-700)">+$4,200.00</text>
                <path d="M6 90 H254" stroke="var(--color-divider)" strokeWidth="1" />
                <text x="20" y="108" fontFamily="Lora, serif" fontSize="11.5" fill="var(--color-neutral-600)">Invoice 118 · Venmo</text>
                <text x="240" y="108" textAnchor="end" fontFamily="Cormorant Garamond, serif" fontSize="12" fill="var(--color-neutral-600)">+$860.00</text>
                <path d="M20 118 H240" stroke="var(--color-divider)" strokeWidth="1" />
                <text x="20" y="136" fontFamily="Cormorant Garamond, serif" fontSize="10.5" fill="var(--color-neutral-600)" letterSpacing="1.4">BALANCE</text>
                <text x="240" y="137" textAnchor="end" fontFamily="Cormorant Garamond, serif" fontSize="17" fill="var(--color-text)">$6,120.00</text>
              </svg>
              <h3 style={{ fontSize: "clamp(22px, 3.8vw, 26px)", fontWeight: 400, lineHeight: 1.14, margin: "0 0 14px" }}>A deposit lands</h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: 0 }}>
                Client payment, Venmo, Cash App, PayPal, a check you deposited. Any money hitting a connected
                account triggers PriorityPay.
              </p>
            </Reveal>

            <Reveal style={{ padding: "0 clamp(20px, 3vw, 40px)", borderLeft: "1px solid var(--color-divider)" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, letterSpacing: "0.1em", color: "var(--color-accent)", fontVariantNumeric: "lining-nums tabular-nums", marginBottom: 22 }}>
                02
              </div>
              <svg viewBox="0 0 260 150" style={{ width: "100%", maxWidth: 280, height: "auto", marginBottom: 26, display: "block" }} fill="none">
                <text x="130" y="18" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="21" fill="var(--color-text)">$4,200</text>
                <text x="130" y="31" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="10" fill="var(--color-neutral-600)" letterSpacing="1.5">SPLIT ON ARRIVAL · 45%</text>
                <path d="M130 36 V44" stroke="var(--color-accent)" strokeWidth="1" />
                <path d="M39 44 H221" stroke="var(--color-accent-300)" strokeWidth="1" />
                <path d="M39 44 V56 M99 44 V56 M159 44 V56 M219 44 V56" stroke="var(--color-neutral-400)" strokeWidth="1" />
                <rect x="16" y="56" width="46" height="62" stroke="var(--color-neutral-400)" strokeWidth="1" />
                <rect x="17" y="79" width="44" height="38" fill="var(--color-accent-200)" />
                <text x="39" y="97" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="13" fill="var(--color-accent-800)">15%</text>
                <rect x="76" y="56" width="46" height="62" stroke="var(--color-neutral-400)" strokeWidth="1" />
                <rect x="77" y="92" width="44" height="25" fill="var(--color-accent-200)" />
                <text x="99" y="108" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="13" fill="var(--color-accent-800)">10%</text>
                <rect x="136" y="56" width="46" height="62" stroke="var(--color-neutral-400)" strokeWidth="1" />
                <rect x="137" y="92" width="44" height="25" fill="var(--color-accent-200)" />
                <text x="159" y="108" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="13" fill="var(--color-accent-800)">10%</text>
                <rect x="196" y="56" width="46" height="62" stroke="var(--color-neutral-400)" strokeWidth="1" />
                <rect x="197" y="92" width="44" height="25" fill="var(--color-accent-200)" />
                <text x="219" y="108" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="13" fill="var(--color-accent-800)">10%</text>
                <path d="M16 118 H242" stroke="var(--color-text)" strokeWidth="1" />
                <text x="39" y="133" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="12" fill="var(--color-neutral-700)">Retirement</text>
                <text x="99" y="133" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="12" fill="var(--color-neutral-700)">Investments</text>
                <text x="159" y="133" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="12" fill="var(--color-neutral-700)">Savings</text>
                <text x="219" y="133" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="12" fill="var(--color-neutral-700)">Tax</text>
                <text x="219" y="144" textAnchor="middle" fontFamily="Cormorant Garamond, serif" fontSize="12" fill="var(--color-neutral-700)">Reserve</text>
              </svg>
              <h3 style={{ fontSize: "clamp(22px, 3.8vw, 26px)", fontWeight: 400, lineHeight: 1.14, margin: "0 0 14px" }}>
                Deposit is split by percentages you set
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: 0 }}>
                PriorityPay automatically routes a percentage of every deposit to retirement, savings, taxes, and
                any other accounts you wish. You choose the percentage for each account.
              </p>
            </Reveal>

            <Reveal style={{ padding: "0 clamp(20px, 3vw, 40px)", borderLeft: "1px solid var(--color-divider)" }}>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, letterSpacing: "0.1em", color: "var(--color-accent)", fontVariantNumeric: "lining-nums tabular-nums", marginBottom: 22 }}>
                03
              </div>
              <svg viewBox="0 0 260 150" style={{ width: "100%", maxWidth: 280, height: "auto", marginBottom: 26, display: "block" }} fill="none">
                <rect x="6" y="14" width="248" height="122" rx="3" stroke="var(--color-neutral-400)" strokeWidth="1" fill="var(--color-neutral-100)" />
                <text x="20" y="34" fontFamily="Cormorant Garamond, serif" fontSize="10.5" fill="var(--color-neutral-600)" letterSpacing="1.6">CHECKING · · · · 4412</text>
                <g>
                  <rect x="176" y="22" width="64" height="17" rx="8.5" stroke="var(--color-accent)" strokeWidth="1" />
                  <path d="M187 30.5 L190 34 L196 27" stroke="var(--color-accent)" strokeWidth="1.2" />
                  <text x="201" y="34" fontFamily="Cormorant Garamond, serif" fontSize="10" fill="var(--color-accent-700)" letterSpacing="1.1">SPLIT</text>
                </g>
                <path d="M6 46 H254" stroke="var(--color-divider)" strokeWidth="1" />
                <text x="20" y="66" fontFamily="Cormorant Garamond, serif" fontSize="10.5" fill="var(--color-neutral-600)" letterSpacing="1.5">AVAILABLE TO SPEND</text>
                <text x="20" y="99" fontFamily="Cormorant Garamond, serif" fontSize="32" fill="var(--color-text)">$2,310.00</text>
                <path d="M20 110 H240" stroke="var(--color-accent-300)" strokeWidth="1" />
                <text x="20" y="127" fontFamily="Lora, serif" fontSize="11" fill="var(--color-neutral-700)">Savings, taxes &amp; retirement</text>
                <text x="240" y="127" textAnchor="end" fontFamily="Cormorant Garamond, serif" fontSize="12.5" fill="var(--color-accent-700)">already set aside</text>
              </svg>
              <h3 style={{ fontSize: "clamp(22px, 3.8vw, 26px)", fontWeight: 400, lineHeight: 1.14, margin: "0 0 14px" }}>
                Spend what&apos;s left. Guilt free.
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: 0 }}>
                Never wonder if you can afford to splurge this weekend. If the money is in checking? Spend it.
                Guilt free.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* DASHBOARD (dark) */}
      <section style={{ background: "#171614", color: "#f3f2f2" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "clamp(60px, 9vw, 100px) clamp(18px, 4vw, 40px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "clamp(44px, 5vw, 80px)",
            alignItems: "center",
          }}
        >
          <Reveal>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
              <span style={{ width: 34, height: 1, background: "var(--color-accent-400)" }} />
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-400)" }}>
                The dashboard
              </span>
            </div>
            <h2 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 400, lineHeight: 1.08, margin: "0 0 24px", color: "#f8f4f4" }}>
              The only app you&apos;ll actually enjoy opening
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, #f3f2f2 68%, transparent)", margin: "0 0 16px", maxWidth: "34em" }}>
              Most platforms show what you owe, overspend, and should have done.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, #f3f2f2 68%, transparent)", margin: "0 0 34px", maxWidth: "34em" }}>
              PriorityPay just shows you what you&apos;ve already, effortlessly, saved. No budgeting homework, no
              guilt trip. Just a running total of the retirement, tax, and savings progress that happened
              automatically while you were busy running your business.
            </p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0 }}>
              {BENEFITS.map((b) => (
                <li
                  key={b.n}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr",
                    gap: 14,
                    padding: "15px 0",
                    borderTop: "1px solid color-mix(in srgb, #f3f2f2 16%, transparent)",
                    fontSize: 15,
                    color: "color-mix(in srgb, #f3f2f2 88%, transparent)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, color: "var(--color-accent-400)", fontVariantNumeric: "lining-nums tabular-nums", paddingTop: 4 }}>
                    {b.n}
                  </span>
                  <span>{b.text}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal>
            <div
              style={{
                border: "1px solid color-mix(in srgb, #f3f2f2 20%, transparent)",
                borderRadius: "var(--radius-lg)",
                padding: "34px 30px",
                background: "color-mix(in srgb, #f3f2f2 4%, transparent)",
              }}
            >
              <div style={{ fontFamily: "var(--font-heading)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "color-mix(in srgb, #f3f2f2 55%, transparent)", marginBottom: 14 }}>
                Total saved since joining
              </div>
              <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(44px, 9vw, 66px)", lineHeight: 1, fontWeight: 400, color: "var(--color-accent-300)", fontVariantNumeric: "lining-nums tabular-nums", letterSpacing: "-0.02em" }}>
                $34,218
              </div>
              <div style={{ height: 1, background: "color-mix(in srgb, #f3f2f2 18%, transparent)", margin: "30px 0 6px" }} />
              {BUCKETS.map((bk) => (
                <div
                  key={bk.name}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: "1px solid color-mix(in srgb, #f3f2f2 12%, transparent)",
                  }}
                >
                  <span style={{ fontSize: 14, color: "color-mix(in srgb, #f3f2f2 80%, transparent)" }}>{bk.name}</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 19, fontVariantNumeric: "lining-nums tabular-nums" }}>{bk.amt}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* GETTING STARTED / 3 ONBOARDING STEPS */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(60px, 9vw, 100px) clamp(18px, 4vw, 40px) 40px" }}>
        <Reveal
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px 40px",
            borderBottom: "1px solid var(--color-divider)",
            paddingBottom: 22,
            marginBottom: "clamp(44px, 6vw, 72px)",
          }}
        >
          <h2 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 400, margin: 0 }}>Getting started</h2>
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 13, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-accent-700)", fontVariantNumeric: "lining-nums tabular-nums" }}>
            3 simple onboarding steps
          </span>
        </Reveal>

        {/* step 1 */}
        <Reveal
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "clamp(36px, 4vw, 64px)",
            alignItems: "center",
            marginBottom: "clamp(56px, 7vw, 90px)",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(50px, 8vw, 72px)", lineHeight: 0.9, color: "var(--color-accent-200)", fontVariantNumeric: "lining-nums tabular-nums", marginBottom: 10 }}>
              1
            </div>
            <h3 style={{ fontSize: "clamp(24px, 4.2vw, 30px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px" }}>
              Connect how you actually get paid
            </h3>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: 0 }}>
              Connect all of your income-receiving accounts and apps so that every deposit is accounted for. We
              connect with over 12,000 banks and credit unions as well as your favorite apps like Venmo, PayPal,
              and Cash App.
            </p>
          </div>
          <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", background: "var(--color-neutral-100)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "15px 24px", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 11.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
                Income sources connected
              </span>
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-accent-700)", fontVariantNumeric: "lining-nums tabular-nums" }}>
                6 of 6
              </span>
            </div>
            <div style={{ padding: "4px 24px 0" }}>
              {INSTITUTIONS.map((i) => (
                <div
                  key={i.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 20,
                    padding: "15px 0",
                    borderBottom: "1px solid color-mix(in srgb, var(--color-text) 8%, transparent)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>{i.name}</span>
                    <span style={{ fontSize: 12.5, color: "color-mix(in srgb, var(--color-text) 52%, transparent)" }}>{i.kind}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-heading)", fontSize: 11.5, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)" }} />
                    Linked
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "16px 24px", background: "color-mix(in srgb, var(--color-accent) 7%, transparent)", fontFamily: "var(--font-heading)", fontSize: 14, fontStyle: "italic", color: "var(--color-accent-700)", fontVariantNumeric: "lining-nums tabular-nums" }}>
              + 12,000 more banks &amp; credit unions available
            </div>
          </div>
        </Reveal>

        {/* step 2 */}
        <Reveal
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "clamp(36px, 4vw, 64px)",
            alignItems: "center",
            marginBottom: "clamp(56px, 7vw, 90px)",
          }}
        >
          <div style={{ order: 2 }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(50px, 8vw, 72px)", lineHeight: 0.9, color: "var(--color-accent-200)", fontVariantNumeric: "lining-nums tabular-nums", marginBottom: 10 }}>
              2
            </div>
            <h3 style={{ fontSize: "clamp(24px, 4.2vw, 30px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px" }}>
              Set your percentages
            </h3>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: 0 }}>
              We start you off with seven buckets built for self-employed income — Solo 401k, SEP IRA,
              Investments, Tax Reserve, Emergency Fund, business expenses (OPEX), and Savings. Don&apos;t need
              one? Remove it. Want more? Add your own.
            </p>
          </div>
          <div style={{ order: 1, border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", background: "var(--color-neutral-100)", padding: "10px 28px 18px", boxShadow: "var(--shadow-sm)" }}>
            {PERCENTAGES.map((p) => (
              <div
                key={p.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr minmax(50px, 120px) 52px",
                  alignItems: "center",
                  gap: 18,
                  padding: "16px 0",
                  borderBottom: "1px solid color-mix(in srgb, var(--color-text) 9%, transparent)",
                }}
              >
                <span style={{ fontSize: 15 }}>{p.name}</span>
                <span style={{ height: 3, background: "color-mix(in srgb, var(--color-text) 9%, transparent)", position: "relative", borderRadius: 2 }}>
                  <span style={{ position: "absolute", inset: "0 auto 0 0", background: "var(--color-accent)", borderRadius: 2, width: p.bar }} />
                </span>
                <span style={{ fontFamily: "var(--font-heading)", fontSize: 17, textAlign: "right", fontVariantNumeric: "lining-nums tabular-nums" }}>
                  {p.pct}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* step 3 */}
        <Reveal
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: "clamp(36px, 4vw, 64px)",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(50px, 8vw, 72px)", lineHeight: 0.9, color: "var(--color-accent-200)", fontVariantNumeric: "lining-nums tabular-nums", marginBottom: 10 }}>
              3
            </div>
            <h3 style={{ fontSize: "clamp(24px, 4.2vw, 30px)", fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px" }}>
              Spend the rest, guilt free
            </h3>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: 0 }}>
              That&apos;s it. From here, every future deposit gets split automatically the moment it lands.
              Whatever&apos;s sitting in checking is yours to spend, guilt free.
            </p>
          </div>
          <div style={{ border: "1px solid var(--color-accent-300)", borderRadius: "var(--radius-lg)", padding: "46px 40px", background: "color-mix(in srgb, var(--color-accent) 6%, transparent)", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--color-accent-700)", marginBottom: 16 }}>
              Available to spend
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(52px, 10vw, 76px)", lineHeight: 1, fontVariantNumeric: "lining-nums tabular-nums", letterSpacing: "-0.02em" }}>
              $1,842
            </div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontStyle: "italic", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", marginTop: 14 }}>
              already split &amp; saved this month
            </div>
          </div>
        </Reveal>
      </section>

      {/* BANK MARQUEE */}
      <section style={{ padding: "70px 0 0", overflow: "hidden" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto 22px", padding: "0 clamp(18px, 4vw, 40px)", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)", whiteSpace: "nowrap", fontVariantNumeric: "lining-nums tabular-nums" }}>
            12,000+ banks &amp; credit unions
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        </div>
        <div style={{ borderTop: "1px solid var(--color-divider)", borderBottom: "1px solid var(--color-divider)", padding: "20px 0", background: "var(--color-neutral-100)" }}>
          <div className="pp-marquee-track" style={{ display: "flex", width: "max-content", gap: 0 }}>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, idx) => (
              <span
                key={idx}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: 17,
                  letterSpacing: "0.02em",
                  color: "color-mix(in srgb, var(--color-text) 62%, transparent)",
                  padding: "0 30px",
                  borderRight: "1px solid var(--color-divider)",
                  whiteSpace: "nowrap",
                }}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* MONTH CLOSE-OUT */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(60px, 9vw, 96px) clamp(18px, 4vw, 40px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "clamp(40px, 5vw, 72px)",
          alignItems: "center",
        }}
      >
        <Reveal>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{ width: 34, height: 1, background: "var(--color-accent)" }} />
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              Month close-out
            </span>
          </div>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 44px)", fontWeight: 400, lineHeight: 1.08, margin: "0 0 22px" }}>
            Taxes, almost done before you start them.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: "0 0 16px" }}>
            At the end of every month, you already know what was income, what was an expense, and where it came
            from.
          </p>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 76%, transparent)", margin: 0 }}>
            PriorityPay&apos;s Month Close-Out walks you through confirming each transaction once, then uses it to
            recommend exactly how much to send to your Tax Reserve and retirement accounts. Have W2 income? No
            problem, we&apos;ll separate it out automatically.
          </p>
        </Reveal>
        <Reveal>
          <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", background: "var(--color-neutral-100)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ padding: "16px 26px", borderBottom: "1px solid var(--color-divider)", fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", fontVariantNumeric: "lining-nums tabular-nums" }}>
              Monthly Close Out — July 2026
            </div>
            <div style={{ padding: "12px 26px 4px" }}>
              {CLOSEOUT_ROWS.map((c) => (
                <div
                  key={c.label}
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    padding: "15px 0",
                    borderBottom: "1px solid color-mix(in srgb, var(--color-text) 9%, transparent)",
                  }}
                >
                  <span style={{ fontSize: 15 }}>{c.label}</span>
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 19, fontVariantNumeric: "lining-nums tabular-nums" }}>{c.value}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "18px 26px", background: "color-mix(in srgb, var(--color-accent) 7%, transparent)", fontSize: 13.5, lineHeight: 1.6, color: "color-mix(in srgb, var(--color-text) 72%, transparent)", fontStyle: "italic", fontFamily: "var(--font-heading)" }}>
              Calculate your Solo 401k and SEP IRA contributions effortlessly inside the dashboard.
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section style={{ borderTop: "1px solid var(--color-divider)", background: "var(--color-neutral-100)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(56px, 8vw, 90px) clamp(18px, 4vw, 40px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "clamp(32px, 4vw, 64px)" }}>
          <Reveal>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
              Questions
            </span>
            <h2 style={{ fontSize: "clamp(30px, 5vw, 40px)", fontWeight: 400, lineHeight: 1.08, margin: "14px 0 0" }}>
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal style={{ borderTop: "1px solid var(--color-divider)" }}>
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                  <button
                    onClick={() => setOpenFaq(open ? -1 : i)}
                    className="pp-faq-btn"
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 24,
                      background: "transparent",
                      border: 0,
                      padding: "22px 0",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "var(--font-heading)",
                      fontSize: "clamp(18px, 3.4vw, 21px)",
                      color: "var(--color-text)",
                    }}
                  >
                    <span>{f.q}</span>
                    <span style={{ fontSize: 22, color: "var(--color-accent)", lineHeight: 1 }}>{open ? "−" : "+"}</span>
                  </button>
                  <div className="pp-faq-panel" style={{ maxHeight: open ? 760 : 0 }}>
                    <p style={{ fontSize: 15, lineHeight: 1.75, color: "color-mix(in srgb, var(--color-text) 74%, transparent)", margin: "0 0 26px", maxWidth: "44em" }}>
                      {f.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA (dark) */}
      <section style={{ background: "#171614", color: "#f3f2f2" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(72px, 11vw, 120px) clamp(18px, 4vw, 40px)", textAlign: "center" }}>
          <Reveal as="div">
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 56, lineHeight: 1, color: "color-mix(in srgb, var(--color-accent) 34%, transparent)", display: "block", margin: "0 0 28px" }}>
              §
            </span>
            <h2 style={{ fontSize: "clamp(30px, 6vw, 50px)", fontWeight: 400, lineHeight: 1.08, margin: "0 0 22px", color: "#f8f4f4" }}>
              Stop reacting to your finances. Take an effortless, proactive approach.
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: "color-mix(in srgb, #f3f2f2 65%, transparent)", maxWidth: "34em", margin: "0 auto 36px" }}>
              Set your percentages once. Every deposit after that is routed to savings and investments
              automatically.
            </p>
            <Btn href="/signup" variant="primary" style={{ fontSize: 16, padding: "16px 34px", color: "var(--color-accent-300)", borderColor: "var(--color-accent-400)" }}>
              Get started free
            </Btn>
          </Reveal>
        </div>
      </section>

      <footer style={{ background: "#171614", color: "color-mix(in srgb, #f3f2f2 55%, transparent)", borderTop: "1px solid color-mix(in srgb, #f3f2f2 14%, transparent)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(18px, 4vw, 40px)", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "22px 48px", alignItems: "start" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 1, color: "#f3f2f2" }}>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>Priority</span>
            <span style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontStyle: "italic", color: "var(--color-accent-400)" }}>Pay</span>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, margin: 0, maxWidth: "60em" }}>
            PriorityPay routes money between accounts you connect and control. It is not a bank, broker-dealer,
            or investment adviser, and does not hold or invest your funds.
          </p>
        </div>
      </footer>

      <style jsx>{`
        a {
          color: var(--color-accent-700);
          text-decoration: none;
        }
        a:hover {
          color: var(--color-accent-600);
        }
        ::selection {
          background: color-mix(in srgb, var(--color-accent) 30%, transparent);
        }
        .pp-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          text-decoration: none;
          font-family: var(--font-heading);
          font-weight: 600;
          font-size: 14px;
          line-height: 1.2;
          color: var(--color-text);
          background: transparent;
          border: 1px solid transparent;
          padding: 9.2px 16.6px;
          border-radius: var(--radius-md);
        }
        .pp-btn-primary {
          color: var(--color-accent);
          border-color: var(--color-accent);
        }
        .pp-btn-primary:hover {
          background: color-mix(in srgb, var(--color-accent) 12%, transparent);
        }
        .pp-btn-secondary {
          border-color: var(--color-divider);
        }
        .pp-btn-secondary:hover {
          background: color-mix(in srgb, var(--color-text) 7%, transparent);
        }
        .pp-btn-ghost {
          color: var(--color-accent);
          padding-left: 4.6px;
          padding-right: 4.6px;
        }
        .pp-btn-ghost:hover {
          background: color-mix(in srgb, var(--color-accent) 10%, transparent);
        }
        .pp-faq-btn:hover {
          color: var(--color-accent-700);
        }
        .pp-faq-panel {
          overflow: hidden;
          transition: max-height 320ms ease;
        }
        .pp-marquee-track {
          animation: pp-marquee 46s linear infinite;
        }
        @keyframes pp-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
