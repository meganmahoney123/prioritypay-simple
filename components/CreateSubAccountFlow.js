"use client";

import { useState } from "react";
import PlaidLinkButton from "./PlaidLinkButton";

// Best-effort links to each bank's own savings-account page. Not verified
// against the live URLs -- check these before relying on them, bank help
// pages move. "Other bank" (and anything unlisted) falls back to a search.
const BANK_HELP = {
  Chase: "https://www.chase.com/personal/savings",
  Ally: "https://www.ally.com/bank/savings-account/",
  "Bank of America": "https://www.bankofamerica.com/deposits/savings-accounts/",
  "Wells Fargo": "https://www.wellsfargo.com/savings-cds/",
  "Capital One": "https://www.capitalone.com/bank/savings-accounts/",
};
const BANK_NAMES = [...Object.keys(BANK_HELP), "Other bank"];

function helpUrl(bank) {
  return (
    BANK_HELP[bank] ||
    `https://www.google.com/search?q=${encodeURIComponent("how to open a new savings account at " + bank)}`
  );
}

function recommendedBank(accounts) {
  const first = accounts?.[0]?.institution_name;
  return first && BANK_HELP[first] ? first : BANK_NAMES[0];
}

// Shown inline under a Split Rules row once someone picks "Want to create a
// new savings account for this bucket?" Step 1 points at a specific bank's
// own account-opening flow -- deliberately a real, separate savings account,
// not a same-account "bucket" or "goal" (a feature some banks, like Ally or
// Capital One, offer), since those usually share one account number and
// can't be linked or autopaid to independently. Step 2 reuses the same
// PlaidLinkButton/exchange flow as the Accounts page to connect whatever
// they open. Once linked, we have no way to confirm a biller's autopay was
// actually switched over, so we ask directly and block saving this row
// until they say yes.
export default function CreateSubAccountFlow({ costLabel, accounts, onAccountLinked, onConfirmed, savingsOnly }) {
  const [bank, setBank] = useState(() => recommendedBank(accounts));
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [showBlock, setShowBlock] = useState(false);

  if (linkedAccount) {
    return (
      <div className="mt-2 bg-neutral-50 rounded-xl p-3">
        <p className="text-xs font-semibold mb-2">
          Have you already switched the autopay for {costLabel} to draw from this new account?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBlock(true)}
            className="flex-1 text-xs font-semibold border border-neutral-200 rounded-lg py-1.5 hover:bg-neutral-100"
          >
            No
          </button>
          <button
            onClick={() => onConfirmed(linkedAccount.id)}
            className="flex-1 text-xs font-semibold border border-neutral-200 rounded-lg py-1.5 hover:bg-neutral-100"
          >
            Yes
          </button>
        </div>
        {showBlock && (
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <p className="text-xs font-semibold text-red-600 mb-1">
              You must switch your autopay to draw from this new savings account before you can save it here.
            </p>
            <p className="text-xs text-neutral-500">
              We can&apos;t check this ourselves — once it&apos;s switched, come back and click Yes.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 bg-neutral-50 rounded-xl p-3">
      <p className="text-xs font-semibold mb-2">Open a new savings account for {costLabel}</p>
      <ol className="text-xs text-neutral-600 space-y-1.5 list-decimal list-inside mb-3">
        <li>
          Which bank?{" "}
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="text-xs border border-neutral-200 rounded-lg px-1.5 py-0.5 mx-1"
          >
            {BANK_NAMES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>{" "}
          <a href={helpUrl(bank)} target="_blank" rel="noreferrer" className="text-emerald-700 font-medium">
            See how to open one at {bank} ↗
          </a>
        </li>
        <li>
          Open a brand-new savings account — not a labeled &quot;bucket&quot; or &quot;goal&quot; inside an
          account you already have. Some banks offer those, but they share one account number and can&apos;t be
          linked separately.
        </li>
        <li>Name it whatever helps you recognize it, then come back here — you can assign this same account to other costs later too</li>
      </ol>
      <PlaidLinkButton
        label="I opened it — link it now"
        savingsOnly={savingsOnly}
        onLinked={(account) => {
          onAccountLinked(account);
          setLinkedAccount(account);
        }}
      />
    </div>
  );
}
