# PriorityPay Simple — Project Handoff

Last updated: August 15, 2026

This document is the narrative history and working context for this
project — what it is, why it's built the way it is, exactly how each part
of it is supposed to function, what's been shipped, what's still open, and
the specific traps a new developer will otherwise rediscover the hard way.

## How to get full context on this project

If you're picking this up cold — whether that's a developer, a
contractor, or future-Megan six months from now — there are three sources
of context, in this order:

1. **This document.** Read it start to finish before touching code. It's
   the only place the *why* behind decisions, the known rough edges, and
   the intended behavior of every screen are written down in one spot.
2. **`git log --oneline`** (or `git log` for full messages) in the repo.
   Every commit in this project's history has a specific, descriptive
   message explaining what changed and why — not generic messages like
   "fix bug" or "update page." Treat it as a dated changelog you can
   search (`git log --oneline -- components/Homepage.js` to see just that
   file's history, for example).
3. **Inline code comments.** This codebase leans heavily on explaining
   *why* directly above the function or block in question, not just what
   it does — especially `lib/allocations.js`, `lib/runSplit.js`,
   `lib/plaidSync.js`, and the API routes under `app/api/**`. Read the
   comment block before changing anything it's attached to.

Raw chat/session transcripts from building this were deliberately **not**
exported or attached anywhere — they're full of dead ends, back-and-forth,
and tooling noise that would take longer to read than the code itself.
Everything actually worth keeping from those sessions has been distilled
into the three sources above. If a future assistant or developer is ever
asked to "review the chat history" for context on this project, point them
here instead.

`README.md` (same repo) covers the fourth thing this document doesn't:
*how to actually run and deploy* the app — required accounts, environment
variables, and the checklist for cutting over from sandbox to real money.

---

## 1. What this product is

PriorityPay Simple is a percentage-only-split fork of a larger app called
PriorityPay. It's built for self-employed people — freelancers, sole
proprietors, single-member LLCs, S-Corps — and anyone with side income,
even alongside a W2 job. The core idea: connect every account or app you
get paid through, set a percentage split once (Tax Reserve, retirement,
savings, business expenses, whatever you want), and every future deposit
is automatically divided the moment it lands. Spend whatever's left in
checking without doing mental math.

PriorityPay Simple **moves money between accounts the user already owns
and controls**. It is not a bank, broker-dealer, or investment adviser,
and never holds or invests funds itself — that framing shows up
consistently in the product copy and matters legally, not just as
marketing language.

- Live: https://prioritypay-simple.vercel.app
- Repo: `meganmahoney123/prioritypay-simple` on GitHub, `main` branch
- Deploys: Vercel, auto-deploy on push to `main`
- Currently running entirely in **Plaid Sandbox** and **Dwolla Sandbox** —
  fake banks, fake money, zero real financial risk. See README.md's "Going
  to production" section for what changes when that flips.

## 2. Tech stack

- **Next.js 14, App Router.** No separate backend — every sensitive
  operation (Plaid, Dwolla, Supabase service-role writes) happens in
  `app/api/**` route handlers, never in the browser.
- **Supabase** — Postgres + Auth. All tables are prefixed `simple_`
  (`simple_accounts`, `simple_split_rules_percent`, `simple_transfers`,
  `simple_transfer_allocations`, `simple_profiles`, `simple_monthly_closeouts`,
  `simple_closeout_transactions`) to distinguish this fork's schema.
  Row-level security exists, but every write from an API route goes
  through `supabaseAdmin()` (`lib/supabaseServer.js`), which uses the
  service-role key and bypasses RLS entirely — auth is enforced by
  `requireUser()` (`lib/apiAuth.js`) at the top of every route instead.
- **Plaid** (`plaid` + `react-plaid-link`) — account linking and
  transaction data. Sandbox environment (`PLAID_ENV=sandbox`).
- **Dwolla** (`dwolla-v2`) — the ACH rails that actually move money
  between a user's connected accounts once a deposit is detected and
  split. Sandbox environment.
- **Tailwind, lucide-react, Recharts** for UI.

## 3. Core product model

Every user has a set of **percent split rules** (`simple_split_rules_percent`)
— rows with a label, a percentage, an optional connected account, and an
optional group (`Investments` or `Retirement`, for categories that can have
multiple sub-accounts). Seven rows exist by default (Tax Reserve,
Investments, Solo 401k, SEP IRA, Emergency Fund, Business Expenses/OPEX,
Savings); any of the non-core ones can be renamed or deleted, and custom
categories can be added freely. Solo 401k and SEP IRA are grouped under
"Retirement"; users must already have (or separately open) those actual
retirement accounts elsewhere — PriorityPay Simple only routes money into
them, it never opens or manages them.

When a deposit lands in a connected account, Plaid's webhook
(`app/api/plaid/webhook`) fires, and `lib/runSplit.js` computes the split
(`lib/allocations.js` → `computeAllocations`). What happens next depends on
`TRANSFER_EXECUTION_MODE` (`lib/executionMode.js`): in the default
**manual_approval** mode, PriorityPay never touches money itself -- it
generates a "Transfers waiting on you" checklist (see `PendingTransfers`)
that the user completes themselves, in their own banking app. Only if
`TRANSFER_EXECUTION_MODE=dwolla_auto` is explicitly set does it fire real
Dwolla transfers automatically instead. The same split math also powers the
manual "Split $X now" button and the live previews shown in Split Rules and
onboarding, so what a user previews is provably what the checklist (or, in
dwolla_auto mode, the real transfer) will show.

**Monthly Close-Out** (`app/(app)/closeout`) is a separate, later step: it
pulls every real transaction for a given month, has the user confirm
income vs. expense vs. internal-transfer-to-exclude (with a best-guess
auto-tag to start from), flags W2 paychecks separately so they don't
inflate retirement contribution room, and recommends Tax Reserve /
Solo 401k / SEP IRA contributions based on real confirmed net income. Once
a month is confirmed, it is **permanently locked** — this is intentional,
not a bug (see gotcha below).

## 4. How each part of the product is supposed to function

This section is the closest thing to a functional spec — what should
happen on each screen, so a developer can tell "working as designed" apart
from "regression" without having to guess.

**Homepage (public, logged out)** — `components/Homepage.js`. Hero with
headline/subhead and two CTAs (Get started free / Log in), plus a
disclaimer line that PriorityPay doesn't manage or invest money. A "how it
works" 3-step explainer (deposit lands → split by percentages → spend
guilt free). A comparison section with a mock "Total saved" card. A
"Never get surprised" mock preview. A "3 Simple Onboarding Steps" section
laid out as three cards (connect accounts/apps, with a real auto-scrolling
logo carousel of supported banks and apps below it; set percentages, with
a mock bucket-and-percentage card; spend the rest). A Close-Out preview.
An FAQ accordion (six questions, opens the first one by default, covers
eligibility and how money movement works). A final CTA. Copy throughout
has been through many specific, deliberate rounds of wording changes —
check `git log --oneline -- components/Homepage.js` before assuming any
phrase is arbitrary or safe to casually rewrite.

**Onboarding wizard (new signup)** — `app/onboarding/page.js`. Linear,
five steps, can't skip ahead: Welcome → Business (business name + entity
type: Sole proprietor/freelancer, LLC, or S-Corp) → Connect Accounts (a
"Connect Account" button plus a "Connect More Apps" catch-all; at least
one connected account is required to continue) → Percentage Splits (the
exact same `PercentSplitEditor` component used later in the in-app Split
Rules page — same rules, same 7 default categories pre-filled at 75%
total combined, same 100% cap, same "add your own category" flow, plus a
minimum-deposit-to-split input with a $100 floor, see PHASE I,
`supabase/schema.sql`) → Review, which submits everything to `POST
/api/onboarding/complete` and creates the real split rules server-side.
Whatever a user sees and sets here is not a preview that gets redone
later — it's the same data model as Split Rules from day one.

There is no Identity step and no Venmo/PayPal/Cash App quick-connect
buttons — both existed at one point and were deliberately removed. The
Identity step (real Dwolla KYC) only made sense back when Dwolla
originated transfers on someone's behalf; manual-approval mode means
PriorityPay never touches money, so there's nothing left that requires
verifying identity before connecting accounts (removed rather than left
as a skippable step, so it doesn't quietly collect SSNs for no reason).
The Venmo/PayPal/Cash App buttons were removed because none of those can
actually be linked as a Plaid institution — see the "can Plaid see
Venmo/Cash App deposits" reasoning: Plaid only sees money after it's been
transferred out to a real linked bank account, never a balance sitting
inside one of those apps.

**Dashboard (main logged-in home)** — `app/(app)/dashboard/page.js` +
`components/AccountBalances.js` + `components/MoneyDistributionChart.js`.
Three things happen here: (1) a "Total saved since joining PriorityPay"
figure — the all-time sum of every dollar PriorityPay has ever actually
routed via the split engine, not a snapshot of account balances; (2)
account balances grouped into Retirement (Solo 401k/SEP IRA sub-accounts),
Investments, and "Other connected accounts" (everything else) — each row
shows the connected account's live Plaid balance alongside
*PriorityPay-tracked* "this year" / "this month" totals for that specific
category, which is deliberately a different number than the account's own
balance or transaction history (a connected account's balance can move
for reasons that have nothing to do with PriorityPay's own splits); (3) a
real pie chart of how deposits have actually split, switchable between a
single navigable month (back/forward arrows, gated so you can't page back
before the account's own signup date) or a rolled-up trailing 6 or 12
months. Non-dismissible warnings appear if Investments or Retirement are
still sitting at 0% allocated, nudging the user to fund them.

**Accounts** — `app/(app)/accounts/page.js`. If Dwolla identity isn't
verified yet, this page shows the identity form instead of anything else
— no accounts can be linked before that's done. Once verified: a "Connect
a bank account or app" button, the same Venmo/PayPal/Cash App quick-connect
row as onboarding, and a "Connect More Apps" catch-all. Every linked
account renders as a card (institution, account name, masked account
number, an "Active" badge) with one of two states underneath: "Deposits
here split automatically" (the normal, expected state — Plaid's sync
cursor is established and the webhook is watching it), or an amber warning
plus an "Enable auto-detect" button, which only appears for accounts
linked before the auto-detect webhook flow existed, or for accounts
created through the dev seed tooling (section 6) that bypassed the normal
Plaid Link flow. A real user linking a real account through this page
should never see the amber warning state.

**Split Rules** — `app/(app)/splits/page.js`, shared
`components/PercentSplitEditor.js`. The seven core categories (Tax
Reserve, Investments, Solo 401k, SEP IRA, Emergency Fund, OPEX, Savings)
are permanently locked by name — they cannot be renamed or deleted — but
their percentage and connected account can always be changed. Custom
categories the user adds are fully editable (name, percentage, account)
and deletable, with an 8-second "Undo" toast after every delete. Real
sub-accounts added under Investments or Retirement (via "Add Investment
Account" / "Add Retirement Account") behave like custom categories too —
they can be renamed and deleted even though the group header itself
can't. Connecting a real account to Investments or Retirement is
restricted to non-checking (savings-type) accounts, since this money is
meant to sit and grow rather than get spent — OPEX is the one deliberate
exception, since operating expenses are meant to actually be paid out of
that account. Connecting an account to any row **auto-saves immediately**
to the server (no separate click needed for that specific action);
renaming a category or changing a percentage still requires clicking the
explicit "Save split rules" button. Total percentage across every row is
capped at 100%, with a live summary line describing how much is allocated
— see gotcha 4c for a real, currently-unresolved mismatch between what
that summary line implies and what the underlying engine actually does
with an unclaimed percentage.

**Close Out (monthly ritual)** — `app/(app)/closeout/page.js`. One record
per calendar month per user, and the current/future month can't be
started until it's actually over (shown as "check back on the last day of
the month"). The first time a given past month is opened, PriorityPay
pulls every transaction across every linked account for that month from
Plaid and auto-tags each one (income / W2 income / expense / exclude) as
a best guess — Plaid's own transfer-detection is used to auto-exclude
PriorityPay's own internal splits from counting as income or expense, and
a payroll-name pattern plus Plaid's income category flag is used to guess
W2 paychecks. **Step 1** is the user reviewing and correcting every
transaction's category, kicked off by a "Do you have W2 income this
month?" popup — answering yes walks through flagging which specific
deposits were W2 paychecks so those get excluded from retirement-room and
tax-reserve math (self-employment income and W2 wages are calculated
differently). Once the user clicks "Confirm," **the entire month becomes
permanently read-only** — every category button is disabled and a clear
banner explains the month was confirmed on a specific date and can't be
re-categorized. This is intentional, not a bug (see gotcha 4b's history —
a lack of this banner is exactly what caused real confusion once already).
**Steps 2/3**, unlocked after confirming, show recommended Solo 401k / SEP
IRA contribution room (via the 2026 IRS-limit calculator) and a Tax
Reserve amount to set aside, computed from the real confirmed net income
— with one-click "contribute" transfers and a manual top-up flow.

**Settings** — `app/(app)/settings/page.js`. Deliberately minimal by
design: just a business profile card (business name, entity type
dropdown). A retirement-age selector, an integrations/connection-status
section, and an "autopay bills roadmap" section were all built earlier in
this project and later deliberately removed to keep the page focused —
don't reintroduce them without first checking why they were cut (see
section 7 for the pattern of features that were built and then
intentionally removed).

## 5. Critical gotchas — read before changing anything

These are things that either caused real bugs during development or will
confuse the next person if they're not written down.

**a. Split rule `id`s are not stable across saves.** The `PUT
/api/split-rules` handler deletes and reinserts every row in
`simple_split_rules_percent` on every save, and Postgres generates a fresh
UUID each time. Any logic that needs to durably identify a specific row
(e.g. "is this one of the seven core, non-deletable categories?") must
match on **`label`** (with `retirementType` as a tiebreaker for Solo
401k/SEP IRA), never on `id`. This caused a real shipped bug once — see
`isCoreRow()` in `lib/allocations.js` for the fixed version and its
comment.

**b. Supabase embedded-resource filter paths must match the select's
table name exactly.** Anywhere the code does
`.select("...,simple_transfers!inner(user_id, created_at, status)")`
without an alias, filtering on that joined table's columns must use
`.eq("simple_transfers.user_id", ...)` — not a shortened alias like
`"transfers.user_id"`. The latter silently returns zero rows (or an
explicit PostgREST error, depending on the route) instead of throwing
where you'd notice immediately. This exact bug existed in five places —
both allocation-history routes, both queries in Close-Out's confirm route,
and the monthly-cap check in `lib/runSplit.js` — and had been silently
zeroing out the Dashboard's "Total saved," YTD/MTD figures, and Close
Out's retirement YTD tracking for an unknown amount of time before it was
caught (August 2026) and fixed across all five call sites in one pass.

**c. (RESOLVED, commit `1c81e5f`) `computeAllocations()` used to normalize
percentages to 100% of the deposit instead of leaving an unclaimed
remainder.** Previously, if a user's percentages summed to 80%, the Split
Rules page displayed "80% allocated and 20% remains where it was
deposited," but the engine actually proportionally scaled the whole
deposit to 100% across whatever rows were open — a Tax Reserve row set to
20% would silently receive 25% of every real dollar (20 / 80). Fixed by
capping `remaining` to the committed percentage's share of the original
deposit before the redistribution loop runs (`lib/allocations.js`, see the
comment directly above `const committedPct = ...`), so the copy and the
engine now agree: unclaimed percentage genuinely stays wherever the
deposit landed. Left in this doc as a record of what was wrong and why,
not as an open item.

**d. Dwolla's sandbox collapses every Plaid-sandbox-sourced processor
token to the same underlying test bank.** This means only the first
funding source per Dwolla customer succeeds in sandbox; every subsequent
one 409s as "Bank already exists." This is a sandbox-only quirk (real bank
connections in production each carry real, distinct account/routing
numbers, so it shouldn't recur) — but it's why the dev seed endpoints
(section 6) skip real Dwolla funding-source creation for seeded/demo
accounts and use a placeholder `dwolla_funding_source_id` instead. Real
users going through actual Plaid Link don't hit this. Currently dormant
either way: `exchange-public-token` skips Dwolla funding-source
attachment entirely whenever `TRANSFER_EXECUTION_MODE !== "dwolla_auto"`
(the default), so this only resurfaces if that env var is set for
testing.

**e. Plaid Link's own hosted "Continue without phone number" screen is
intermittently unresponsive** in this environment during testing. That's
inside Plaid's own hosted iframe, not this codebase — confirmed by
repeatedly testing the actual "Connect Account" / app-specific buttons,
which reliably open Link every time. Worth knowing if a "buttons don't
work" report comes in again; check whether it's actually Plaid's phone
screen before assuming a regression here.

**f. (RESOLVED) The "Skip identity verification (testing only)" link in
onboarding's Identity step used to need removing before production.**
Superseded entirely: the whole Identity step (and the Dwolla identity
verification it existed for) was removed from onboarding once
manual-approval mode shipped, not just the testing shortcut around it.
There is no identity verification anywhere in the current onboarding flow.
Left here as a record, not an open item.

## 6. Dev-only tooling (sandbox only — do not expose in production)

All of these live under `app/api/dev/**`, are guarded by a
`PLAID_ENV !== "sandbox"` check that hard-fails outside sandbox, and exist
purely to make the demo account (or any test account) look realistic
without clicking through Plaid Link by hand repeatedly.

- `POST /api/dev/seed-accounts` — creates 6 realistic fake bank/app
  accounts (Chase, Bank of America, Ally, PayPal, Cash App, Vanguard) with
  custom starting balances via Plaid Sandbox's "custom user" feature.
  **Idempotent by account name** — re-running it deletes and reinserts
  only rows matching those 6 names, which regenerates their ids. Don't
  re-run it if split rules already reference those accounts' ids, or
  you'll silently disconnect every category pointing at them.
- `POST /api/dev/seed-retirement-accounts` — same idea, scoped to its own
  two names (Fidelity Solo 401k, Charles Schwab SEP IRA) specifically so
  it can be run without touching the six accounts above.
- `POST /api/dev/seed-history` — backfills a handful of realistic mock
  deposits (currently July + August 2026) into `simple_transfers` /
  `simple_transfer_allocations`, computed through the real
  `computeAllocations` function against whatever the account's actual
  current split percentages are (so the mock numbers can't drift out of
  sync with reality). Also backdates `simple_profiles.created_at` so the
  Dashboard's month-navigator "earliest period" gate doesn't hide the
  seeded prior month. Idempotent — reruns clean up their own previous
  `trigger = 'demo_seed'` rows first.
- `POST /api/dev/enable-auto-detect` — bulk-establishes each account's
  Plaid sync cursor. Needed because accounts created via the seed
  endpoints above bypass the real Plaid Link flow, which is what normally
  triggers this automatically right after linking.

## 7. Things that were built, then deliberately removed

A "Subscriptions" feature (a dashboard tab that predicted recurring
charges from transaction history, originally scoped partly as a possible
lead-magnet growth feature) was fully designed, built, deployed, and
verified working — then removed entirely at Megan's request, because it
didn't fit the product's focus. If a "predict my subscriptions" idea comes
back later, the detection logic (merchant-normalization, cadence
classification, next-charge-date prediction) is preserved in git history
(`git log --oneline --all | grep -i subscription`) even though the live
code is gone. The Settings page sections mentioned in section 4
(retirement-age, integrations status, autopay roadmap) follow the same
pattern — built, then cut for focus, still recoverable from git history if
ever needed again.

## 8. Open items / not yet decided

- ~~The `computeAllocations` 100%-normalization vs. displayed-percentage
  mismatch~~ (gotcha 5c) — resolved, commit `1c81e5f`.
- ~~Remove the "Skip identity verification" testing link~~ (gotcha 5f) —
  resolved; the entire Identity step was removed, not just the link.
- **Mobile layout** has been built with Tailwind's mobile-first responsive
  classes throughout, but couldn't be pixel-verified via screenshot in the
  browser-automation tooling used for this session (a tooling limitation,
  not a code issue) — worth a manual phone check before considering it
  fully verified.
- **Plaid/Dwolla production approval** hasn't been started — see
  README.md's "Going to production" section for exactly what that
  requires (a registered legal business entity, Dwolla Platform
  verification, Plaid production access request).
