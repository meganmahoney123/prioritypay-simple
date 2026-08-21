"use client";

// Advisory Fee Calculator ("Fee Check"), sourced from Megan's standalone
// HTML prototype (prioritypay-fee-check_4.html) and ported into the app.
//
// This one is intentionally NOT rebuilt the way the other /calculators/*
// pages are (hand-written React state driving Ledger-styled JSX). The
// prototype is ~450 lines of carefully tuned vanilla JS -- tiered fee math
// (graduated vs. whole-balance), range-vs-exact balances, a hover tooltip
// on the bar chart, cursor-position-preserving number inputs, and a
// generated email draft -- and Megan iterated it to a 4th revision on her
// own before handing it over. Rewriting that logic into React state by
// hand would risk quietly changing the math or losing behavior she already
// signed off on. Instead: the exact script runs inside a useEffect after
// mount, working against the same element ids the prototype used (verified
// unique across the app), and the CSS is scoped under .pp-fee-check so it
// can't leak into other pages -- the two changes from a raw drop-in.
//
// Two content changes from the prototype, both agreed with Megan before
// shipping:
//   1. The compliance "review sheet" / "not yet reviewed" banner Megan's
//      v1 had (every account note flagged reviewed:false) is gone from v4
//      already -- nothing to do here.
//   2. The generated email referenced a provider intake form at
//      prioritypay.co/f/x7k2m9 that doesn't exist. Folded those two items
//      into the plain "email me" list instead of shipping a dead link --
//      see EMAIL_BODY below. "Send now" now opens a real mailto: draft in
//      the visitor's own mail client (matching what the button already
//      claimed to do); PriorityPay's servers never see any of it, same as
//      every other number on this page.

import { useEffect, useRef } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import { LEDGER_TOKENS } from "@/lib/ledgerTheme";

const FEE_CHECK_CSS = `
.pp-fee-check{
  --warn:#9b3b3b;
  font-family:var(--font-body);color:var(--color-text);background:var(--color-bg);
  font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased;
}
.pp-fee-check, .pp-fee-check *{box-sizing:border-box}
.pp-fee-check h1, .pp-fee-check h2, .pp-fee-check h3, .pp-fee-check h4{font-family:var(--font-heading);font-weight:500;letter-spacing:.01em}
.pp-fee-check .wrap{max-width:1250px;margin:0 auto;padding:26px 22px 70px}
.pp-fee-check .pagehead{margin-bottom:18px}
.pp-fee-check .pagehead h1{font-family:var(--font-heading);font-size:clamp(30px,4vw,40px);font-weight:400;margin:0 0 10px}
.pp-fee-check .pagehead p{font-size:14px;color:color-mix(in srgb, var(--color-text) 76%, transparent);margin:0;max-width:580px}
.pp-fee-check .eyebrow{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--color-accent-700);margin-bottom:9px}

.pp-fee-check .intro{border:1px solid var(--color-divider);border-radius:var(--radius-lg);background:var(--color-neutral-100);padding:20px 24px;margin-bottom:16px}
.pp-fee-check .introtext p{margin:9px 0 0;color:color-mix(in srgb, var(--color-text) 76%, transparent);max-width:74ch;font-size:14.5px}
.pp-fee-check .introtext p b{color:var(--color-text);font-weight:500}
.pp-fee-check .introtext .big{font-family:var(--font-heading);font-size:30px;line-height:1.2;
  color:var(--color-accent-700);margin:0;max-width:30ch}
.pp-fee-check .introtext .big small{font-size:20px;color:color-mix(in srgb, var(--color-text) 76%, transparent);white-space:nowrap}
@media(max-width:620px){.pp-fee-check .introtext .big{font-size:25px}.pp-fee-check .introtext .big small{font-size:17px}}
.pp-fee-check .kpiwrap{border-top:1px solid var(--color-divider);margin-top:19px;padding-top:17px}
.pp-fee-check .kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:13px}
@media(max-width:760px){.pp-fee-check .kpis{grid-template-columns:1fr;gap:17px}}
.pp-fee-check .kpi .lab{font-size:10px;letter-spacing:.13em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);
  margin-bottom:5px;line-height:1.4}
.pp-fee-check .kpi .val{font-family:var(--font-heading);font-size:34px;font-weight:600;line-height:1.15;
  font-variant-numeric:tabular-nums;color:var(--color-text)}
.pp-fee-check .kpi.lead .val{color:var(--color-accent-700)}
.pp-fee-check .kpidisc{border-left:2px solid var(--color-divider);padding-left:13px;font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);
  margin-top:13px;line-height:1.5;max-width:88ch}
.pp-fee-check .kpinote{font-size:12.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:15px;line-height:1.5}
.pp-fee-check .kpinote b{color:color-mix(in srgb, var(--color-text) 76%, transparent);font-weight:500}

.pp-fee-check .paths{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
@media(max-width:760px){.pp-fee-check .paths{grid-template-columns:1fr}}
.pp-fee-check .path{border:1px solid var(--color-divider);border-radius:var(--radius-md);background:var(--color-neutral-100);padding:16px 20px;cursor:pointer;text-align:left;
  font-family:var(--font-body);color:var(--color-text);transition:.14s}
.pp-fee-check .path:hover{border-color:var(--color-accent)}
.pp-fee-check .path.on{border-color:var(--color-accent);background:color-mix(in srgb, var(--color-accent) 6%, var(--color-neutral-100))}
.pp-fee-check .path .h{font-family:var(--font-heading);font-size:21px;display:block;margin-bottom:2px}
.pp-fee-check .path .s{font-size:12.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);display:block;line-height:1.45}
.pp-fee-check .drawer{border:1px solid var(--color-divider);border-radius:var(--radius-md);background:var(--color-neutral-100);margin-bottom:16px;display:none}
.pp-fee-check .drawer.open{display:block;padding:24px 26px}

.pp-fee-check .grid{display:grid;grid-template-columns:1fr 462px;gap:20px;align-items:start}
@media(max-width:1060px){.pp-fee-check .grid{grid-template-columns:1fr}}
.pp-fee-check .card{border:1px solid var(--color-divider);border-radius:var(--radius-md);background:var(--color-neutral-100);padding:22px 24px;margin-bottom:16px}
.pp-fee-check .card h3{font-family:var(--font-heading);font-weight:500;font-size:21px;margin:0 0 3px}
.pp-fee-check .card h3 em{font-style:normal;color:var(--color-accent-700);font-size:15px;letter-spacing:.14em;
  text-transform:uppercase;font-family:var(--font-body);margin-right:9px;vertical-align:2px}
.pp-fee-check .card .sub{font-size:12.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin:0 0 16px;line-height:1.5;max-width:72ch}
.pp-fee-check .right{position:sticky;top:18px}

.pp-fee-check .picker{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:10px}
.pp-fee-check .pick{border:1px solid var(--color-divider);border-radius:var(--radius-md);background:transparent;text-align:left;padding:12px 14px;cursor:pointer;
  font-family:var(--font-body);color:var(--color-text);transition:.14s}
.pp-fee-check .pick:hover{border-color:var(--color-accent)}
.pp-fee-check .pick.on{border-color:var(--color-accent);background:color-mix(in srgb, var(--color-accent) 6%, transparent)}
.pp-fee-check .pick b{display:block;font-weight:500;font-size:13.5px;margin-bottom:2px}
.pp-fee-check .pick.on b:after{content:" \u2713";color:var(--color-accent-700)}
.pp-fee-check .pick span{font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);line-height:1.45;display:block}

.pp-fee-check .acct{border:1px solid var(--color-divider);border-radius:var(--radius-md);padding:16px 18px;margin-bottom:12px}
.pp-fee-check .acct.unset{border-style:dashed}
.pp-fee-check .acct .nm{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:9px}
.pp-fee-check .acct .nm input{font-family:var(--font-heading);font-size:20px;border:0;background:transparent;
  color:var(--color-text);border-bottom:1px solid transparent;outline:none;padding:1px 0;width:100%}
.pp-fee-check .acct .nm input:focus{border-bottom-color:var(--color-accent)}
.pp-fee-check .rm{background:none;border:0;color:color-mix(in srgb, var(--color-text) 55%, transparent);cursor:pointer;font-size:16px;line-height:1;flex:none;padding:2px 5px}
.pp-fee-check .rm:hover{color:var(--color-text)}
.pp-fee-check .fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:12px 16px}
.pp-fee-check label.f{display:block;font-size:10px;letter-spacing:.11em;text-transform:uppercase;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:3px}
.pp-fee-check .hint{font-size:11px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:4px;line-height:1.4;font-style:italic}
.pp-fee-check .err{font-size:11.5px;color:#a4372c;margin-top:5px;line-height:1.4}
.pp-fee-check .in{width:100%;border:0;border-bottom:1px solid var(--color-divider);background:transparent;font-family:var(--font-body);
  /* 16px, not 14.5 -- under 16px, iOS Safari auto-zooms the page on
     focus, which is disruptive on a form with this many numeric fields. */
  font-size:16px;color:var(--color-text);padding:5px 2px;outline:none;border-radius:0}
.pp-fee-check .in:focus{border-bottom-color:var(--color-accent)}
.pp-fee-check .in.bad{border-bottom-color:#a4372c}
.pp-fee-check select.in{padding:5px 0}
.pp-fee-check .rangepair{display:flex;gap:10px;align-items:flex-end;max-width:330px}
.pp-fee-check .rangepair span{font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent);padding-bottom:6px}
.pp-fee-check .seg{display:inline-flex;border:1px solid var(--color-divider);border-radius:999px;padding:3px;margin-bottom:9px}
.pp-fee-check .seg button{background:none;border:0;border-radius:999px;font-family:var(--font-heading);font-weight:600;font-size:13px;
  color:color-mix(in srgb, var(--color-text) 65%, transparent);padding:6px 14px;cursor:pointer}
.pp-fee-check .seg button.on{background:var(--color-accent-100);color:var(--color-accent-800)}
.pp-fee-check .chk{font-size:12.5px;color:color-mix(in srgb, var(--color-text) 76%, transparent);display:inline-flex;gap:7px;align-items:center;cursor:pointer}
.pp-fee-check .flagnote{border-left:2px solid var(--color-accent);padding:2px 0 2px 12px;font-size:12px;color:color-mix(in srgb, var(--color-text) 76%, transparent);
  margin:11px 0 0;line-height:1.5}

.pp-fee-check details.tier{margin-top:13px;border-top:1px solid var(--color-divider);padding-top:11px}
.pp-fee-check details.tier summary{font-size:12px;color:var(--color-accent-700);cursor:pointer;list-style:none}
.pp-fee-check details.tier summary::-webkit-details-marker{display:none}
.pp-fee-check details.tier summary:before{content:"\u25b8 ";font-size:10px}
.pp-fee-check details.tier[open] summary:before{content:"\u25be ";}
.pp-fee-check .trow{display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-bottom:8px}
.pp-fee-check .tnote{font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:7px;line-height:1.5}
.pp-fee-check .tnote b{color:color-mix(in srgb, var(--color-text) 76%, transparent);font-weight:500}

.pp-fee-check .btn{font-family:var(--font-heading);font-weight:600;font-size:15px;cursor:pointer;white-space:nowrap;
  display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:border-color 160ms ease,background 160ms ease,color 160ms ease,opacity 160ms ease;
  padding:12px 24px;border-radius:var(--radius-md);background:var(--color-accent);border:1px solid var(--color-accent);color:#fff}
.pp-fee-check .btn:hover{background:var(--color-accent-700);border-color:var(--color-accent-700)}
.pp-fee-check .btn.sm{padding:8px 16px;font-size:13px}
.pp-fee-check .btn.ghost{background:transparent;border-color:var(--color-divider);color:var(--color-text)}
.pp-fee-check .btn.ghost:hover{background:transparent;border-color:color-mix(in srgb, var(--color-text) 55%, transparent);color:var(--color-text)}

.pp-fee-check .card.sampling{border-style:dashed}
.pp-fee-check .totalblock{border-top:1px solid var(--color-divider);margin-top:26px;padding-top:20px}
.pp-fee-check .totalblock.second{border-top-style:dotted;margin-top:22px;padding-top:18px}
.pp-fee-check .hero.lg{font-size:42px}
.pp-fee-check .bar-fee{font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-top:5px;font-variant-numeric:tabular-nums}
.pp-fee-check .samplebar{display:flex;align-items:center;gap:9px;margin-bottom:12px;flex-wrap:wrap}
.pp-fee-check .samplechip{display:inline-flex;align-items:center;font-family:var(--font-heading);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--color-accent-700);
  border:1px solid var(--color-accent);border-radius:999px;padding:5px 12px;white-space:nowrap}
.pp-fee-check .samplebar span{font-size:11.5px;color:color-mix(in srgb, var(--color-text) 55%, transparent);line-height:1.45}
.pp-fee-check .hero{font-family:var(--font-heading);font-weight:600;font-size:34px;line-height:1.15;color:var(--color-accent-700);margin:2px 0 5px}
.pp-fee-check .herosub{font-size:13px;color:color-mix(in srgb, var(--color-text) 76%, transparent);margin-bottom:20px;line-height:1.5}
.pp-fee-check .herosub b{font-weight:500;color:var(--color-text)}
.pp-fee-check .figtitle{font-size:14.5px;margin-bottom:2px}
.pp-fee-check .figsub{font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent);margin-bottom:15px;line-height:1.45}
.pp-fee-check .viz{position:relative}
.pp-fee-check .bar-row{margin-bottom:13px}
.pp-fee-check .bar-lab{display:flex;justify-content:space-between;gap:12px;font-size:12.5px;color:color-mix(in srgb, var(--color-text) 76%, transparent);margin-bottom:4px}
.pp-fee-check .bar-lab b{font-weight:500;color:var(--color-text);font-variant-numeric:tabular-nums;white-space:nowrap}
.pp-fee-check .track{position:relative;height:20px}
.pp-fee-check .bar{position:absolute;top:0;left:0;height:20px;border-radius:0 var(--radius-sm) var(--radius-sm) 0;
  transition:width .45s cubic-bezier(.2,.7,.3,1);cursor:pointer}
.pp-fee-check .bar.tail{opacity:.34}
.pp-fee-check .axis{border-top:1px solid var(--color-divider);margin-top:1px;padding-top:5px;font-size:11px;color:color-mix(in srgb, var(--color-text) 55%, transparent);
  display:flex;justify-content:space-between;font-variant-numeric:tabular-nums}
.pp-fee-check .tip{position:absolute;pointer-events:none;background:var(--color-neutral-100);border:1px solid var(--color-divider);border-radius:var(--radius-sm);padding:7px 10px;
  font-size:12px;white-space:nowrap;opacity:0;transition:.12s;z-index:9;box-shadow:var(--shadow-md)}
.pp-fee-check .tv-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.pp-fee-check table.tv{border-collapse:collapse;width:100%;min-width:420px;font-size:12.5px;margin-top:4px}
.pp-fee-check table.tv th,.pp-fee-check table.tv td{border-bottom:1px solid var(--color-divider);padding:7px 8px;text-align:left;vertical-align:top}
.pp-fee-check table.tv th{color:color-mix(in srgb, var(--color-text) 55%, transparent);font-weight:500;font-size:10px;letter-spacing:.1em;text-transform:uppercase}
.pp-fee-check table.tv td.n,.pp-fee-check table.tv th.n{text-align:right;font-variant-numeric:tabular-nums}
.pp-fee-check table.tv tr:last-child td{border-bottom:0}
.pp-fee-check .lnkbtn{background:none;border:0;color:var(--color-accent-700);font-family:var(--font-body);font-size:12px;cursor:pointer;
  padding:0;text-decoration:underline;text-underline-offset:3px;margin-top:8px}
.pp-fee-check .disc{border-left:2px solid var(--color-divider);padding:1px 0 1px 14px;font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent);
  margin-top:18px;line-height:1.55}
.pp-fee-check .privacy{border:1px solid var(--color-divider);border-radius:var(--radius-md);padding:14px 16px;margin-top:16px;font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent);line-height:1.55}
.pp-fee-check .privacy > b:first-child{color:color-mix(in srgb, var(--color-text) 76%, transparent);font-weight:500;display:block;margin-bottom:4px;font-size:10.5px;
  letter-spacing:.11em;text-transform:uppercase}
.pp-fee-check .privacy span b{color:color-mix(in srgb, var(--color-text) 76%, transparent);font-weight:500}

.pp-fee-check .email{border:1px solid var(--color-divider);border-radius:var(--radius-md);padding:22px 24px;background:var(--color-bg);font-size:13.5px;line-height:1.6}
.pp-fee-check .email .hdr{font-size:12px;color:color-mix(in srgb, var(--color-text) 55%, transparent);border-bottom:1px solid var(--color-divider);padding-bottom:9px;margin-bottom:13px}
.pp-fee-check .email .hdr b{color:color-mix(in srgb, var(--color-text) 76%, transparent);font-weight:500}
.pp-fee-check .email ol{padding-left:20px;margin:8px 0} .pp-fee-check .email li{margin:5px 0}
.pp-fee-check .email ul{padding-left:18px;margin:5px 0} .pp-fee-check .email ul li{margin:3px 0;font-size:13px}
.pp-fee-check .email a{color:var(--color-accent-700)}
.pp-fee-check .email h5{font-family:var(--font-body);font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;
  color:var(--color-accent-700);margin:16px 0 2px;font-weight:500}
.pp-fee-check .flag{border-left:2px solid var(--color-accent);padding-left:13px;margin:14px 0;font-size:12.5px;color:color-mix(in srgb, var(--color-text) 76%, transparent);line-height:1.55}
.pp-fee-check .one{max-width:640px;display:flex;flex-direction:column}
`;

export default function AdvisoryFeeCalculatorPublicClient() {
  const rootRef = useRef(null);

  useEffect(() => {
    // ---- everything below is the ported prototype script, run once on
    // mount against the ids rendered in the JSX further down. Kept as
    // close to Megan's source as possible -- see file header for why. ----
    const MAXSPAN = 30000;

    const TYPES = [
      { k: "brokerage", n: "Taxable brokerage", d: "A regular investment account, no tax perks. You owe tax on gains and dividends as they happen. Often labelled 'individual' or 'joint'.",
        ask: "Ask for your cost basis and unrealised gain on this account. Selling inside a taxable account is where a one-time tax cost can arise, and the size of it depends on what you originally paid." },
      { k: "trad", n: "Traditional IRA", d: "Retirement account. Contributions may be deductible now; you pay income tax when you withdraw.",
        ask: "Ask whether a transfer would move your holdings as they are or require selling them first, and what transfer-out or account-closing fees apply." },
      { k: "roth", n: "Roth IRA", d: "Retirement account funded with money you've already paid tax on. Qualified withdrawals are tax-free.",
        ask: "Ask whether a transfer would move your holdings as they are or require selling them first, and what transfer-out or account-closing fees apply." },
      { k: "rollover", n: "Rollover IRA", d: "A traditional IRA holding money moved out of an old employer's 401(k) or 403(b). Common after a job change.",
        ask: "Ask whether a transfer would move your holdings as they are or require selling them first, and what transfer-out or account-closing fees apply." },
      { k: "inherited", n: "Inherited IRA", d: "An IRA you received as a beneficiary. Has its own withdrawal deadlines that ordinary IRAs don't.",
        ask: "Ask what withdrawal timetable applies to this specific account and whether moving it changes anything. Inherited accounts follow their own rules, which depend on when and from whom it was inherited." },
      { k: "sep", n: "SEP or SIMPLE IRA", d: "Retirement accounts for self-employed people and small businesses.",
        ask: "Ask what the plan itself charges in administrative costs, separately from any advisory fee, and what a transfer would cost." },
      { k: "solo", n: "Solo 401(k)", d: "A 401(k) for someone self-employed with no employees besides a spouse.",
        ask: "Ask who administers the plan and what they charge, since a Solo 401(k) usually carries plan costs distinct from any advisory fee." },
      { k: "401k", n: "401(k) or 403(b)", d: "Held through an employer. Usually sits with the plan's own provider rather than your adviser -- though some advisers charge to manage it anyway.", unmanaged: true,
        ask: "Ask whether this account is inside your advisory agreement at all, and separately what the plan itself charges in record-keeping and administrative fees." },
      { k: "457", n: "457(b) deferred comp", d: "A deferred compensation plan offered by state, local government, and some nonprofit employers.", unmanaged: true,
        ask: "Ask whether anyone is charging you to manage this, and what the plan charges. 457(b) terms vary by employer, including what happens when you leave." },
      { k: "tsp", n: "Thrift Savings Plan", d: "The federal government's retirement plan for its employees and the military.", unmanaged: true,
        ask: "Ask whether anyone is charging you to manage this. The TSP publishes its own internal costs, which are separate from any adviser's fee." },
      { k: "pension", n: "Pension or cash balance plan", d: "A traditional employer pension, or a cash balance plan. Pays a defined benefit rather than holding a balance you direct.", unmanaged: true,
        ask: "Ask whether this is a defined benefit -- a promise of income -- or a balance you actually direct. A fee comparison may not apply to it at all. Ask whether any fee is charged against it." },
      { k: "stock", n: "Employer stock, RSUs, ESPP", d: "Shares or share-based compensation from an employer, held in a brokerage or equity plan account.",
        ask: "Ask what restrictions apply -- holding periods, trading windows, blackout dates -- and ask for your cost basis on each lot." },
      { k: "trust", n: "Trust account", d: "Held in the name of a trust rather than a person. Common in estate planning.",
        ask: "Ask who has authority to move this account and what the trust document permits. The trust's terms, not your preference alone, govern what can change." },
      { k: "custodial", n: "Custodial account (UGMA/UTMA)", d: "An account held for a minor, which becomes theirs outright at a set age.",
        ask: "Ask at what age this transfers to the child outright, and whose authority is needed to move it before then." },
      { k: "529", n: "529 or Coverdell", d: "A tax-advantaged account for education costs.",
        ask: "Ask what happens to the account's tax treatment if it moves, and how often a rollover is permitted." },
      { k: "hsa", n: "HSA", d: "A health savings account. Some can be invested rather than left in cash.",
        ask: "Ask whether a transfer would go directly between custodians, and what closing fees apply." },
      { k: "annuity", n: "Annuity", d: "An insurance product, not a plain investment account. Carries its own charges that a normal advisory fee doesn't show.",
        ask: "Ask for the surrender schedule in writing -- the charge and the date it ends -- plus every internal insurance charge. These sit on top of any advisory fee and are often far larger." },
      { k: "life", n: "Cash-value life insurance", d: "Whole, universal, or variable life with a cash value component you may be paying to manage.",
        ask: "Ask for the surrender charge schedule and all internal policy charges, and what happens to the policy itself if management stops." },
      { k: "daf", n: "Donor-advised fund", d: "A charitable giving account. The money is irrevocably committed to charity.",
        ask: "Ask what moving to a different sponsor would cost. This money is already committed to charity and doesn't return to you under any scenario here." },
      { k: "cash", n: "Cash, savings, or CDs", d: "Money held at the firm in cash, a money market, or certificates of deposit.",
        ask: "Ask whether the advisory fee is charged on cash balances too, and what rate the cash is currently earning." },
      { k: "other", n: "Other / not listed", d: "Anything the list above doesn't cover.", hidden: true,
        ask: "Ask what this account is, what it costs to hold, and what it would cost to move. The email in the help panel asks all three." },
    ];
    const T = (k) => TYPES.find((t) => t.k === k);

    let uid = 0;
    const mk = (type) => ({
      id: ++uid, type: type || "", name: type ? T(type).n : "", managed: !(type && T(type).unmanaged),
      mode: "range", lo: 50000, hi: 75000, exact: 60000, fee: 1.0, er: 0.55, otherPct: 0, otherFlat: 0, move: 0,
      tiered: false, tierType: "graduated",
      tiers: [{ upTo: 500000, rate: 1.0 }, { upTo: 1000000, rate: 0.85 }, { upTo: null, rate: 0.7 }],
    });
    const S = { accts: [], ret: 7, yrs: 30, add: 0, diyEr: 0.1, diyFlat: 0, advFee: 2500, advEvery: 3, table: false, path: "know",
      firstName: "", provider: "", providerEmail: "" };

    const SAMPLE = [
      { id: -1, name: "Rollover IRA", type: "rollover", managed: true, mode: "exact", exact: 150000,
        fee: 1.05, er: 0.58, otherPct: 0, otherFlat: 0, move: 0, tiered: false, tierType: "graduated", tiers: [] },
      { id: -2, name: "Taxable brokerage", type: "brokerage", managed: true, mode: "exact", exact: 75000,
        fee: 1.25, er: 0.71, otherPct: 0, otherFlat: 150, move: 0, tiered: false, tierType: "graduated", tiers: [] },
    ];
    let ACTIVE = SAMPLE;

    const money = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
    const ready = () => S.accts.filter((a) => a.type);
    const spanBad = (a) => a.mode === "range" && ((+a.hi || 0) - (+a.lo || 0) > MAXSPAN || (+a.hi || 0) < (+a.lo || 0));
    function bal(a, side) {
      if (a.mode === "exact") return +a.exact || 0;
      const lo = +a.lo || 0;
      let hi = +a.hi || 0;
      if (hi < lo) hi = lo;
      if (hi - lo > MAXSPAN) hi = lo + MAXSPAN;
      return side === "hi" ? hi : lo;
    }
    const isRange = (a) => a.mode === "range" && bal(a, "hi") !== bal(a, "lo");

    function advRate(a, b) {
      if (!a.tiered) return a.fee / 100;
      if (a.tierType === "flat") {
        for (const x of a.tiers) { if (x.upTo == null || b <= x.upTo) return x.rate / 100; }
        return a.tiers[a.tiers.length - 1].rate / 100;
      }
      let prev = 0, w = 0;
      for (const x of a.tiers) {
        const cap = x.upTo == null ? Infinity : x.upTo;
        w += Math.max(0, Math.min(b, cap) - prev) * (x.rate / 100); prev = cap; if (b <= cap) break;
      }
      return b > 0 ? w / b : 0;
    }
    function sim(a, ov, side) {
      const r = S.ret / 100, n = Math.max(0, Math.round(S.yrs)), k = ACTIVE.length || 1;
      let b = bal(a, side), fees = 0;
      if (ov && !ov.nomove) b -= (+a.move || 0);
      for (let y = 0; y < n; y++) {
        b = b * (1 + r) + (S.add || 0) / k;
        const drag = ov ? ov.pct / 100 : (a.managed ? advRate(a, b) : 0) + (a.er || 0) / 100 + (a.otherPct || 0) / 100;
        let flat = ov ? (ov.flat || 0) / k : (a.otherFlat || 0);
        if (ov && ov.every && ov.fee && y % Math.max(1, Math.round(ov.every)) === 0) flat += ov.fee / k;
        const c = b * drag + flat; fees += c; b = Math.max(0, b - c);
      }
      return { end: b, fees };
    }
    const total = (ov, side) => ACTIVE.reduce((t, a) => { const s = sim(a, ov, side); return { end: t.end + s.end, fees: t.fees + s.fees }; }, { end: 0, fees: 0 });
    const span = (lo, hi) => (Math.round(lo) === Math.round(hi) ? money(lo) : money(lo) + " – " + money(hi));

    function buildPicker() {
      const el = document.getElementById("picker");
      if (!el) return;
      el.innerHTML = TYPES.filter((t) => !t.hidden).map((t) => {
        const on = S.accts.some((a) => a.type === t.k);
        return `<button class="pick ${on ? "on" : ""}" data-t="${t.k}"><b>${t.n}</b><span>${t.d}</span></button>`;
      }).join("");
      el.querySelectorAll(".pick").forEach((b) => (b.onclick = () => {
        const k = b.dataset.t;
        if (S.accts.some((a) => a.type === k)) S.accts = S.accts.filter((a) => a.type !== k);
        else S.accts.push(mk(k));
        buildPicker(); buildAccounts(); results();
      }));
    }
    const dunnoBtn = document.getElementById("dunno");
    if (dunnoBtn) dunnoBtn.onclick = () => { setPath("ask"); document.getElementById("drawer")?.scrollIntoView({ behavior: "smooth", block: "center" }); };
    const addBtn = document.getElementById("add");
    if (addBtn) addBtn.onclick = () => { S.accts.push(mk("")); buildAccounts(); results(); };

    const wrapEl = document.getElementById("accts");
    function buildAccounts() {
      const emptyEl = document.getElementById("empty");
      if (emptyEl) emptyEl.style.display = S.accts.length ? "none" : "block";
      if (!wrapEl) return;
      wrapEl.innerHTML = S.accts.map((a) => {
        const t = a.type ? T(a.type) : null;
        const opts = TYPES.map((x) => `<option value="${x.k}" ${x.k === a.type ? "selected" : ""}>${x.n}</option>`).join("");
        if (!t) return `<div class="acct unset" data-id="${a.id}">
          <div class="nm"><div style="max-width:320px;width:100%"><label class="f">Account type</label>
            <select class="in" data-k="type"><option value="">Select an account…</option>${opts}</select></div>
            <button class="rm" data-rm="1" title="Remove">✕</button></div>
          <div class="tnote">Choose a type and the rest of the fields appear.</div></div>`;
        const bad = spanBad(a);
        return `<div class="acct" data-id="${a.id}">
          <div class="nm"><input data-k="name" value="${a.name.replace(/"/g, "&quot;")}" aria-label="Account name">
            <button class="rm" data-rm="1" title="Remove">✕</button></div>
          <div style="max-width:320px;margin-bottom:10px"><label class="f">Account type</label>
            <select class="in" data-k="type">${opts}</select></div>
          <label class="chk"><input type="checkbox" data-k="managed" ${a.managed ? "checked" : ""}>
            My adviser manages this account</label>
          <div style="margin-top:11px"><div class="seg">
            <button data-mode="range" class="${a.mode === "range" ? "on" : ""}">Give a range</button>
            <button data-mode="exact" class="${a.mode === "exact" ? "on" : ""}">I know the exact figure</button></div></div>
          <div class="fields">
            <div style="grid-column:1/-1"><label class="f">Current balance</label>
              ${a.mode === "range"
                ? `<div class="rangepair">
                    <div><input class="in ${bad ? "bad" : ""}" type="number" step="1000" data-k="lo" value="${a.lo}" aria-label="Low end"></div>
                    <span>to</span>
                    <div><input class="in ${bad ? "bad" : ""}" type="number" step="1000" data-k="hi" value="${a.hi}" aria-label="High end"></div>
                  </div>
                  ${bad
                    ? `<div class="err">Narrow this to $30,000 or less — a wider range makes the answer meaningless.
                        Until you do, the maths uses ${money(bal(a, "lo"))} – ${money(bal(a, "hi"))}.</div>`
                    : `<div class="hint">What's in the account today — not what you've contributed over the years.</div>`}`
                : `<input class="in" type="number" step="1000" data-k="exact" value="${a.exact}" style="max-width:320px">
                  <div class="hint">What's in the account today — not what you've contributed over the years.</div>`}</div>
            <div><label class="f">Advisory fee %/yr</label>
              <input class="in" type="number" step="0.01" data-k="fee" value="${a.fee}" ${(!a.managed || a.tiered) ? 'disabled style="opacity:.4"' : ""}></div>
            <div><label class="f">Fund expense ratio %</label><input class="in" type="number" step="0.01" data-k="er" value="${a.er}"></div>
            <div><label class="f">Other fees %/yr</label><input class="in" type="number" step="0.01" data-k="otherPct" value="${a.otherPct}"></div>
            <div><label class="f">Other flat fees $/yr</label><input class="in" type="number" step="25" data-k="otherFlat" value="${a.otherFlat}"></div>
            <div><label class="f">One-time cost to move $</label><input class="in" type="number" step="100" data-k="move" value="${a.move}"></div>
          </div>
          <div class="flagnote">${t.ask}</div>
          <details class="tier" ${a.tiered ? "open" : ""}>
            <summary>Tiered pricing — the rate changes as the balance grows</summary>
            <div style="margin-top:10px">
              <label class="chk"><input type="checkbox" data-k="tiered" ${a.tiered ? "checked" : ""}> Use a tiered schedule</label>
              ${a.tiered
                ? `<div class="seg" style="margin-top:11px">
                    <button data-tt="graduated" class="${a.tierType === "graduated" ? "on" : ""}">Graduated</button>
                    <button data-tt="flat" class="${a.tierType === "flat" ? "on" : ""}">Whole balance</button></div>
                  <div>${a.tiers.map((x, i) => `<div class="trow">
                    <div><label class="f">${x.upTo == null ? "Everything above" : "Up to"}</label>
                      ${x.upTo == null
                        ? `<div class="in" style="border-bottom-color:transparent;color:color-mix(in srgb, var(--color-text) 55%, transparent)">— top tier —</div>`
                        : `<input class="in" type="number" step="50000" data-tier="${i}" data-tk="upTo" value="${x.upTo}">`}</div>
                    <div><label class="f">Rate %/yr</label>
                      <input class="in" type="number" step="0.01" data-tier="${i}" data-tk="rate" value="${x.rate}"></div>
                    <div>${a.tiers.length > 2 && x.upTo != null ? `<button class="rm" data-trm="${i}">✕</button>` : ""}</div></div>`).join("")}
                    <button class="btn sm ghost" data-tadd="1" style="margin-top:4px">+ Add tier</button>
                    <div class="tnote"><b>Graduated</b> charges each slice at its own rate. <b>Whole balance</b> charges
                      everything at the rate of the tier you land in. Providers use both — worth asking which applies.</div>
                  </div>`
                : ""}
            </div></details></div>`;
      }).join("");
      wireAccts();
    }
    function wireAccts() {
      if (!wrapEl) return;
      wrapEl.querySelectorAll(".acct").forEach((el) => {
        const a = S.accts.find((x) => x.id === +el.dataset.id);
        el.querySelectorAll("[data-k]").forEach((inp) => {
          const k = inp.dataset.k, ev = (inp.tagName === "SELECT" || inp.type === "checkbox") ? "change" : "input";
          inp.addEventListener(ev, (e) => {
            if (k === "type") {
              const v = e.target.value;
              if (v && v !== "other" && S.accts.some((x) => x.id !== a.id && x.type === v)) { e.target.value = a.type; return; }
              a.type = v;
              if (v) { if (!a.name || TYPES.some((t) => t.n === a.name)) a.name = T(v).n; a.managed = !T(v).unmanaged; }
              buildPicker(); buildAccounts(); results(); return;
            }
            if (k === "tiered" || k === "managed") { a[k] = e.target.checked; buildAccounts(); results(); return; }
            if (k === "name") { a.name = e.target.value; results(); return; }
            a[k] = parseFloat(e.target.value) || 0;
            if (k === "lo" || k === "hi") {
              const pos = e.target.selectionStart;
              buildAccounts();
              const f = wrapEl.querySelector(`.acct[data-id="${a.id}"] [data-k="${k}"]`);
              if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (_) {} }
            }
            results();
          });
        });
        el.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { a.mode = b.dataset.mode; buildAccounts(); results(); }));
        el.querySelectorAll("[data-tt]").forEach((b) => (b.onclick = () => { a.tierType = b.dataset.tt; buildAccounts(); results(); }));
        el.querySelectorAll("[data-tier]").forEach((inp) => inp.addEventListener("input", (e) => {
          a.tiers[+inp.dataset.tier][inp.dataset.tk] = parseFloat(e.target.value) || 0; results();
        }));
        const ta = el.querySelector("[data-tadd]");
        if (ta) ta.onclick = () => {
          const last = a.tiers[a.tiers.length - 1];
          a.tiers.splice(a.tiers.length - 1, 0, { upTo: (a.tiers[a.tiers.length - 2]?.upTo || 500000) * 2, rate: last.rate });
          buildAccounts(); results();
        };
        el.querySelectorAll("[data-trm]").forEach((b) => (b.onclick = () => { a.tiers.splice(+b.dataset.trm, 1); buildAccounts(); results(); }));
        el.querySelector("[data-rm]").onclick = () => { S.accts = S.accts.filter((x) => x.id !== a.id); buildPicker(); buildAccounts(); results(); };
      });
    }
    [["a-ret", "ret"], ["a-yrs", "yrs"], ["a-add", "add"], ["d-er", "diyEr"], ["d-flat", "diyFlat"], ["v-fee", "advFee"], ["v-every", "advEvery"]]
      .forEach(([id, k]) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", (e) => { S[k] = parseFloat(e.target.value) || 0; results(); });
      });

    function results() {
      const list = ready();
      topSample();
      const privtext = document.getElementById("privtext");
      if (privtext) {
        privtext.innerHTML = S.path === "ask"
          ? `Your balances stay in this browser. The email you send goes straight from your own inbox to your
             provider — <b>PriorityPay never sees this message or any reply</b>. Nothing on this page is
             transmitted anywhere.`
          : `Everything on this page stays in this browser. Nothing has been transmitted, there's no account, and
             there's nothing for us to lose.`;
      }

      const sample = !list.length;
      ACTIVE = sample ? SAMPLE : list;
      document.getElementById("rescard")?.classList.toggle("sampling", sample);
      const samplebar = document.getElementById("samplebar");
      if (samplebar) {
        samplebar.innerHTML = sample
          ? `<span class="samplechip">Sample</span><span>Made-up numbers, shown so you can see the scale.
              Pick your accounts in step 1 to replace them with your own.</span>` : "";
      }
      const eyebrowEl = document.getElementById("eyebrow");
      if (eyebrowEl) eyebrowEl.textContent = sample ? "An example — not your numbers" : "If these numbers are accurate";
      const togEl = document.getElementById("tog");
      if (togEl) togEl.style.display = "block";

      const S_ = (ov) => ({ lo: total(ov, "lo"), hi: total(ov, "hi") });
      const cur = S_(null), diy = S_({ pct: S.diyEr, flat: S.diyFlat }), zero = S_({ pct: 0, flat: 0, nomove: true }),
        adv = S_({ pct: S.diyEr, flat: S.diyFlat, fee: S.advFee, every: S.advEvery });
      const rows = [
        { lab: "As it stands", r: cur, c: "var(--color-accent-400)" },
        { lab: `Paid advice — ${money(S.advFee)} every ${Math.max(1, Math.round(S.advEvery))} yr`, r: adv, c: "var(--color-accent-600)" },
        { lab: `Self-managed — ${S.diyEr}% funds only`, r: diy, c: "var(--color-accent-800)" },
      ];
      const max = Math.max(...rows.map((x) => x.r.hi.end), 1);
      const startLo = ACTIVE.reduce((s, a) => s + bal(a, "lo"), 0), startHi = ACTIVE.reduce((s, a) => s + bal(a, "hi"), 0);
      const anyRange = ACTIVE.some(isRange);
      const mv = ACTIVE.reduce((s, a) => s + (+a.move || 0), 0);

      const fgLo = zero.lo.end - cur.lo.end, fgHi = zero.hi.end - cur.hi.end;
      const grLo = fgLo - cur.lo.fees, grHi = fgHi - cur.hi.fees;
      const heroEl = document.getElementById("hero");
      if (heroEl) heroEl.textContent = span(cur.lo.fees, cur.hi.fees);
      const herosubEl = document.getElementById("herosub");
      if (herosubEl) herosubEl.innerHTML = `leaves these accounts as fees over
        ${Math.round(S.yrs)} years as things stand — every advisory fee, fund expense and charge added together,
        year after year.`;
      const hero2El = document.getElementById("hero2");
      if (hero2El) hero2El.textContent = span(fgLo, fgHi);
      const herosub2El = document.getElementById("herosub2");
      if (herosub2El) {
        herosub2El.innerHTML = `is the full cost, because fees don't only cost you the fee.
          Every dollar taken out also stops earning. So this is the <b>${span(cur.lo.fees, cur.hi.fees)}</b> paid,
          plus the <b>${span(grLo, grHi)}</b> those same dollars would have earned had they stayed invested and
          compounding for the rest of the ${Math.round(S.yrs)} years.<br><br>
          It's measured against paying nothing at all, on the same assumed return — and nobody pays nothing, so read
          it as the outer bound of what fees cost rather than as money anyone could actually keep.`;
      }
      const tyEl = document.getElementById("ty");
      if (tyEl) tyEl.textContent = Math.round(S.yrs);
      const figsubEl = document.getElementById("figsub");
      if (figsubEl) {
        figsubEl.textContent =
          `Starting from ${span(startLo, startHi)} across ${ACTIVE.length} account${ACTIVE.length > 1 ? "s" : ""}, ${S.ret}% assumed return, fees deducted yearly` +
          (mv ? `, ${money(mv)} of one-time moving costs applied to every alternative` : "") + ".";
      }

      const viz = document.getElementById("viz");
      if (viz) {
        if (S.table) {
          viz.innerHTML = `<div class="tv-wrap"><table class="tv"><tr><th>Scenario</th><th class="n">Total fees</th><th class="n">Ending value</th></tr>
            ${rows.map((x) => `<tr><td>${x.lab}</td><td class="n">${span(x.r.lo.fees, x.r.hi.fees)}</td>
              <td class="n">${span(x.r.lo.end, x.r.hi.end)}</td></tr>`).join("")}</table></div>`;
        } else {
          viz.innerHTML = rows.map((x) => `<div class="bar-row" data-f="${span(x.r.lo.fees, x.r.hi.fees)}">
              <div class="bar-lab"><span>${x.lab}</span><b>${span(x.r.lo.end, x.r.hi.end)}</b></div>
              <div class="track">
                <div class="bar tail" style="width:${(x.r.hi.end / max * 100).toFixed(1)}%;background:${x.c}"></div>
                <div class="bar" style="width:${(x.r.lo.end / max * 100).toFixed(1)}%;background:${x.c}"></div>
              </div>
              <div class="bar-fee">${span(x.r.lo.fees, x.r.hi.fees)} paid in fees along the way</div></div>`).join("") +
            `<div class="axis"><span>$0</span><span>${money(max)}</span></div>
             ${anyRange ? `<div class="tnote">Solid is the low end of your ranges, the lighter tail the high end.</div>` : ""}
             <div class="tip" id="tip"></div>`;
          const tip = document.getElementById("tip");
          viz.querySelectorAll(".bar").forEach((bar) => {
            bar.onmousemove = (e) => {
              const row = bar.closest(".bar-row");
              tip.innerHTML = row.querySelector("span").textContent + " — " + row.querySelector("b").textContent +
                " &nbsp;·&nbsp; " + row.dataset.f + " in fees";
              const box = viz.getBoundingClientRect();
              tip.style.left = Math.min(e.clientX - box.left + 12, Math.max(0, box.width - 280)) + "px";
              tip.style.top = (e.clientY - box.top - 40) + "px"; tip.style.opacity = 1;
            };
            bar.onmouseleave = () => { tip.style.opacity = 0; };
          });
        }
      }
      if (togEl) togEl.textContent = S.table ? "Show as chart" : "Show as table";

      const perAcctEl = document.getElementById("perAcct");
      if (perAcctEl) {
        perAcctEl.innerHTML = `
          <div class="figtitle">By account, at today's balance</div>
          <div class="figsub">The all-in rate each account is carrying right now.</div>
          <div class="tv-wrap"><table class="tv"><tr><th>Account</th><th class="n">Balance</th><th class="n">All-in %</th><th class="n">Yearly cost</th></tr>
          ${ACTIVE.map((a) => {
            const bl = bal(a, "lo"), bh = bal(a, "hi");
            const pc = (b) => (b ? ((b * ((a.managed ? advRate(a, b) : 0) + (a.er || 0) / 100 + (a.otherPct || 0) / 100) + (a.otherFlat || 0)) / b) * 100 : 0);
            const pl = pc(bl), ph = pc(bh);
            const pct = pl.toFixed(2) === ph.toFixed(2) ? `${pl.toFixed(2)}%` : `${ph.toFixed(2)}–${pl.toFixed(2)}%`;
            return `<tr><td>${a.name || T(a.type).n}${a.managed ? "" : `<div style="font-size:11px;color:color-mix(in srgb, var(--color-text) 55%, transparent)">no adviser fee</div>`}</td>
              <td class="n">${span(bl, bh)}</td><td class="n">${pct}</td>
              <td class="n">${span(bl * pl / 100, bh * ph / 100)}</td></tr>`;
          }).join("")}</table></div>`;
      }

      const discEl = document.getElementById("disc");
      if (discEl) {
        discEl.innerHTML = `These are illustrations of the figures entered — not a description
          of your accounts, not a projection, and not a recommendation to do any of them. Every scenario assumes the
          same return, which is the single biggest assumption on this page. Cost is one input among many: tax
          planning, withdrawal sequencing, estate work, and having someone talk you out of selling in a bad year
          aren't modeled here at all.`;
      }
    }

    function topSample() {
      const box = document.getElementById("topsample");
      if (!box) return;
      const live = ready(), sample = !live.length;
      const prev = ACTIVE; ACTIVE = sample ? SAMPLE : live;
      const cur = { lo: total(null, "lo"), hi: total(null, "hi") };
      const zero = { lo: total({ pct: 0, flat: 0, nomove: true }, "lo"), hi: total({ pct: 0, flat: 0, nomove: true }, "hi") };
      const startLo = ACTIVE.reduce((t, a) => t + bal(a, "lo"), 0), startHi = ACTIVE.reduce((t, a) => t + bal(a, "hi"), 0);
      const costLo = ACTIVE.reduce((t, a) => { const b = bal(a, "lo"); return t + b * ((a.managed ? advRate(a, b) : 0) + (a.er || 0) / 100 + (a.otherPct || 0) / 100) + (a.otherFlat || 0); }, 0);
      ACTIVE = prev;
      const rate = startLo ? (costLo / startLo * 100).toFixed(2) : "0.00";

      box.innerHTML = `<div class="kpiwrap">
        ${sample ? `<span class="samplechip">Sample at ${rate}% all-in</span>`
                 : `<span class="eyebrow" style="display:block;margin:0 0 2px">Your figures at ${rate}% all-in</span>`}
        <div class="kpis">
          <div class="kpi"><div class="lab">Current account balance</div>
            <div class="val">${span(startLo, startHi)}</div></div>
          <div class="kpi"><div class="lab">Fees paid over ${Math.round(S.yrs)} years</div>
            <div class="val">${span(cur.lo.fees, cur.hi.fees)}</div></div>
          <div class="kpi lead"><div class="lab">Total cost (fees + interest forgone from fees) over ${Math.round(S.yrs)} years</div>
            <div class="val">${span(zero.lo.end - cur.lo.end, zero.hi.end - cur.hi.end)}</div></div>
        </div>
        <div class="kpinote">This is what an <b>all-in cost of ${rate}% on ${span(startLo, startHi)}</b> over
          ${Math.round(S.yrs)} years looks like.${sample
            ? ` Made-up figures, shown so the scale is concrete — pick your accounts below to replace them with your own.`
            : ` Based on what you've entered below.`}</div>
        <div class="kpidisc">An illustration of the figures shown — not a projection, and not a recommendation to
          do anything. It assumes a constant ${S.ret}% return every year, which no real portfolio delivers, and
          cost is only one part of the picture.</div>
      </div>`;
    }

    // Plain-text mirror of the email body, used for the mailto: draft --
    // kept in sync with the HTML preview in emailView() below by hand,
    // since a mailto body can't render markup.
    function plainTextEmail() {
      const name = S.firstName || "[your name]";
      return `Hi there,

I'm putting together a complete picture of my finances. Could you send me the following in writing?

1. A list of every account you hold for me, with the type of each one -- for example traditional IRA, Roth IRA, rollover IRA, inherited IRA, taxable brokerage, trust, custodial account, 529, HSA, annuity, or cash-value life insurance.
2. The current balance of each account, listed separately.
3. The advisory fee rate currently applied to each account, and whether it differs from your published schedule for any reason.
4. Total fees charged to each account last calendar year, in dollars.
5. The weighted average expense ratio of the funds held in each account.
6. Any surrender charges that would apply to annuity or insurance products I hold.
7. Your published fee schedule, including every breakpoint, and whether the tiers are graduated (each slice at its own rate) or whether the whole balance is charged at one tier's rate.
8. Your standard schedule of other charges, including platform/custodial/administrative fees, wrap program fees, trading/transaction/commission costs, annual account or maintenance fees, financial planning or retainer fees billed separately, 12b-1 fees or revenue sharing, and termination or transfer-out (ACAT) fees.

No need to attach statements. Email is easiest for me -- I'd like this written down so I can put it alongside everything else. Happy to talk it through afterward.

Thanks,
${name}`;
    }

    function emailView() {
      const name = S.firstName || "[your name]", prov = S.provider || "[your provider]";
      return `<div class="one">
        <div class="askbody">
          <div class="eyebrow" style="margin-top:26px">Who you're asking</div>
          <label class="f">Your first name</label><input class="in" id="q-first" value="${S.firstName}" style="max-width:300px">
          <label class="f" style="margin-top:14px">Who holds the account</label><input class="in" id="q-prov" value="${S.provider}" style="max-width:300px">
          <label class="f" style="margin-top:14px">Their email address</label><input class="in" id="q-em" value="${S.providerEmail}" placeholder="advisor@firm.com" style="max-width:300px">
          <div style="margin-top:22px"><button class="btn" id="q-send">Send now</button></div>
          <div class="flag" style="margin-top:20px"><b>Everything goes to one place.</b><br>
            This opens a draft in your own mail app, addressed to your provider. <b>PriorityPay never sees this
            message or any reply</b> -- their answer comes back to your inbox, and you type the numbers into
            step 2 on the left yourself.</div>
          <div class="tnote" style="margin-top:14px">Nothing here is sent by PriorityPay. The draft opens in your
            own mail app so you can review it, edit it, and send it yourself.</div>

          <div class="eyebrow" style="margin-top:30px">The message</div>
          <div class="email">
            <div class="hdr"><b>From:</b> you &nbsp;·&nbsp; <b>To:</b> ${S.providerEmail || "your provider"}<br>
              <b>Subject:</b> Request — account list, balances and fee details in writing</div>
            <p style="margin:0 0 9px">Hi there,</p>
            <p style="margin:0 0 9px">I'm putting together a complete picture of my finances. Could you send me the
              following in writing?</p>
            <h5>Please send these to me in writing</h5>
            <ol>
              <li><b>A list of every account you hold for me</b>, with the type of each one — for example
                traditional IRA, Roth IRA, rollover IRA, inherited IRA, taxable brokerage, trust, custodial account,
                529, HSA, annuity, or cash-value life insurance.</li>
              <li><b>The current balance of each account</b>, listed separately.</li>
              <li><b>The advisory fee rate currently applied to each account</b>, and whether it differs from your
                published schedule for any reason.</li>
              <li><b>Total fees charged to each account last calendar year, in dollars.</b></li>
              <li><b>The weighted average expense ratio</b> of the funds held in each account.</li>
              <li><b>Any surrender charges</b> that would apply to annuity or insurance products I hold.</li>
              <li><b>Your published fee schedule</b>, including every breakpoint, and whether the tiers are
                graduated (each slice at its own rate) or whether the whole balance is charged at one tier's rate.</li>
              <li><b>Your standard schedule of other charges</b>, including:
                <ul><li>Platform, custodial, or administrative fees</li>
                  <li>Wrap program fees</li>
                  <li>Trading, transaction, or commission costs</li>
                  <li>Annual account or maintenance fees</li>
                  <li>Financial planning or retainer fees billed separately</li>
                  <li>12b-1 fees or revenue sharing</li>
                  <li>Termination or transfer-out (ACAT) fees</li></ul></li>
            </ol>
            <p style="margin:0 0 9px">No need to attach statements. Email is easiest for me — I'd like this written
              down so I can put it alongside everything else. Happy to talk it through afterward.</p>
            <p style="margin:0">Thanks,<br>${name}</p>
          </div>
          <div class="tnote" style="margin-top:10px">Addressed to ${prov}. Opens in your own mail app, so your
            provider sees your address as the sender.</div>
        </div></div>`;
    }
    function renderDrawer() {
      if (!drawer) return;
      drawer.innerHTML = emailView();
      bindAsk(); results();
    }
    function bindAsk() {
      [["q-first", "firstName"], ["q-prov", "provider"], ["q-em", "providerEmail"]].forEach(([id, key]) => {
        const el = document.getElementById(id); if (!el) return;
        el.addEventListener("input", (e) => {
          S[key] = e.target.value; const pos = e.target.selectionStart;
          renderDrawer();
          const f = document.getElementById(id); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (_) {} }
        });
      });
      const s = document.getElementById("q-send");
      if (s) s.onclick = () => {
        const subject = "Request — account list, balances and fee details in writing";
        const body = plainTextEmail();
        const to = (S.providerEmail || "").trim();
        const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = url;
        s.textContent = "Opening your mail app…";
        setTimeout(() => { s.textContent = "Send now"; }, 2200);
      };
    }
    function setPath(p) {
      S.path = p;
      document.getElementById("p-know")?.classList.toggle("on", p === "know");
      document.getElementById("p-ask")?.classList.toggle("on", p === "ask");
      drawer?.classList.toggle("open", p === "ask");
      const gridEl = root.querySelector(".grid");
      if (gridEl) gridEl.style.display = p === "ask" ? "none" : "";
      if (p === "ask") { renderDrawer(); } else { results(); }
    }

    const root = rootRef.current;
    const drawer = document.getElementById("drawer");
    const pKnowBtn = document.getElementById("p-know");
    const pAskBtn = document.getElementById("p-ask");
    const togBtn = document.getElementById("tog");
    if (pKnowBtn) pKnowBtn.onclick = () => setPath("know");
    if (pAskBtn) pAskBtn.onclick = () => setPath("ask");
    if (togBtn) togBtn.onclick = () => { S.table = !S.table; results(); };

    buildPicker(); buildAccounts(); results();
  }, []);

  return (
    <div style={LEDGER_TOKENS}>
      <PublicHeader />
      <style dangerouslySetInnerHTML={{ __html: FEE_CHECK_CSS }} />
      <div className="pp-fee-check" ref={rootRef}>
        <div className="wrap">
          <div className="pagehead">
            <h1>Advisory Fee Calculator</h1>
            <p>
              See what your advisory fee actually costs over time, compared to paying for advice a la carte or
              managing your own investments. Free, no account needed, and everything stays in your browser.
            </p>
          </div>

          <div className="intro" id="intro">
            <div className="introtext">
              <div className="big">
                1% fee = ~25% of end portfolio <small>(not 1% of your money)</small>
              </div>
              <p>
                Because the fee compounds against you every year, it takes a share of the ending balance far larger
                than the rate suggests.
              </p>
            </div>
            <div id="topsample" />
          </div>

          <div className="paths">
            <button className="path on" id="p-know">
              <span className="h">I have my numbers</span>
              <span className="s">Enter what you know. Ranges are fine — you can sharpen them later.</span>
            </button>
            <button className="path" id="p-ask">
              <span className="h">Help — I don't know my numbers or accounts</span>
              <span className="s">We'll write the email. You send it from your own inbox.</span>
            </button>
          </div>
          <div className="drawer" id="drawer" />

          <div className="grid">
            <div>
              <div className="card">
                <h3>
                  <em>Step 1</em>Which accounts do you have?
                </h3>
                <p className="sub">
                  A firm doesn't hold one pot of money — it usually holds several separate accounts, each
                  with its own statement and often its own rate. Pick everything that applies. If you're not sure,
                  that's the normal answer, and there's a button for it.
                </p>
                <div className="picker" id="picker" />
                <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <button className="btn ghost sm" id="dunno">I don't know — help me find out</button>
                  <span className="tnote" style={{ margin: 0 }}>Opens the email that asks them to list everything.</span>
                </div>
              </div>

              <div className="card">
                <h3>
                  <em>Step 2</em>What does each one hold, and cost?
                </h3>
                <p className="sub">
                  Give a range if you don't know the exact figure — but keep it tight, within $30,000,
                  so the answer stays meaningful. Every result is then shown as a range too.
                </p>
                <div id="accts" />
                <div id="empty" className="tnote" style={{ display: "none", marginBottom: 14 }}>
                  Nothing selected yet — pick an account type above, or add one below.
                </div>
                <button className="btn sm ghost" id="add">+ Add another account</button>
                <div className="tnote">For anything not in the list above.</div>
              </div>

              <div className="card">
                <h3>Assumptions</h3>
                <p className="sub">Identical across every scenario — only the fees change between them.</p>
                <div className="fields" style={{ maxWidth: 460 }}>
                  <div><label className="f">Assumed yearly return</label><input className="in" id="a-ret" type="number" step="0.1" defaultValue="7" /></div>
                  <div><label className="f">Years</label><input className="in" id="a-yrs" type="number" step="1" defaultValue="30" /></div>
                  <div><label className="f">Added per year (total)</label><input className="in" id="a-add" type="number" step="500" defaultValue="0" /></div>
                </div>
              </div>

              <div className="card">
                <h3>Paying for advice on its own</h3>
                <p className="sub">
                  A middle path: you hold the funds yourself, and pay a professional a set fee for a
                  plan or a review when you want one — rather than a percentage of everything, every year, forever.
                </p>
                <div className="fields" style={{ maxWidth: 420 }}>
                  <div><label className="f">Cost per engagement $</label><input className="in" id="v-fee" type="number" step="100" defaultValue="2500" /></div>
                  <div><label className="f">How often, in years</label><input className="in" id="v-every" type="number" step="1" defaultValue="3" /></div>
                </div>
                <div className="tnote" style={{ marginTop: 14 }}>
                  These are placeholder figures, not a quote and not a market rate — advice-only and flat-fee
                  planners price very differently from one another, and the only number worth modelling is one you
                  have actually been quoted. The scenario charges this amount every <b>N</b> years and otherwise
                  holds the same funds as the self-managed case.
                </div>
                <div className="tnote" style={{ marginTop: 10 }}>
                  Whether a person is better served by ongoing management, periodic advice, or neither is not
                  something this page can answer. It only shows what each costs.
                </div>
              </div>

              <div className="card">
                <h3>The self-managed scenario</h3>
                <p className="sub">
                  What the same money looks like with no advisory layer on top — holding funds directly and
                  paying only what the funds themselves charge. These figures are yours to set.
                </p>
                <div className="fields" style={{ maxWidth: 420 }}>
                  <div><label className="f">Fund expense ratio %/yr</label><input className="in" id="d-er" type="number" step="0.01" defaultValue="0.10" /></div>
                  <div><label className="f">Platform fees $/yr</label><input className="in" id="d-flat" type="number" step="10" defaultValue="0" /></div>
                </div>
                <div className="tnote" style={{ marginTop: 14 }}>
                  Broad index funds commonly charge between <b>0.03% and 0.20%</b> a year; actively managed funds
                  charge considerably more. One-time costs of moving are set per account in step 2, since they
                  differ sharply by account type.
                </div>
                <div className="tnote" style={{ marginTop: 10 }}>
                  <b>What this scenario does not model:</b> it compares costs only. It assumes identical returns
                  to every other scenario — the same holdings, the same discipline in a downturn, the same
                  rebalancing, the same tax handling. It carries no view on whether that's realistic for any
                  particular person, and it is not a suggestion to do it.
                </div>
              </div>
            </div>

            <div className="right" id="rightcol">
              <div className="card" id="rescard">
                <div className="eyebrow" id="eyebrow">If these numbers are accurate</div>
                <div className="samplebar" id="samplebar" />
                <div id="perAcct" />
                <div style={{ marginTop: 24 }}>
                  <div className="figtitle">Ending value after <span id="ty">30</span> years, by yearly cost</div>
                  <div className="figsub" id="figsub" />
                  <div className="viz" id="viz" />
                  <button className="lnkbtn" id="tog">Show as table</button>
                </div>
                <div className="totalblock">
                  <div className="eyebrow">What you pay in fees</div>
                  <div className="hero" id="hero">—</div>
                  <div className="herosub" id="herosub" />
                  <div className="totalblock second">
                    <div className="eyebrow">Estimated total forgone due to fees</div>
                    <div className="hero lg" id="hero2">—</div>
                    <div className="herosub" id="herosub2" />
                  </div>
                </div>
                <div className="disc" id="disc" />
                <div className="privacy"><b>What leaves this page</b><span id="privtext" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
