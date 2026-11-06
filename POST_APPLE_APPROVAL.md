# Post-Apple-approval list

`main` is frozen while the iOS app is in App Store review. Everything below
ships on the `web` branch (prioritysave.com) first and gets merged into `main`
for the iOS app once Apple approves the current build.

## To merge into main

### 1. Transfer checklist: one grand-totals card (web, Nov 6 2026)
- Checklist (`components/PendingTransfers.js`, Dashboard) is a single card.
  Header: each pending deposit's name, date and amount with Skip, the combined
  total, and recently skipped deposits with Undo. Then one row per category:
  the total across pending deposits, each deposit's own amount under it
  (hidden when only one deposit is pending), where it goes, and two identical
  buttons, "Transfer $X Now" and "Mark as Transferred" (50/50 on phones), or
  "No transfer needed (stays in [account])". Guilt-Free Spending is its own
  row. "Approve all splits" at the bottom. "On the way (N)" (collapsed) lists
  lines marked as transferred that haven't landed yet. Per-line Remove was dropped.
- "Transfer $X Now" opens a sheet: "Which bank account would you like to
  open?", the amount and category, then "Where Your Money Currently Is" and
  "Where Your Money Is Going", each opening that bank, and Cancel.
- New routes: `GET /api/transfers/deposits`, `POST /api/transfers/approve-all`,
  `POST /api/transfers/[id]/approve` (currently unused),
  `POST /api/transfers/[id]/skip`, `POST /api/transfers/[id]/unskip`,
  `POST /api/transfer-allocations/confirm-batch`. Helpers in `lib/depositChecklist.js`.
- Deposit name recorded from the Plaid transaction (`lib/runSplit.js`,
  `app/api/plaid/webhook/route.js`).
- Skipped lines now excluded from every total (Close-Out confirm, advisor,
  category room, monthly cap).
- Database: `supabase/migrations/20261106_deposit_checklist.sql`, already run
  in production on Nov 6 2026. Nothing to run again at merge time.
- iOS check at merge: the "Transfer $X Now" sheet should slide up above the
  home indicator, and its bank links should open outside the app's web view
  (Safari or the bank's own app), not inside it.

### 2. Dashboard summary cards moved to the top (web, Nov 6 2026)
- `components/IncomeSummaryCards.js`: Total income, Saved via PrioritySave,
  and Guilt-Free Spending available, as the first thing on the Dashboard
  (above "Transfers to make"). Side by side on desktop, stacked on mobile.
- Business Expenses (OPEX) is no longer called savings: the middle card is
  "Saved" (every other category) plus "Set aside for business expenses", and
  the guilt-free math subtracts both, so it still adds up to total income.
- The Dashboard fetches `/api/allocations/category-summary` once and shares it
  (`app/(app)/dashboard/page.js` -> `AccountBalances` ->
  `CategoryDistributionSection`); the cards refresh after checklist actions.
- `category-summary` now also returns `monthlyByLabel` (additive), so renamed
  or removed categories still count in the cards.

### 3. Solo 401k note removed from Income Split Rules (web, Nov 6 2026)
- The "Solo 401ks are retirement accounts for self-employed..." note no longer
  shows on Income Split Rules (`app/(app)/splits/page.js` passes the new
  `hideSoloRetirementNote` option to `components/PercentSplitEditor.js`).
  Onboarding still shows it. The W2 versions of the note are unchanged.

## Follow-ups (not built yet)

- **Skipped "Not business income" deposits and Month Close-Out.** Skipping a
  deposit removes it from PrioritySave's totals, but Month Close-Out
  categorizes bank transactions separately, so the same transaction still
  counts as income there. Link them: when a deposit is skipped as "Not
  business income", exclude its Close-Out transaction too (match on
  `plaid_transaction_id`), and restore it on Undo.
