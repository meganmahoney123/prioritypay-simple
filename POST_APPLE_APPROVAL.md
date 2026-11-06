# Post-Apple-approval list

`main` is frozen while the iOS app is in App Store review. Everything below
ships on the `web` branch (prioritysave.com) first and gets merged into `main`
for the iOS app once Apple approves the current build.

## To merge into main

### 1. Transfer checklist grouped by deposit (web, Nov 6 2026)
- Checklist (`components/PendingTransfers.js`, Dashboard) is one card per deposit:
  client payment name, date, amount, one line per category with % and $, plus
  Guilt-Free Spending. "Go to [bank]" links, "No transfer needed (stays in
  [account])", per-line "Mark as transferred", per-deposit "Approve split",
  "Skip this deposit" with Undo, and a multi-deposit summary (2+ waiting) that
  keeps every deposit's own breakdown below it.
- New routes: `GET /api/transfers/deposits`, `POST /api/transfers/[id]/approve`,
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
