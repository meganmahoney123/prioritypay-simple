# PriorityPay Simple — Project Handoff

Last updated: August 15, 2026

This document is the narrative history and working context for this
project — what it is, why it's built the way it is, what's been shipped,
what's still open, and the specific traps a new developer will otherwise
rediscover the hard way. `README.md` covers *how to run and deploy* the
app; this covers *why it looks like this* and *what to know before you
touch it*.

If you're a developer picking this up cold: read this whole document
first, then skim `git log --oneline` for the granular, dated history of
every change (commit messages in this repo are written to be genuinely
informative, not just "fix bug").

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
(`lib/allocations.js` → `computeAllocations`) and fires real Dwolla
transfers to every category's connected account. The same math also
powers the manual "Split $X now" button and the live previews shown in
Split Rules and onboarding, so what a user previews is provably what would
actually move.

**Monthly Close-Out** (`app/(app)/closeout`) is a separate, later step: it
pulls every real transaction for a given month, has the user confirm
income vs. expense vs. internal-transfer-to-exclude (with a best-guess
auto-tag to start from), flags W2 paychecks separately so they don't
inflate retirement contribution room, and recommends Tax Reserve /
Solo 401k / SEP IRA contributions based on real confirmed net income. Once
a month is confirmed, it is **permanently locked** — this is intentional,
not a bug (see gotcha below).

## 4. Critical gotchas — read before changing anything

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

**c. `computeAllocations()` normalizes percentages to 100% of the
deposit — it does not leave an unclaimed remainder.** This is a real,
currently-unresolved discrepancy between the engine and the product's own
copy. If a user's percentages sum to 80%, the Split Rules page displays
"80% allocated and 20% remains where it was deposited," and the homepage
says "spend the rest, guilt free" — but the actual split engine
(`lib/allocations.js`, the `while (remaining > 0.005 ...)` loop in
`computeAllocations`) treats every percentage as a **relative weight** and
proportionally scales the whole deposit to 100% across whatever rows are
open. In practice, a Tax Reserve row set to 20% actually receives 25% of
every real dollar deposited (20 / 80, once you account for the other rows
summing to 80%), and nothing is ever left unclaimed in checking. **This
needs a decision from Megan before production**: either fix the engine to
match the copy (leave the gap unclaimed), or fix the copy to match the
engine (percentages are relative weights, not literal shares). Flagged,
not yet resolved as of this writing.

**d. Dwolla's sandbox collapses every Plaid-sandbox-sourced processor
token to the same underlying test bank.** This means only the first
funding source per Dwolla customer succeeds in sandbox; every subsequent
one 409s as "Bank already exists." This is a sandbox-only quirk (real bank
connections in production each carry real, distinct account/routing
numbers, so it shouldn't recur) — but it's why the dev seed endpoints
(section 6) skip real Dwolla funding-source creation for seeded/demo
accounts and use a placeholder `dwolla_funding_source_id` instead. Real
users going through actual Plaid Link don't hit this.

**e. Plaid Link's own hosted "Continue without phone number" screen is
intermittently unresponsive** in this environment during testing. That's
inside Plaid's own hosted iframe, not this codebase — confirmed by
repeatedly testing the actual "Connect Account" / app-specific buttons,
which reliably open Link every time. Worth knowing if a "buttons don't
work" report comes in again; check whether it's actually Plaid's phone
screen before assuming a regression here.

**f. The "Skip identity verification (testing only)" link in onboarding's
Identity step (`app/onboarding/page.js`) must be removed before any real
production deployment.** It's a deliberate sandbox-only shortcut around
Dwolla's identity verification requirement. Standing reminder, not yet
actioned since the app is still sandbox-only.

## 5. Feature inventory (what's actually built)

- **Marketing homepage** (`components/Homepage.js`) — hero, "how it
  works," a live-style dashboard preview, a subscription-adjacent feature
  was built and then deliberately removed (see section 7), a 3-step
  onboarding explainer with an auto-scrolling bank/app logo carousel, a
  Close-Out preview, an FAQ section, final CTA. Copy has been through many
  rounds of specific wording edits — check `git log -- components/Homepage.js`
  before assuming any phrase is arbitrary.
- **Onboarding wizard** (`app/onboarding/page.js`) — Welcome → Business →
  Identity (real Dwolla identity verification) → Connect Accounts (banks
  + Venmo/PayPal/Cash App quick-connect + generic "Connect More Apps") →
  Percentage Splits (same editor as the in-app Split Rules page) → Review.
- **Dashboard** (`app/(app)/dashboard/page.js` +
  `components/AccountBalances.js` + `components/MoneyDistributionChart.js`) —
  account balances grouped by Retirement / Investments / everything else,
  "Total saved since joining," and a real (not simulated) pie chart of how
  deposits have actually split, navigable by month or rolled up over 6/12
  months.
- **Accounts** (`app/(app)/accounts/page.js`) — linked account list,
  "Connect a bank account or app" plus the same Venmo/PayPal/Cash App
  quick-connect row used in onboarding, per-account "deposits split
  automatically" status.
- **Split Rules** (`app/(app)/splits/page.js`, shared
  `components/PercentSplitEditor.js`) — add/rename/delete custom
  categories (the seven core ones are locked, sub-accounts under
  Investments/Retirement can be renamed and deleted freely), undo on
  delete, auto-save the moment an account is connected to a row.
- **Close Out** (`app/(app)/closeout/page.js`) — the Step 1/2/3 monthly
  flow described in section 3, gated so the current in-progress month
  can't be closed out early, with a clear "this month was confirmed on
  [date], categories are locked" banner once confirmed.
- **Settings** (`app/(app)/settings/page.js`) — intentionally minimal:
  just business profile (name, entity type). Retirement-age, integrations
  status, and autopay-roadmap sections were built earlier and then
  deliberately removed to keep the page focused.

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
code is gone.

## 8. Open items / not yet decided

- **The `computeAllocations` 100%-normalization vs. displayed-percentage
  mismatch** (section 4c) — needs an explicit decision before production.
- **Remove the "Skip identity verification" testing link** (section 4f)
  before production.
- ~~`README.md`'s "What's simplified" section was stale~~ — corrected
  alongside this document; it now points here instead of repeating
  outdated claims.
- **Mobile layout** has been built with Tailwind's mobile-first responsive
  classes throughout, but couldn't be pixel-verified via screenshot in the
  browser-automation tooling used for this session (a tooling limitation,
  not a code issue) — worth a manual phone check before considering it
  fully verified.
- **Plaid/Dwolla production approval** hasn't been started — see
  README.md's "Going to production" section for exactly what that
  requires (a registered legal business entity, Dwolla Platform
  verification, Plaid production access request).

## 9. Where to look for more detail

- `git log --oneline` — every change, in order, with descriptive commit
  messages.
- Inline code comments throughout `lib/allocations.js`, `lib/runSplit.js`,
  `lib/plaidSync.js`, and the API routes — this codebase leans heavily on
  explaining *why*, not just *what*, directly next to the code in
  question. Read the comment block above a function before changing it.
- `README.md` — environment setup, required accounts (Supabase, Plaid,
  Dwolla, Vercel), and the production-cutover checklist.
