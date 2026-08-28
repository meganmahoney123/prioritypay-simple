"use client";

import { useEffect, useRef, useState } from "react";
import Btn from "./PublicBtn";
import PublicHeader from "./PublicHeader";
import PublicFooter from "./PublicFooter";
// Design: "Bloom" (working name) — the purple, card-based redesign Megan
// built in Claude Design (Aug 25 2026), exported as static HTML and ported
// here 1:1, replacing the earlier "Ledger" concept. Colors/spacing/type
// below are the design's actual tokens (see the exported .dc.html), not
// approximations. Content (copy, data, FAQ answers, hrefs) is UNCHANGED
// from the previous version -- only the visual layer moved. PublicHeader
// and PublicFooter are shared across every public page (calculators, blog,
// etc.) and were intentionally left alone: PublicHeader reads these same
// --color-*/--font-* tokens so it re-themes automatically here, but
// PublicFooter hardcodes its own dark colors on purpose (see its own
// comment) so every public page gets an identical footer regardless of
// which page's TOKENS are active -- changing it would re-theme every
// calculator/blog page too, not just this one.
const TOKENS = {
  "--color-bg": "#FAF7FD",
  "--color-surface": "#FFFFFF",
  "--color-text": "#241634",
  "--color-accent": "#6D3BE0",
  "--color-accent-2": "#4E22B8",
  "--color-divider": "#EFE7FA",

  "--color-neutral-100": "#FAF7FD",
  "--color-neutral-200": "#F4EEFF",
  "--color-neutral-300": "#EFE7FA",
  "--color-neutral-400": "#D8C9F5",
  "--color-neutral-500": "#B69EE8",

  "--color-accent-100": "#F4EEFF",
  "--color-accent-200": "#EDE6FF",
  "--color-accent-300": "#C4A9FA",
  "--color-accent-400": "#9A72F0",
  "--color-accent-700": "#4E22B8",
  "--color-accent-900": "#3B1C7A",

  "--radius-sm": "10px",
  "--radius-md": "18px",
  "--radius-lg": "28px",
  "--radius-pill": "999px",

  "--shadow-sm": "0 10px 24px -14px rgba(52,26,102,0.22)",
  "--shadow-md": "0 30px 60px -30px rgba(52,26,102,0.3)",
  "--shadow-lg": "0 40px 80px -30px rgba(52,26,102,0.32)",

  "--font-heading": "Figtree, Helvetica, Arial, sans-serif",
  "--font-body": "Figtree, Helvetica, Arial, sans-serif",
  "--font-mono": "'IBM Plex Mono', monospace",

  fontFamily: "var(--font-body)",
  color: "var(--color-text)",
  background: "var(--color-bg)",
  overflowX: "hidden",
  WebkitFontSmoothing: "antialiased",
};

// ---- content (identical to the previous design + lib/allocations.js defaults) ----

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
  { name: "Solo 401k", amt: "$11,240", pct: 100 },
  { name: "Tax Reserve", amt: "$8,905", pct: 79 },
  { name: "Emergency Fund", amt: "$6,110", pct: 54 },
  { name: "Investments", amt: "$7,963", pct: 71 },
];

const INSTITUTIONS = [
  { name: "Capital One", kind: "Business checking" },
  { name: "Ally Bank", kind: "Savings" },
  { name: "Chime", kind: "Personal checking" },
  { name: "Chase", kind: "Business checking" },
  { name: "Bank of America", kind: "Personal checking" },
  { name: "Wells Fargo", kind: "Savings" },
];

const PERCENTAGES = [
  { name: "Solo 401k", pct: "10%", width: "50%" },
  { name: "SEP IRA", pct: "5%", width: "25%" },
  { name: "Investments", pct: "10%", width: "50%" },
  { name: "Tax Reserve", pct: "20%", width: "100%" },
  { name: "Emergency Fund", pct: "10%", width: "50%" },
  { name: "OPEX", pct: "10%", width: "50%" },
  { name: "Savings", pct: "10%", width: "50%" },
];

const BANK_NAMES = [
  "Chase", "Bank of America", "Wells Fargo",
  "Capital One", "Citibank", "U.S. Bank", "PNC Bank", "Truist", "Ally Bank",
  "Discover", "American Express", "Chime", "SoFi",
];
const MARQUEE_ITEMS = [...BANK_NAMES, "+ 12,000 more banks & credit unions"];

const CLOSEOUT_ROWS = [
  { label: "Income", value: "$14,220" },
  { label: "Business expenses", value: "$3,110" },
  { label: "W2 income (excluded)", value: "$0" },
];
const NET_INCOME = { label: "Net income this month", value: "$11,110" };

const STRATEGIES = [
  "Solo 401(k) vs. SEP IRA",
  "S-corp election & reasonable salary",
  "Home office & business deductions",
  "HSA & 529 account strategies",
  "QBI (Section 199A) deduction",
];

const FAQS = [
  {
    q: "Who is PriorityPay for?",
    a: "PriorityPay is built primarily for self-employed people, W2 employees with side income, and entrepreneurs to manage their spend more efficiently. You can set rules to route a percentage of each deposit to specific accounts, like savings, tax reserve, investments, retirement, and specific savings like a wedding, a down payment on a house, or college.",
  },
  {
    q: "What accounts can I connect?",
    a: "Any US bank, credit union, or investment/retirement account through Plaid — including all the major banks and roughly 12,000 smaller banks and credit unions.",
  },
  {
    q: "Does PriorityPay manage or invest my money?",
    a: "No. PriorityPay allows you to set percentage rules to send a portion of each deposit to specific accounts. For example, you can set rules to send 10% of each deposit to a tax reserve account, 15% of each deposit to savings, and 15% of each deposit to retirement. However, PriorityPay does not actually touch your money or move it for you. You complete every transfer yourself. PriorityPay is not a bank, broker-dealer, or investment adviser, and never holds, invests, or moves your funds. You stay in control of every account.",
  },
  {
    q: "Can I change my percentages later?",
    a: "Anytime, from Split Rules in your dashboard. Add or remove categories, adjust any percentage, and reconnect accounts whenever your income or goals change.",
  },
  {
    q: "Is my account information secure?",
    a: "Yes. Account connections run through Plaid, the same infrastructure trusted by banks and other financial apps. PriorityPay only ever gets read-only access to balances and transaction data, never the ability to move money. Sensitive account credentials are encrypted (AES-256) before they're stored, and you can turn on two-factor authentication for your PriorityPay account in Settings.",
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

// Pill CTA styling, scoped to just this page via inline style overrides on
// the shared Btn component (rather than editing the global .pp-btn* CSS in
// app/globals.css, which every other public page also uses) -- keeps the
// new rounded/filled look here without changing button shape anywhere
// else on the site.
const PILL_PRIMARY = {
  background: "var(--color-accent)",
  color: "#FFFFFF",
  border: "1px solid var(--color-accent)",
  borderRadius: "var(--radius-pill)",
  padding: "16px 30px",
  fontSize: 16,
  fontWeight: 700,
};
const PILL_SECONDARY = {
  background: "#FFFFFF",
  color: "var(--color-accent-900)",
  border: "1px solid var(--color-divider)",
  borderRadius: "var(--radius-pill)",
  padding: "16px 30px",
  fontSize: 16,
  fontWeight: 700,
};

function Eyebrow({ children }) {
  return (
    <span
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--color-accent)",
      }}
    >
      {children}
    </span>
  );
}

export default function Homepage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div style={TOKENS}>
      <PublicHeader />

      {/* HERO */}
      <section
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "clamp(44px, 8vw, 88px) clamp(18px, 4vw, 40px) clamp(48px, 7vw, 72px)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 330px), 1fr))",
          gap: "clamp(40px, 5vw, 64px)",
          alignItems: "center",
        }}
      >
        <Reveal>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--color-accent-200)",
              color: "var(--color-accent-700)",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "9px 16px",
              borderRadius: "var(--radius-pill)",
            }}
          >
            Built for the self-employed
          </span>
          <h1
            style={{
              fontSize: "clamp(36px, 5.2vw, 60px)",
              lineHeight: 1.04,
              letterSpacing: "-0.03em",
              fontWeight: 800,
              margin: "24px 0 0",
            }}
          >
            Route a % of each deposit to savings and investments.{" "}
            <span style={{ color: "var(--color-accent)" }}>Before you spend it.</span>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#574A68", margin: "22px 0 0", maxWidth: "30em" }}>
            PriorityPay lets you set rules to split each deposit and send it to retirement, savings, investments,
            a tax reserve, or any other goal, like a wedding or college fund.{" "}
            <em style={{ color: "var(--color-text)", fontStyle: "italic" }}>Spend the rest, guilt free.</em>
          </p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 30 }}>
            <Btn href="/signup" variant="primary" style={PILL_PRIMARY}>
              Get started free
            </Btn>
            <Btn href="/login" variant="secondary" style={PILL_SECONDARY}>
              Log in
            </Btn>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#7C6E8C", margin: "24px 0 0", maxWidth: "34em" }}>
            PriorityPay moves money between the accounts you connect. It doesn&apos;t manage or invest your money
            for you. You stay in control of every account.
          </p>
        </Reveal>

        <Reveal>
          <div
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-divider)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-md)",
              padding: 28,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent)" }}>
                Deposit received
              </span>
              <span style={{ fontSize: 13, color: "#6B5E7A", fontFamily: "var(--font-mono)" }}>Today, 9:14 AM</span>
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 14 }}>$4,200.00</div>
            <div style={{ fontSize: 15, color: "#574A68", marginTop: 4 }}>Client payment · Bridgeway Studio</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 18px" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B5E7A" }}>
                Split
              </span>
              <span style={{ flex: 1, height: 1, background: "var(--color-divider)", display: "block" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SPLIT_ROWS.map((row) => (
                <div
                  key={row.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-sm)",
                    padding: "14px 16px",
                  }}
                >
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{row.name}</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--color-accent-700)",
                      background: "var(--color-accent-200)",
                      padding: "5px 10px",
                      borderRadius: "var(--radius-pill)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {row.pct}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 700, width: 70, textAlign: "right", fontFamily: "var(--font-mono)" }}>
                    {row.amt}
                  </span>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 18,
                background: "var(--color-accent-900)",
                color: "#FFFFFF",
                borderRadius: "var(--radius-md)",
                padding: "20px 22px",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, opacity: 0.85 }}>Left to spend</span>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>
                $2,310.00
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* HOW IT WORKS / 3 STEPS */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(52px, 8vw, 84px) clamp(18px, 4vw, 40px)" }}>
        <Reveal style={{ maxWidth: "40em", marginBottom: "clamp(36px, 5vw, 52px)" }}>
          <Eyebrow>How it works</Eyebrow>
          <h2 style={{ fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 8px" }}>
            Financial accountability, on autopilot
          </h2>
          <p style={{ fontSize: 18, color: "#574A68", margin: 0 }}>Never remind yourself to save again.</p>
        </Reveal>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: "var(--color-accent)", width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
              01
            </span>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#6B5E7A", fontFamily: "var(--font-mono)" }}>
                CHECKING · · · · 4412
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 14 }}>
                <span style={{ color: "#574A68" }}>Deposit · Bridgeway Studio</span>
                <span style={{ fontWeight: 700, color: "var(--color-accent-700)", fontFamily: "var(--font-mono)" }}>+$4,200.00</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 14 }}>
                <span style={{ color: "#574A68" }}>Invoice 118</span>
                <span style={{ fontWeight: 700, color: "var(--color-accent-700)", fontFamily: "var(--font-mono)" }}>+$860.00</span>
              </div>
              <div style={{ height: 1, background: "var(--color-divider)", margin: "16px 0 12px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#6B5E7A" }}>BALANCE</span>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "var(--font-mono)" }}>$6,120.00</span>
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>A deposit lands</h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0 }}>
                A client payment, a check you deposited, or cash from a payment app — any money hitting a connected
                account triggers PriorityPay.
              </p>
            </div>
          </Reveal>

          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: "var(--color-accent)", width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
              02
            </span>
            <div style={{ background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-mono)" }}>$4,200</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#6B5E7A" }}>SPLIT ON ARRIVAL · 45%</span>
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 18, height: 14, borderRadius: "var(--radius-pill)", overflow: "hidden", background: "var(--color-divider)" }}>
                <span style={{ flex: 15, background: "var(--color-accent-900)", display: "block" }} />
                <span style={{ flex: 10, background: "var(--color-accent)", display: "block" }} />
                <span style={{ flex: 10, background: "var(--color-accent-400)", display: "block" }} />
                <span style={{ flex: 10, background: "var(--color-accent-300)", display: "block" }} />
                <span style={{ flex: 55, background: "var(--color-divider)", display: "block" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {SPLIT_ROWS.map((row) => (
                  <div key={row.name} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--color-accent)", display: "block" }} />
                    <span style={{ flex: 1, color: "#574A68" }}>{row.name}</span>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{row.pct}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                Deposit is split by percentages you set
              </h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0 }}>
                PriorityPay automatically routes a percentage of every deposit to retirement, savings, taxes, and
                any other accounts you wish. You choose the percentage for each account.
              </p>
            </div>
          </Reveal>

          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 28, display: "flex", flexDirection: "column", gap: 22 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", background: "var(--color-accent)", width: 34, height: 34, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)" }}>
              03
            </span>
            <div style={{ background: "var(--color-accent-900)", color: "#FFFFFF", borderRadius: "var(--radius-md)", padding: "24px 20px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", opacity: 0.6, fontFamily: "var(--font-mono)" }}>
                CHECKING · · · · 4412 — SPLIT
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.75, marginTop: 22 }}>
                Available to spend
              </div>
              <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: "-0.03em", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                $2,310.00
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.75, marginTop: 14 }}>
                Savings, taxes &amp; retirement already set aside
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 10px" }}>
                Spend what&apos;s left. Guilt free.
              </h3>
              <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0 }}>
                Never wonder if you can afford to splurge this weekend. If the money is in checking? Spend it. Guilt
                free.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* DASHBOARD */}
      <section style={{ background: "var(--color-accent-200)", padding: "clamp(60px, 9vw, 88px) 0" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(18px, 4vw, 40px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: "clamp(44px, 5vw, 60px)",
            alignItems: "center",
          }}
        >
          <Reveal>
            <Eyebrow>The dashboard</Eyebrow>
            <h2 style={{ fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 18px" }}>
              The only app you&apos;ll actually enjoy opening
            </h2>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#574A68", margin: "0 0 14px" }}>
              Most platforms show what you owe, overspend, and should have done.
            </p>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "#574A68", margin: "0 0 26px" }}>
              PriorityPay just shows you what you&apos;ve already, effortlessly, saved. No budgeting homework, no
              guilt trip. Just a running total of the retirement, tax, and savings progress that happened
              automatically while you were busy running your business.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {BENEFITS.map((b) => (
                <div key={b.n} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--color-accent-700)",
                      background: "#FFFFFF",
                      borderRadius: 10,
                      padding: "6px 9px",
                      minWidth: 34,
                      textAlign: "center",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {b.n}
                  </span>
                  <span style={{ fontSize: 16.5, lineHeight: 1.5, color: "var(--color-text)", fontWeight: 500 }}>{b.text}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal>
            <div style={{ background: "var(--color-surface)", borderRadius: "var(--radius-lg)", padding: 30, boxShadow: "var(--shadow-md)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B5E7A" }}>
                Total saved since joining
              </div>
              <div style={{ fontSize: "clamp(40px, 6vw, 52px)", fontWeight: 800, letterSpacing: "-0.035em", margin: "8px 0 22px", color: "var(--color-accent-900)", fontFamily: "var(--font-mono)" }}>
                $34,218
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {BUCKETS.map((bk) => (
                  <div key={bk.name} style={{ background: "var(--color-bg)", borderRadius: "var(--radius-sm)", padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{ fontSize: 15, fontWeight: 600 }}>{bk.name}</span>
                      <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{bk.amt}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-divider)", marginTop: 12, overflow: "hidden" }}>
                      <span style={{ display: "block", height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-accent)", width: `${bk.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* GETTING STARTED / 3 ONBOARDING STEPS */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "clamp(60px, 9vw, 88px) clamp(18px, 4vw, 40px)" }}>
        <Reveal style={{ maxWidth: "36em", marginBottom: "clamp(36px, 5vw, 44px)" }}>
          <Eyebrow>Getting started</Eyebrow>
          <h2 style={{ fontSize: "clamp(30px, 4.4vw, 46px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 0" }}>
            3 simple onboarding steps
          </h2>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* step 1 */}
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 34, display: "flex", gap: 44, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 380px", minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", background: "var(--color-accent-200)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)" }}>
                Step 1
              </span>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "18px 0 12px" }}>
                Connect how you actually get paid
              </h3>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
                Connect all of your income-receiving bank accounts so that every deposit is accounted for. We
                connect with over 12,000 banks and credit unions across the US.
              </p>
            </div>
            <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B5E7A" }}>
                  Income sources connected
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", fontFamily: "var(--font-mono)" }}>6 of 6</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {INSTITUTIONS.map((i) => (
                  <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                    <span style={{ width: 30, height: 30, borderRadius: 10, background: "var(--color-accent-200)", display: "block", flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{i.name}</span>
                      <span style={{ display: "block", fontSize: 13, color: "#6B5E7A" }}>{i.kind}</span>
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2F7D5B", background: "#E4F5EC", padding: "5px 10px", borderRadius: "var(--radius-pill)" }}>
                      Linked
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 13, color: "#6B5E7A", marginTop: 14, textAlign: "center" }}>
                + 12,000 more banks &amp; credit unions available
              </div>
            </div>
          </Reveal>

          {/* step 2 */}
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 34, display: "flex", gap: 44, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 380px", minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", background: "var(--color-accent-200)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)" }}>
                Step 2
              </span>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "18px 0 12px" }}>Set your percentages</h3>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
                We start you off with seven buckets built for self-employed income — Solo 401k, SEP IRA,
                Investments, Tax Reserve, Emergency Fund, business expenses (OPEX), and Savings. Don&apos;t need
                one? Remove it. Want more? Add your own.
              </p>
            </div>
            <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {PERCENTAGES.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, background: "#FFFFFF", borderRadius: "var(--radius-sm)", padding: "13px 16px" }}>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                  <span style={{ width: 90, height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-divider)", display: "block", overflow: "hidden" }}>
                    <span style={{ display: "block", height: 6, borderRadius: "var(--radius-pill)", background: "var(--color-accent)", width: p.width }} />
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, width: 44, textAlign: "right", fontFamily: "var(--font-mono)" }}>{p.pct}</span>
                </div>
              ))}
            </div>
          </Reveal>

          {/* step 3 */}
          <Reveal style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-lg)", padding: 34, display: "flex", gap: 44, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: "1 1 380px", minWidth: 280 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-accent-700)", background: "var(--color-accent-200)", padding: "7px 14px", borderRadius: "var(--radius-pill)", fontFamily: "var(--font-mono)" }}>
                Step 3
              </span>
              <h3 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", margin: "18px 0 12px" }}>Spend the rest, guilt free</h3>
              <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
                That&apos;s it. From here, every future deposit gets split automatically the moment it lands.
                Whatever&apos;s sitting in checking is yours to spend, guilt free.
              </p>
            </div>
            <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-accent-900)", color: "#FFFFFF", borderRadius: "var(--radius-md)", padding: 34 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.75 }}>
                Available to spend
              </div>
              <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-0.035em", margin: "8px 0 6px", fontFamily: "var(--font-mono)" }}>
                $1,842
              </div>
              <div style={{ fontSize: 15, opacity: 0.75 }}>already split &amp; saved this month</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BANK MARQUEE */}
      <section style={{ padding: "20px 0 clamp(60px, 9vw, 88px)", overflow: "hidden" }}>
        <div style={{ textAlign: "center", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B5E7A", marginBottom: 26 }}>
          12,000+ banks &amp; credit unions
        </div>
        <div className="pp-marquee-track" style={{ display: "flex", width: "max-content", gap: 12 }}>
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((m, idx) => (
            <span
              key={idx}
              style={{
                display: "block",
                fontSize: 15,
                fontWeight: 600,
                color: "#574A68",
                background: "var(--color-surface)",
                border: "1px solid var(--color-divider)",
                borderRadius: "var(--radius-pill)",
                padding: "13px 22px",
                whiteSpace: "nowrap",
              }}
            >
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* MONTH CLOSE-OUT */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(30px, 4vw, 46px)",
            display: "flex",
            gap: 56,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 280 }}>
            <Eyebrow>Month close-out</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 18px" }}>
              Taxes, almost done before you start them.
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: "0 0 14px" }}>
              At the end of every month, you already know what was income, what was an expense, and where it came
              from.
            </p>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: "#574A68", margin: 0 }}>
              PriorityPay&apos;s Month Close-Out walks you through confirming each transaction once, then uses it
              to recommend exactly how much to send to your Tax Reserve and retirement accounts. Have W2 income? No
              problem, we&apos;ll separate it out automatically.
            </p>
          </div>
          <div style={{ flex: "1 1 340px", minWidth: 280, background: "var(--color-bg)", borderRadius: "var(--radius-md)", padding: 26 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B5E7A" }}>
              Monthly Close Out — July 2026
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 18 }}>
              {CLOSEOUT_ROWS.map((c) => (
                <div key={c.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "13px 0", borderBottom: "1px solid var(--color-divider)" }}>
                  <span style={{ fontSize: 15, color: "#574A68" }}>{c.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{c.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 18, background: "var(--color-accent-200)", borderRadius: "var(--radius-sm)", padding: "18px 20px" }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent-900)" }}>{NET_INCOME.label}</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent-900)", fontFamily: "var(--font-mono)" }}>{NET_INCOME.value}</span>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.5, color: "#6B5E7A", margin: "16px 0 0" }}>
              Calculate your Solo 401k and SEP IRA contributions effortlessly inside the dashboard.
            </p>
          </div>
        </Reveal>
      </section>

      {/* TAX SAVINGS QUIZ TEASER */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal
          style={{
            background: "var(--color-accent-900)",
            color: "#FFFFFF",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(36px, 5vw, 52px) clamp(24px, 4vw, 46px)",
            display: "flex",
            gap: 56,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 420px", minWidth: 280 }}>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-accent-300)" }}>
              Free tool
            </span>
            <h2 style={{ fontSize: "clamp(28px, 3.4vw, 42px)", lineHeight: 1.08, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 16px" }}>
              Not sure what tax strategies apply to you?
            </h2>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, margin: "0 0 28px", opacity: 0.85 }}>
              Take our free 2-minute quiz. Answer a few questions about your income, family, and business setup,
              and get a personalized list of tax strategies worth researching — no account needed.
            </p>
            <Btn href="/tax-savings-quiz" variant="primary" style={{ ...PILL_PRIMARY, background: "#FFFFFF", color: "var(--color-accent-900)", border: "1px solid #FFFFFF" }}>
              Take the free quiz
            </Btn>
          </div>
          <div style={{ flex: "1 1 300px", minWidth: 260 }}>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-accent-300)", marginBottom: 16 }}>
              A few of the strategies covered
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {STRATEGIES.map((s) => (
                <span key={s} style={{ display: "block", fontSize: 15.5, fontWeight: 600, background: "rgba(255,255,255,0.1)", borderRadius: "var(--radius-sm)", padding: "15px 18px" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(60px, 9vw, 88px)" }}>
        <Reveal style={{ textAlign: "center", marginBottom: 36 }}>
          <Eyebrow>Questions</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px, 3.6vw, 40px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "14px 0 0" }}>
            Frequently asked questions
          </h2>
        </Reveal>
        <Reveal style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} style={{ background: "var(--color-surface)", border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <button
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  className="pp-faq-btn"
                  style={{
                    width: "100%",
                    fontFamily: "inherit",
                    textAlign: "left",
                    background: "none",
                    border: 0,
                    padding: "22px 24px",
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    cursor: "pointer",
                    color: "var(--color-text)",
                  }}
                >
                  <span style={{ flex: 1, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>{f.q}</span>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 500,
                      color: "var(--color-accent)",
                      width: 30,
                      height: 30,
                      borderRadius: "var(--radius-pill)",
                      background: "var(--color-accent-100)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {open ? "−" : "+"}
                  </span>
                </button>
                <div className="pp-faq-panel" style={{ maxHeight: open ? 760 : 0 }}>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#574A68", margin: 0, padding: "0 24px 24px" }}>{f.a}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* FINAL CTA */}
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "0 clamp(18px, 4vw, 40px) clamp(72px, 10vw, 96px)" }}>
        <Reveal
          style={{
            background: "var(--color-accent-200)",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(48px, 8vw, 68px) clamp(24px, 5vw, 46px)",
            textAlign: "center",
          }}
        >
          <span style={{ display: "block", fontSize: 26, color: "var(--color-accent)", fontWeight: 700, marginBottom: 14 }}>§</span>
          <h2 style={{ fontSize: "clamp(30px, 4.2vw, 48px)", lineHeight: 1.06, letterSpacing: "-0.03em", fontWeight: 800, margin: "0 auto 18px", maxWidth: "22em" }}>
            Stop reacting to your finances. Take an effortless, proactive approach.
          </h2>
          <p style={{ fontSize: 17, lineHeight: 1.6, color: "#574A68", margin: "0 auto 30px", maxWidth: "34em" }}>
            Set your percentages once. Every deposit after that is routed to savings and investments automatically.
          </p>
          <Btn href="/signup" variant="primary" style={PILL_PRIMARY}>
            Get started free
          </Btn>
        </Reveal>
      </section>

      <PublicFooter />

      <style jsx>{`
        a {
          color: var(--color-accent);
          text-decoration: none;
        }
        a:hover {
          color: var(--color-accent-2);
        }
        ::selection {
          background: color-mix(in srgb, var(--color-accent) 30%, transparent);
        }
        .pp-faq-btn:hover {
          color: var(--color-accent-700);
        }
        .pp-faq-panel {
          overflow: hidden;
          transition: max-height 320ms ease;
        }
        .pp-marquee-track {
          animation: pp-marquee 40s linear infinite;
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
