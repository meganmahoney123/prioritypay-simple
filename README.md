# PriorityPay — web app

A real, deployable Next.js app: Supabase for auth + database, Plaid for bank
linking, Dwolla for ACH transfers. Runs in **sandbox mode** end-to-end —
fake banks, fake money, zero risk — until you're approved for production
access with Plaid and Dwolla (see "Going to production" below).

Verified to build clean (`next build`, 23/23 pages, no errors) before this
was handed to you.

> **New to this project? Start with [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md)
> first.** This README covers how to run and deploy the app; PROJECT_HANDOFF.md
> covers the product model, the decisions behind it, and a list of specific
> gotchas that will otherwise cost you real debugging time.

## Architecture in one paragraph

Next.js App Router, deployed on Vercel. Supabase Auth handles sign-up/login;
Supabase Postgres (with row-level security) holds everything else. The
browser never talks to Plaid, Dwolla, or the database directly — every
sensitive action goes through a Next.js API route (`app/api/**`) running
server-side, where `PLAID_SECRET`, `DWOLLA_SECRET`, and the Supabase
service-role key actually live. See `lib/supabaseServer.js` for why it's
built this way.

---

## Part 1 — Create your accounts (~20 minutes)

You'll need four free accounts. Do these in order — each one unblocks the
next.

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

### 3. Dwolla (money movement)

1. Go to [dashboard-sandbox.dwolla.com](https://dashboard-sandbox.dwolla.com)
   → sign up for a **sandbox** account (separate from production, no
   approval needed).
2. **Applications** → default app → copy the `Key` and `Secret` →
   `DWOLLA_KEY` / `DWOLLA_SECRET`. Leave `DWOLLA_ENV=sandbox`.
3. Once the app is deployed (Part 3), come back here: **Webhook
   Subscriptions** → add `https://prioritypay.co/api/dwolla/webhook` →
   copy the generated secret into `DWOLLA_WEBHOOK_SECRET`. This is what lets
   Dwolla tell your app when a transfer actually settles.

### 4. Vercel (hosting)

1. Go to [vercel.com/signup](https://vercel.com/signup) → sign up (GitHub
   login is easiest, but email works too).
2. Nothing else to do here yet — Part 3 covers deploying.

---

## Part 2 — Configure the app

1. In this folder, copy `.env.example` to `.env.local` and fill in every
   value you collected above (leave `DWOLLA_WEBHOOK_SECRET` blank for now).
2. Test it locally: `npm install`, then `npm run dev`, then open
   `http://localhost:3000`.
3. Walk through: sign up → onboarding → **Identity** step (use test data —
   SSN `1234` triggers Dwolla's instant-verify sandbox path) → **Connect
   bank** (Plaid's test institution search for "Chase", username
   `user_good`, password `pass_good`) → set your fixed costs / percentages
   → finish → go to **Payments** → run a split. You should see real
   sandbox transfers appear in your Dwolla dashboard.

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
cd prioritypay-web
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

Once that's green: go back to Dwolla and add the webhook subscription
pointing at `https://prioritypay.co/api/dwolla/webhook` (step 3 in Part 1),
then add `DWOLLA_WEBHOOK_SECRET` to Vercel's env vars and redeploy
(`vercel --prod`).

**prioritypay.co is now a real, working app** — sign-up, bank linking, and
splitting all function end-to-end, using Plaid and Dwolla's sandbox (fake
data, zero real money moved).

---

## Going to production (real money)

Two separate approvals, neither of which is a coding task:

**Plaid** — Dashboard → request Production access. You'll fill out a
company profile and a security questionnaire; typically approved within a
couple of business days. Swap `PLAID_ENV=sandbox` → `production` and the
sandbox keys for production ones once approved.

**Dwolla** — this is the bigger one. Dwolla will not move real money until:
1. PriorityPay is a registered legal business (LLC/Corp) with an EIN.
2. You complete Dwolla's Platform verification for that business (their
   Integration Manager reviews your production application).
3. Each end user still goes through the same identity-verification step
   already built into onboarding — except now it's their real SSN, not
   sandbox test data.

Budget real time for #1 and #2 — this is compliance review, not something
either of us can speed up by writing more code. Once approved, swap
`DWOLLA_ENV` and the keys the same way as Plaid.

Nothing else about the app changes for this cutover — same code, same
database, just real credentials.

---

## What's simplified today (fast follow-ups)

This section used to say deposit detection was manual and balances weren't
fetched -- both are now built (see PROJECT_HANDOFF.md section 3 and 5).
What's actually still simplified or open:

- ~~Access-token encryption at rest.~~ **Done.** `accounts.plaid_access_token`
  is now AES-256-GCM encrypted before it's ever written to Postgres (see
  `lib/tokenCrypto.js`) -- set `PLAID_TOKEN_ENCRYPTION_KEY` (`.env.example`)
  to enable it. Accounts linked before this shipped keep working and
  self-heal to encrypted form the next time each row is touched, so no
  separate backfill migration is needed.
- ~~Percentage-to-dollar behavior needs a decision.~~ **Done**, as of
  commit `1c81e5f` ("Fix split math: uncommitted percentage now stays
  unallocated") -- the split engine now caps what it allocates to exactly
  the committed percentage, so unclaimed percentage genuinely stays in
  checking, matching the product's own copy. PROJECT_HANDOFF.md section 4c
  was written before this fix and is now stale.
- **The "skip identity verification" testing shortcut** in onboarding must
  be removed before production (PROJECT_HANDOFF.md section 4f).
- **Mobile app** — not started. React Native (Expo) reusing `lib/allocations.js`
  and the same API routes is the natural path once the web app is stable;
  budget real time for App Store / Play Store review after that.

## Stack

Next.js 14 (App Router) · Supabase (Postgres + Auth) · Plaid · Dwolla ·
Tailwind · Recharts · lucide-react. No separate backend — API routes are
the backend.
