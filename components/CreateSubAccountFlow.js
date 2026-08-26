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
//
// `theme="ledger"` only changes the visual treatment (see components using
// LEDGER_TOKENS) -- every step of the flow below is identical either way.
export default function CreateSubAccountFlow({ costLabel, accounts, onAccountLinked, onConfirmed, savingsOnly, theme }) {
  const [bank, setBank] = useState(() => recommendedBank(accounts));
  const [linkedAccount, setLinkedAccount] = useState(null);
  const [showBlock, setShowBlock] = useState(false);
  const ledger = theme === "ledger";

  if (linkedAccount) {
    if (ledger) {
      return (
        <div style={{ marginTop: 10, border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: 16 }}>
          <p style={{ fontSize: 13.5, fontFamily: "var(--font-heading)", margin: "0 0 12px" }}>
            Have you already switched the autopay for {costLabel} to draw from this new account?
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowBlock(true)}
              className="pp-ledger-btn"
              style={{ flex: 1, padding: "8px 0", fontSize: 13 }}
            >
              No
            </button>
            <button
              onClick={() => onConfirmed(linkedAccount.id)}
              className="pp-ledger-btn"
              style={{ flex: 1, padding: "8px 0", fontSize: 13 }}
            >
              Yes
            </button>
          </div>
          {showBlock && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              <p style={{ fontSize: 13, color: "var(--color-accent-700)", margin: "0 0 4px", fontFamily: "var(--font-heading)" }}>
                You must switch your autopay to draw from this new savings account before you can save it here.
              </p>
              <p style={{ fontSize: 13, color: "color-mix(in srgb, var(--color-text) 60%, transparent)", margin: 0 }}>
                We can&apos;t check this ourselves — once it&apos;s switched, come back and click Yes.
              </p>
            </div>
          )}
          <style jsx>{`
            .pp-ledger-btn {
              font-family: var(--font-heading);
              font-weight: 600;
              background: transparent;
              border: 1px solid var(--color-divider);
              border-radius: var(--radius-md);
              cursor: pointer;
              color: var(--color-text);
            }
            .pp-ledger-btn:hover {
              background: color-mix(in srgb, var(--color-text) 6%, transparent);
            }
          `}</style>
        </div>
      );
    }
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

  if (ledger) {
    return (
      <div style={{ marginTop: 10, border: "1px solid var(--color-divider)", borderRadius: "var(--radius-md)", padding: 16 }}>
        <p style={{ fontSize: 13.5, fontFamily: "var(--font-heading)", margin: "0 0 10px" }}>
          Open a new savings account for {costLabel}
        </p>
        <ol style={{ fontSize: 13, lineHeight: 1.7, color: "color-mix(in srgb, var(--color-text) 70%, transparent)", margin: "0 0 14px", paddingLeft: 18 }}>
          <li>
            Which bank?{" "}
            <select
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "var(--color-text)",
                background: "transparent",
                border: 0,
                borderBottom: "1px solid var(--color-divider)",
                padding: "2px 4px",
                margin: "0 4px",
              }}
            >
              {BANK_NAMES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>{" "}
            <a href={helpUrl(bank)} target="_blank" rel="noreferrer" style={{ color: "var(--color-accent-700)" }}>
              See how to open one at {bank} ↗
            </a>
          </li>
        </ol>
        <PlaidLinkButton
          label="I opened it — link it now"
          savingsOnly={savingsOnly}
          onLinked={(account) => {
            onAccountLinked(account);
            setLinkedAccount(account);
          }}
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 13,
            color: "var(--color-accent)",
            background: "transparent",
            border: "1px solid var(--color-accent)",
            borderRadius: "var(--radius-md)",
            padding: "9px 18px",
          }}
        />
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
