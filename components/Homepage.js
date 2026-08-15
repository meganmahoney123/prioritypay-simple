"use client";

import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Wallet,
  ShieldCheck,
  TrendingUp,
  PiggyBank,
  Briefcase,
  Landmark,
  ClipboardCheck,
  Sparkles,
  Check,
  X,
  Plus,
} from "lucide-react";
import BucketIcon from "./BucketIcon";
import { PrimaryButton, GhostButton } from "./ui";

const DEFAULT_BUCKETS = [
  { label: "Solo 401k", icon: Landmark, fill: 62, color: "#8b5cf6" },
  { label: "SEP IRA", icon: Landmark, fill: 48, color: "#ec4899" },
  { label: "Investments", icon: TrendingUp, fill: 71, color: "#14b8a6" },
  { label: "Tax Reserve", icon: ShieldCheck, fill: 55, color: "#a3a3a3" },
  { label: "Emergency Fund", icon: PiggyBank, fill: 80, color: "#f59e0b" },
  { label: "OPEX", icon: Briefcase, fill: 40, color: "#7c3aed" },
  { label: "Savings", icon: Wallet, fill: 66, color: "#ef4444" },
];

const CUSTOM_EXAMPLES = ["Wedding", "College Fund", "Vacation Fund", "House Downpayment", "Hobbies"];

const INTEGRATIONS = ["Venmo", "Cash App", "PayPal", "any checking or savings account"];

export default function Homepage() {
  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-[#fafafa]/90 backdrop-blur border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Zap size={18} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold">PriorityPay</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-neutral-600 hover:text-neutral-900 px-3 py-2">
              Log in
            </Link>
            <Link href="/signup">
              <PrimaryButton className="!px-4 !py-2 !rounded-xl">Get started</PrimaryButton>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={13} />
            Built for the self-employed
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05] text-neutral-900">
            Get paid, and watch your money route itself
            <span className="text-emerald-600"> before you can spend it.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-neutral-600 leading-relaxed">
            No employer is doing this for you anymore. PriorityPay splits every deposit the moment it lands, sending a
            percentage toward retirement, savings, and taxes automatically -- so whatever's left in your checking
            account is genuinely, guilt-free yours to spend.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/signup">
              <PrimaryButton className="!px-7 !py-3.5 !text-base">
                Get started free <ArrowRight size={17} />
              </PrimaryButton>
            </Link>
            <Link href="/login">
              <GhostButton className="!px-7 !py-3.5 !text-base">Log in</GhostButton>
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-400">
            PriorityPay moves money between the accounts you connect. It doesn&apos;t manage or invest your money for
            you -- you stay in control of every account.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Financial accountability, on autopilot</h2>
          <p className="text-2xl md:text-3xl font-bold text-neutral-900 max-w-2xl mb-14">
            You don&apos;t have to remember to save. You just have to get paid.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "A deposit lands",
                body: "Client payment, Venmo, Cash App, PayPal, a check you deposited -- any money hitting a connected account triggers PriorityPay.",
              },
              {
                step: "02",
                title: "It splits by your percentages, instantly",
                body: "Before you ever see it in your everyday checking account, your chosen percentage routes out to retirement, savings, taxes, and anywhere else you've set up.",
              },
              {
                step: "03",
                title: "Whatever's left is yours, guilt-free",
                body: "No more wondering if that dinner out was actually 'okay.' If it's sitting in checking, it's already been accounted for -- spend it.",
              },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-3xl font-extrabold text-neutral-200 mb-3 font-mono">{s.step}</div>
                <h3 className="text-lg font-bold text-neutral-900 mb-2">{s.title}</h3>
                <p className="text-sm text-neutral-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Buckets */}
      <section className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="max-w-2xl mb-12">
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Your buckets, your rules</h2>
            <p className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              We start you off with seven buckets built for self-employed income.
            </p>
            <p className="text-neutral-600 leading-relaxed">
              Solo 401k, SEP IRA, Investments, Tax Reserve, Emergency Fund, business expenses (OPEX), and Savings --
              the accounts that actually matter when nobody's withholding anything for you. Don&apos;t need one?
              Remove it. Want more? Add your own.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-10">
            {DEFAULT_BUCKETS.map((b) => (
              <div key={b.label} className="bg-white border border-neutral-200 rounded-2xl card-shadow p-4 flex flex-col items-center text-center">
                <BucketIcon fillPct={b.fill} size={44} />
                <span className="mt-2 text-xs font-bold text-neutral-800 leading-tight">{b.label}</span>
              </div>
            ))}
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl card-shadow p-6 md:p-7">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Plus size={17} className="text-emerald-700" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 mb-1">Or build your own categories entirely</h3>
                <p className="text-sm text-neutral-600 mb-3">
                  Saving toward something specific? Add a bucket for it and give it a percentage, same as any other.
                </p>
                <div className="flex flex-wrap gap-2">
                  {CUSTOM_EXAMPLES.map((c) => (
                    <span key={c} className="text-xs font-semibold bg-neutral-100 text-neutral-700 px-3 py-1.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feel good logging in */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-14 items-center">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">The only app you'll actually enjoy opening</h2>
            <p className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              Every other financial app shows you what you owe, what you overspent, what you should&apos;ve done.
            </p>
            <p className="text-neutral-600 leading-relaxed mb-4">
              PriorityPay just shows you what you&apos;ve already, effortlessly, saved. No budgeting homework, no
              guilt trip -- just a running total of the retirement, tax, and savings progress that happened
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
          <div className="bg-neutral-50 border border-neutral-200 rounded-2xl card-shadow p-6">
            <div className="text-[11px] font-bold uppercase tracking-wide text-neutral-400 mb-1">Total saved since joining</div>
            <div className="text-4xl font-extrabold text-emerald-700 font-mono mb-6">$34,218</div>
            <div className="space-y-3">
              {[
                { label: "Solo 401k", value: "$11,240", color: "#8b5cf6" },
                { label: "Tax Reserve", value: "$8,905", color: "#a3a3a3" },
                { label: "Emergency Fund", value: "$6,110", color: "#f59e0b" },
                { label: "Investments", value: "$7,963", color: "#14b8a6" },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span className="text-sm font-semibold text-neutral-800">{r.label}</span>
                  </div>
                  <span className="text-sm font-bold text-neutral-900 font-mono">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Close out / taxes */}
      <section className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 py-20 grid md:grid-cols-2 gap-14 items-center">
          <div className="order-2 md:order-1 bg-white border border-neutral-200 rounded-2xl card-shadow p-6">
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
              Solo 401k and SEP IRA contribution room recalculated automatically -- no spreadsheet required.
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Taxes, already halfway done</h2>
            <p className="text-2xl md:text-3xl font-bold text-neutral-900 mb-4">
              At the end of every month, you already know what was income, what was an expense, and where it came
              from.
            </p>
            <p className="text-neutral-600 leading-relaxed">
              PriorityPay&apos;s Month Close-Out walks you through confirming each transaction once, then uses it to
              recommend exactly how much to send to your Tax Reserve and retirement accounts -- so tax season is a
              formality, not a scramble, and W2 income gets kept separate automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-20 text-center">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-700 mb-3">Connects to how you actually get paid</h2>
          <p className="text-2xl md:text-3xl font-bold text-neutral-900 max-w-2xl mx-auto mb-10">
            Self-employed income doesn&apos;t just show up in one checking account. PriorityPay doesn&apos;t assume it
            does either.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {INTEGRATIONS.map((name) => (
              <div key={name} className="bg-neutral-50 border border-neutral-200 rounded-2xl px-6 py-4 font-bold text-neutral-800 text-sm">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 py-24 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-900 mb-4">
            Stop deciding what to save. Start knowing it's already done.
          </h2>
          <p className="text-neutral-600 max-w-xl mx-auto mb-9">
            Set your percentages once. Every deposit after that takes care of itself.
          </p>
          <Link href="/signup">
            <PrimaryButton className="!px-8 !py-4 !text-base">
              Get started free <ArrowRight size={17} />
            </PrimaryButton>
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
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
