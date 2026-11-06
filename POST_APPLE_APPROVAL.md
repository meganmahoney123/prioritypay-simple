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

## Follow-ups (not built yet)

- **Skipped "Not business income" deposits and Month Close-Out.** Skipping a
  deposit removes it from PrioritySave's totals, but Month Close-Out
  categorizes bank transactions separately, so the same transaction still
  counts as income there. Link them: when a deposit is skipped as "Not
  business income", exclude its Close-Out transaction too (match on
  `plaid_transaction_id`), and restore it on Undo.
