# Post-Apple-approval list

`main` is frozen while the iOS app is in App Store review. Everything below
ships on the `web` branch (prioritysave.com) first and gets merged into `main`
for the iOS app once Apple approves the current build.

## To merge into main

### 1. Transfer checklist: one grand-totals card (web, Nov 6 2026)
- Checklist (`components/PendingTransfers.js`, Dashboard) is a single card with
  one row per category: the total across pending deposits, each deposit's own
  amount under it (hidden when only one deposit is pending), where it goes,
  "Go to [bank]" and "Mark all transferred", or "No transfer needed (stays in
  [account])". Guilt-Free Spending is its own row. A "Covers:" line lists the
  pending deposits with Skip, plus recently skipped ones with Undo.
  "Approve all splits" at the bottom. "On the way (N)" (collapsed) lists lines
  marked as transferred that haven't landed yet. Per-line Remove was dropped.
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
- iOS check at merge: confirm "Go to [bank]" links open outside the app's web
  view (Safari or the bank's own app), not inside it.

## Follow-ups (not built yet)

- **Skipped "Not business income" deposits and Month Close-Out.** Skipping a
  deposit removes it from PrioritySave's totals, but Month Close-Out
  categorizes bank transactions separately, so the same transaction still
  counts as income there. Link them: when a deposit is skipped as "Not
  business income", exclude its Close-Out transaction too (match on
  `plaid_transaction_id`), and restore it on Undo.
