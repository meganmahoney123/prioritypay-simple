# PriorityPay Simple

A real, deployable Next.js app: Supabase for auth + database, Plaid for
read-only bank account linking. PriorityPay calculates a percentage-based
split for every deposit and shows you a checklist of what to send where --
you complete every transfer yourself, in your own bank's app (that's
**manual_approval** mode, the default -- see `lib/executionMode.js`). Real
money movement via Dwolla exists in the codebase as an opt-in mode
(`TRANSFER_EXECUTION_MODE=dwolla_auto`) for later, but isn't required to run
or deploy the app today. Runs in **sandbox mode** end-to-end for Plaid until
you're approved for Plaid production access (see "Going to production"
below) -- there's no real money at risk either way, since PriorityPay never
touches it regardless of Plaid's environment.

Verified to build clean (`next build`, no errors) before this was handed to
you.

> **New to this project? Start with [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md)
> first.** This README covers how to run and deploy the app; PROJECT_HANDOFF.md
> covers the product model, the decisions behind it, and a list of specific
> gotchas that will otherwise cost you real debugging time.

## Architecture in one paragraph

Next.js App Router, deployed on Vercel. Supabase Auth handles sign-up/login;
Supabase Postgres (with row-level security) holds everything else. The
browser never talks to Plaid, Dwolla, or the database directly — every
sensitive action goes through a Next.js API route (`app/api/**`) running
server-side, where `PLAID_SECRET`, `DWOLLA_SECRET`, `PLAID_TOKEN_ENCRYPTION_KEY`,
and the Supabase service-role key actually live. See `lib/supabaseServer.js`
for why it's built this way, and `lib/executionMode.js` for the
manual-vs-automatic transfer switch mentioned above.

---

## Part 1 — Create your accounts (~15 minutes)

You'll need three free accounts to run the app as it actually works today.
A fourth (Dwolla) is optional -- only needed if you plan to test or enable
automatic transfer execution later.

### 1. Supabase (database + auth)

1. Go to [supabase.com](https://supabase.com) → sign up → **New project**.
2. Name it `prioritypay`, set a database password (save it somewhere), pick
   a region close to you.
3. Once it's provisioned: **SQL Editor** → **New query** → paste the full
   contents of `supabase/schema.sql` from this repo → **Run**.
4. **Project Settings → API** — copy three values, you'll need them in Part 2:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (never expose this one to a browser)
5. **Authentication → Providers → Email** — confirm it's enabled (it is by
   default). Optionally turn off "Confirm email" under **Authentication →
   Settings** while you're testing, so sign-up doesn't require clicking an
   email link.

### 2. Plaid (bank linking)

1. Go to [dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   → sign up. Sandbox access is instant, no approval needed.
2. **Team Settings → Keys** — copy:
   - `client_id` → `PLAID_CLIENT_ID`
   - `Sandbox` secret → `PLAID_SECRET`
3. Leave `PLAID_ENV=sandbox` for now.

### 3. Dwolla (optional -- money movement, only if going automatic)

Skip this entirely for now unless you specifically want to test automatic
transfer execution. The default `manual_approval` mode never calls Dwolla,
so `DWOLLA_KEY`/`DWOLLA_SECRET` can stay blank in `.env.local` and nothing
breaks (`lib/dwolla.js` builds its client lazily, only when actually
called).

If you do want to test it: go to
[dashboard-sandbox.dwolla.com](https://dashboard-sandbox.dwolla.com) → sign
up for a sandbox account → **Applications** → default app → copy the `Key`
and `Secret` → `DWOLLA_KEY` / `DWOLLA_SECRET` → leave `DWOLLA_ENV=sandbox` →
set `TRANSFER_EXECUTION_MODE=dwolla_auto`. Note that identity verification
(collecting each user's SSN before Dwolla will move their money) was
removed from onboarding when manual-approval mode became the default --
re-adding that flow is required before dwolla_auto mode is usable with real
users, not just a config flip.

### 4. Vercel (hosting)

1. Go to [vercel.com/signup](https://vercel.com/signup) → sign up (GitHub
   login is easiest, but email works too).
2. Nothing else to do here yet — Part 3 covers deploying.

---

## Part 2 — Configure the app

1. In this folder, copy `.env.example` to `.env.local` and fill in every
   value you collected above.
2. Generate an encryption key for stored Plaid access tokens:
   `openssl rand -hex 32` → `PLAID_TOKEN_ENCRYPTION_KEY`.
3. Test it locally: `npm install`, then `npm run dev`, then open
   `http://localhost:3000`.
4. Walk through: sign up → onboarding (Business → Connect Accounts, using
   Plaid's test institution search for "Chase", username `user_good`,
   password `pass_good` → Percentage Splits → Review) → land on the
   Dashboard → seed a test deposit (see `app/api/dev/seed-history` for the
   sandbox-only tooling that backfills realistic mock deposits) → check
   **Accounts** or the Dashboard's "Transfers waiting on you" section for
   the checklist PriorityPay generated. There's nothing to check in a
   Dwolla dashboard -- nothing was sent anywhere, by design.

If anything errors, the browser network tab + your terminal (`npm run dev`
logs) will show which API route failed and why — almost always a missing
or mistyped env var.

---

## Part 3 — Deploy to prioritypay.co

No GitHub repo needed for this — deploying straight from your machine via
the Vercel CLI:

```bash
npm install -g vercel
vercel login
cd prioritypay-simple
vercel        # first run: creates the project, links this folder to it
```

Then add every env var from `.env.local` to the Vercel project — either:

- **Dashboard**: your new project → Settings → Environment Variables → add
  each one (Production + Preview), or
- **CLI**: `vercel env add PLAID_CLIENT_ID production` (repeat per variable)

Set `NEXT_PUBLIC_APP_URL=https://prioritypay.co` this time (not localhost).

Deploy for real:

```bash
vercel --prod
```

That gives you a live app on a `*.vercel.app` URL. Now point your domain at
it:

1. Vercel dashboard → your project → **Settings → Domains** → add
   `prioritypay.co`.
2. Vercel shows you exactly which DNS records to add (typically an `A`
   record to `76.76.21.21` and a `CNAME` for `www`, but use whatever Vercel
   displays — it's specific to your setup).
3. Go to wherever `prioritypay.co` is registered (GoDaddy, Namecheap,
   Cloudflare, etc.), find DNS settings, add those records.
4. DNS usually propagates in minutes, sometimes up to a few hours. Vercel's
   Domains page shows a checkmark once it sees it.

**prioritypay.co is now a real, working app** — sign-up, bank linking, and
split calculation all function end-to-end, using Plaid's sandbox (fake
data, zero real money moved). You complete every transfer yourself; nothing
here requires Dwolla to be configured at all.

---

## Going to production (real money isn't required for Plaid)

Plaid production access is a coding-adjacent, not a coding, task:

**Plaid** — Dashboard → request Production access. You'll fill out a
company profile, a security questionnaire, and (as of this writing) a
Beneficial Owners section that needs a real person's information, not
something to fill in on someone else's behalf. Typically approved within a
couple of business days once submitted. Swap `PLAID_ENV=sandbox` →
`production` and the sandbox keys for production ones once approved.
`PLAID_TOKEN_ENCRYPTION_KEY` needs to be set in that environment too --
same key works fine, or generate a fresh one for production specifically.

**Dwolla is not required to go live.** The current product works and makes
money on real deposits without ever calling Dwolla, since `manual_approval`
mode is the default and PriorityPay never initiates a transfer. Only pursue
Dwolla production approval (registered legal business + EIN, Dwolla
Platform verification, and re-adding real identity verification to
onboarding) if and when you decide to build and ship automatic transfer
execution as a real feature -- treat it as a future project, not a launch
blocker.

Nothing else about the app changes for the Plaid cutover — same code, same
database, just real credentials.

---

## What's simplified today (fast follow-ups)

- **Access-token encryption at rest** and the **percentage-to-dollar
  split math** were both open items here previously -- both are now done
  (see `PROJECT_HANDOFF.md` sections 4c and 5, and `lib/tokenCrypto.js`).
- **The onboarding Identity step and its "skip" testing shortcut** are
  also resolved -- the whole step was removed, not patched around, once
  manual-approval mode shipped. There is no identity verification
  anywhere in the current flow.
- **Mobile app** — not started. React Native (Expo) reusing
  `lib/allocations.js` and the same API routes is the natural path once
  the web app is stable; budget real time for App Store / Play Store
  review after that.
- **Terms of Service / Privacy Policy legal review** — both pages were
  rewritten to match the manual-approval model (no more Dwolla/SSN
  language describing a flow that doesn't exist), but a lawyer should
  review before treating them as final, especially the transfer-checklist
  language that replaced the old ACH-authorization section.

## Stack

Next.js 14 (App Router) · Supabase (Postgres + Auth) · Plaid · Dwolla
(present in the codebase, inactive by default) · Stripe (billing) ·
Twilio (optional deposit SMS alerts) · Anthropic (optional Tax Strategy
Advisor chat) · Tailwind · Recharts · lucide-react. No separate backend —
API routes are the backend.
