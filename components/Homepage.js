"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  ClipboardCheck,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react";
import { PrimaryButton, GhostButton } from "./ui";

// Percentages match this project's actual onboarding defaults
// (lib/allocations.js DEFAULT_SPLIT_RULES) so the homepage isn't showing
// numbers the product itself wouldn't suggest.
const DEFAULT_BUCKETS = [
  { label: "Solo 401k", pct: 10, color: "#8b5cf6" },
  { label: "SEP IRA", pct: 5, color: "#ec4899" },
  { label: "Investments", pct: 10, color: "#14b8a6" },
  { label: "Tax Reserve", pct: 20, color: "#a3a3a3" },
  { label: "Emergency Fund", pct: 10, color: "#f59e0b" },
  { label: "OPEX", pct: 10, color: "#7c3aed" },
  { label: "Savings", pct: 10, color: "#ef4444" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "A deposit lands",
    body: "Client payment, Venmo, Cash App, PayPal, a check you deposited. Any money hitting a connected account triggers PriorityPay.",
  },
  {
    step: "02",
    title: "Deposit is split by percentages you set",
    body: "PriorityPay automatically routes a percentage of every deposit to retirement, savings, taxes, and any other accounts you wish. You choose the percentage for each account.",
  },
  {
    step: "03",
    title: "Spend what's left. Guilt free.",
    body: "Never wonder if you can afford to splurge this weekend. If the money is in checking? Spend it. Guilt free.",
  },
];

const FAQS = [
  {
    q: "Who is PriorityPay for?",
    a: "PriorityPay is built for self-employed people -- freelancers, sole proprietors, single-member LLCs, and S-Corps -- along with anyone earning side income, even if you also have a W2 job. If you get paid in a way that doesn't automatically set aside money for taxes and retirement the way a traditional payroll job does, PriorityPay is for you.",
  },
  {
    q: "Do I need to already have a Solo 401k or SEP IRA?",
    a: "Yes. PriorityPay isn't a bank or an investment custodian, so it doesn't open retirement or brokerage accounts for you. You open a Solo 401k, SEP IRA, or investment account with a provider of your choice, then connect it to PriorityPay so your percentage split routes money there automatically.",
  },
  {
    q: "What accounts and apps can I connect?",
    a: "Any US bank or credit union checking or savings account through Plaid -- including all the major banks and roughly 12,000 smaller banks and credit unions -- plus Venmo, PayPal, and Cash App directly. Zelle isn't supported, since it isn't connectable through Plaid.",
  },
  {
    q: "Does PriorityPay manage or invest my money?",
    a: "No. PriorityPay only moves money between accounts you already own and control. It is not a bank, broker-dealer, or investment adviser, and never holds or invests your funds -- you stay in control of every account.",
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

// The three apps have real brand icons available via simpleicons.org's
// public CDN (an SVG-per-request service, widely used for exactly this
// "integrates with" use case). Banks/credit unions render as wordmark
// chips in their brand color instead -- simple-icons doesn't carry
// traditional bank logos, and reproducing them as image assets isn't
// something to do without the genuine artwork. Zelle is deliberately not
// here -- it isn't Plaid-connectable (see Connect Accounts step).
const LOGO_ITEMS = [
  { name: "Venmo", iconSrc: "https://cdn.simpleicons.org/venmo/3D95CE" },
  { name: "PayPal", iconSrc: "https://cdn.simpleicons.org/paypal/0070BA" },
  { name: "Cash App", iconSrc: "https://cdn.simpleicons.org/cashapp/00D632" },
  { name: "Chase", color: "#117ACA" },
  { name: "Bank of America", color: "#012169" },
  { name: "Wells Fargo", color: "#D71E28" },
  { name: "Capital One", color: "#004977" },
  { name: "Citibank", color: "#003B70" },
  { name: "U.S. Bank", color: "#0D3F6E" },
  { name: "PNC Bank", color: "#F58025" },
  { name: "Truist", color: "#582C83" },
  { name: "Ally Bank", color: "#6100FF" },
  { name: "Discover", color: "#FF6000" },
  { name: "American Express", color: "#016FD0" },
  { name: "Chime", color: "#1FD15D" },
  { name: "SoFi", color: "#00A9E0" },
  { name: "+ 12,000 more banks & credit unions", color: "#525252" },
];

function LogoChip({ item }) {
  return (
    <div className="shrink-0 flex items-center gap-2.5 bg-white border border-neutral-200 rounded-2xl px-5 py-3.5 mx-2">
      {item.iconSrc && (
        <img src={item.iconSrc} alt="" width={20} height={20} className="shrink-0" />
      )}
      <span className="text-sm font-bold whitespace-nowrap" style={{ color: item.color || "#171717" }}>
        {item.name}
      </span>
    </div>
  );
}

function StepBadge({ n }) {
  return (
    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-mono font-extrabold text-sm flex items-center justify-center shrink-0">
      {n}
    </div>
  );
}

function OnboardingStepCard({ n, title, body, children }) {
  return (
    <div className="flex flex-col">
      <div className="bg-neutral-50 border border-neutral-200 rounded-2xl card-shadow p-5 sm:p-6 mb-5 flex-1">
        {children}
      </div>
      <div className="flex items-center gap-2.5 mb-2">
        <StepBadge n={n} />
        <h3 className="text-base sm:text-lg font-bold text-neutral-900">{title}</h3>
      </div>
      <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
    </div>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div className="border-b border-neutral-200 py-5">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <span className="text-sm sm:text-base font-bold text-neutral-900">{item.q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-3xl">{item.a}</p>
      )}
    </div>
  );
}

export default function Homepage() {
  const logoTrack = [...LOGO_ITEMS, ...LOGO_ITEMS];
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="min-h-screen bg-[#fafafa] overflow-x-hidden">
      <style>{`
        @keyframes pp-logo-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .pp-logo-track {
          animation: pp-logo-scroll 32s linear infinite;
        }
        .pp-logo-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Nav */}
      <header className="sticky top-0 z-30 bg-[#fafafa]/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
              <Zap size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base sm:text-lg font-bold">PriorityPay</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link href="/login" className="text-xs sm:text-sm font-semibold text-neutral-600 hover:text-neutral-900 px-2 sm:px-3 py-2">
              Log in
            </Link>
            <Link href="/signup">
              <PrimaryButton className="!px-3.5 !py-2 !text-xs sm:!px-4 sm:!text-sm !rounded-xl">Get started</PrimaryButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-5 pt-12 pb-14 md:pt-24 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={13} />
            Built for the self-employed
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] md:leading-[1.05] text-neutral-900">
            Automatically route income to investments and savings.
            <span className="text-emerald-600"> BEFORE you spend it.</span>
          </h1>
          <p className="mt-5 md:mt-6 text-base sm:text-lg md:text-xl text-neutral-600 leading-relaxed">
            PriorityPay splits every deposit the moment it lands, setting aside a percentage for retirement,
            savings, and taxes automatically. Spend the rest, guilt free.
          </p>
          <div className="mt-8 md:mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <PrimaryButton className="!px-6 !py-3 sm:!px-7 sm:!py-3.5 !text-sm sm:!text-base">
                Get started free <ArrowRight size={17} />
              </PrimaryButton>
            </Link>
            <Link href="/login">
              <GhostButton className="!px-6 !py-3 sm:!px-7 sm:!py-3.5 !text-sm sm:!text-base">Log in</GhostButton>
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-400">
            PriorityPay moves money between the accounts you connect. It doesn&apos;t manage or invest your money
            for you. You stay in control of every account.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Financial accountability, on autopilot</h2>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 max-w-2xl mb-10 md:mb-14">
            Never remind yourself to save again.
          </p>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 md:gap-8">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step}>
                <div className="text-3xl font-extrabold text-neutral-200 mb-3 font-mono">{s.step}</div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feel good logging in */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">The only app you'll actually enjoy opening</h2>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Most platforms show what you owe, overspend, and should have done.
            </p>
            <p className="text-neutral-600 leading-relaxed mb-4">
              PriorityPay just shows you what you&apos;ve already, effortlessly, saved. No budgeting homework, no
              guilt trip. Just a running total of the retirement, tax, and savings progress that happened
              automatically while you were busy running your business.
            </p>
            <ul className="space-y-2.5 mt-6">
              {[
                "See total saved across every bucket at a glance",
                "Know your taxes are already set aside before you owe them",
                "Spend what's left without doing mental math first",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-neutral-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-emerald-700" strokeWidth={3} />
                  </div>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl card-shadow p-5 sm:p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Total saved since joining</div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-700 font-mono mb-6">$34,218</div>
            <div className="space-y-3">
              {[
                { label: "Solo 401k", value: "$11,240", color: "#8b5cf6" },
                { label: "Tax Reserve", value: "$8,905", color: "#a3a3a3" },
                { label: "Emergency Fund", value: "$6,110", color: "#f59e0b" },
                { label: "Investments", value: "$7,963", color: "#14b8a6" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-sm font-semibold text-neutral-800">{r.label}</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900 font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3 Simple Onboarding Steps -- card grid, each with a mockup visual on
          top, a heading, and a short description, one row on mobile, three
          across on desktop. */}
      <section className="border-t border-neutral-200 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 pt-14 md:pt-20 pb-2 text-center">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Getting started</h2>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 max-w-2xl mx-auto">
            3 Simple Onboarding Steps
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-10 md:py-14 grid sm:grid-cols-3 gap-10 sm:gap-6 md:gap-8">
          <OnboardingStepCard
            n="1"
            title="Connect how you actually get paid"
            body="Connect all of your income-receiving accounts and apps so that every deposit is accounted for. We connect with over 12,000 banks and credit unions as well as your favorite apps like Venmo, PayPal, and Cash App."
          >
            <div className="flex flex-wrap gap-2">
              {LOGO_ITEMS.slice(0, 6).map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-xl px-3 py-2">
                  {item.iconSrc && <img src={item.iconSrc} alt="" width={14} height={14} className="shrink-0" />}
                  <span className="text-xs font-bold whitespace-nowrap" style={{ color: item.color || "#171717" }}>
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </OnboardingStepCard>

          <OnboardingStepCard
            n="2"
            title="Set your percentages"
            body="We start you off with seven buckets built for self-employed income -- Solo 401k, SEP IRA, Investments, Tax Reserve, Emergency Fund, business expenses (OPEX), and Savings. Don't need one? Remove it. Want more? Add your own."
          >
            <div className="space-y-2">
              {DEFAULT_BUCKETS.map((b) => (
                <div key={b.label} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                    <span className="text-xs sm:text-sm font-semibold text-neutral-800 truncate">{b.label}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold font-mono shrink-0" style={{ color: b.color }}>{b.pct}%</span>
                </div>
              ))}
            </div>
          </OnboardingStepCard>

          <OnboardingStepCard
            n="3"
            title="Spend the rest, guilt free"
            body="That's it. From here, every future deposit gets split automatically the moment it lands. Whatever's sitting in checking is yours to spend, guilt free."
          >
            <div className="bg-white border border-neutral-200 rounded-xl px-4 py-5 text-center">
              <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Available to spend</div>
              <div className="text-3xl font-extrabold text-emerald-700 font-mono">$1,842</div>
              <div className="text-xs text-neutral-500 mt-1">already split &amp; saved this month</div>
            </div>
          </OnboardingStepCard>
        </div>

        <div className="relative pb-14 md:pb-20">
          <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-16 bg-gradient-to-l from-white to-transparent z-10" />
          <div className="flex w-max pp-logo-track">
            {logoTrack.map((item, i) => (
              <LogoChip key={`${item.name}-${i}`} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Close out / taxes */}
      <section className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-14 md:py-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center">
          <div className="order-2 md:order-1 bg-white border border-neutral-200 rounded-2xl card-shadow p-5 sm:p-6">
            <div className="flex items-center gap-2 mb-5">
              <ClipboardCheck size={18} className="text-emerald-700" />
              <span className="text-sm font-bold text-neutral-900">Monthly Close Out -- July 2026</span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Income", value: "$14,220", tone: "text-emerald-700" },
                { label: "Business expenses", value: "$3,110", tone: "text-neutral-700" },
                { label: "W2 income (excluded)", value: "$0", tone: "text-neutral-400" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">{r.label}</span>
                  <span className={`font-mono font-semibold ${r.tone}`}>{r.value}</span>
                </div>
              ))}
              <div className="h-px bg-neutral-200 my-1" />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-neutral-800">Net income this month</span>
                <span className="font-mono font-bold text-neutral-900">$11,110</span>
              </div>
            </div>
            <div className="mt-5 bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800">
              Calculate your Solo 401k and SEP IRA contributions effortlessly inside the dashboard.
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Taxes, already halfway done</h2>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              At the end of every month, you already know what was income, what was an expense, and where it came
              from.
            </p>
            <p className="text-neutral-600 leading-relaxed">
              PriorityPay&apos;s Month Close-Out walks you through confirming each transaction once, then uses it to
              recommend exactly how much to send to your Tax Reserve and retirement accounts. Have W2 income? No
              problem, we&apos;ll separate it out automatically.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-14 md:py-20">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3 text-center">Questions</h2>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900 mb-10 text-center">
            Frequently asked questions
          </p>
          <div>
            {FAQS.map((item, i) => (
              <FaqItem
                key={item.q}
                item={item}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-16 md:py-24 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-neutral-900 mb-4">
            Stop reacting to your finances. Take an effortless, proactive approach.
          </h2>
          <p className="text-neutral-600 max-w-xl mx-auto mb-9">
            Set your percentages once. Every deposit after that is routed to savings and investments automatically.
          </p>
          <Link href="/signup">
            <PrimaryButton className="!px-8 !py-4 !text-base">
              Get started free <ArrowRight size={17} />
            </PrimaryButton>
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center">
              <Zap size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold text-neutral-700">PriorityPay</span>
          </div>
          <p className="text-xs text-neutral-400 text-center sm:text-right">
            PriorityPay routes money between accounts you connect and control. It is not a bank, broker-dealer, or
            investment adviser, and does not hold or invest your funds.
          </p>
        </div>
      </footer>
    </div>
  );
}
