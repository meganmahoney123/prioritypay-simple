"use client";

import { ExternalLink } from "lucide-react";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { RETIREMENT_LABELS, RETIREMENT_SETUP_LINKS } from "@/lib/allocations";
import { institutionLoginUrl } from "@/lib/institutionLinks";
import { currency } from "@/components/ui";

// PHASE B: "connect your real SEP IRA / Solo 401k" control, now used only
// on the close-out recommendations screen -- that's the only place a real
// retirement account gets connected anymore (see retirement_accounts;
// Minimums/Percentage Splits/onboarding just use a plain holding account
// now, see PHASE A). Deliberately never falls back to a generic account
// picker -- retirement rows may only point at an account linked through the
// scoped retirement Plaid flow (see create-retirement-link-token's
// account_filters), never an arbitrary checking/savings account, so there's
// no mix-up. Takes retirementType/accountId directly (not nested in a split
// rule) since the real account isn't tied to a split rule at all anymore.
export default function RetirementConnectRow({ retirementType, accountId, accounts = [], onLinked }) {
  const label = RETIREMENT_LABELS[retirementType] || retirementType;
  const account = accountId ? accounts.find((a) => a.id === accountId) : null;

  if (!accountId) {
    return (
      <div className="mt-1">
        <div className="flex items-center gap-3 flex-wrap">
          <PlaidLinkButton
            retirementType={retirementType}
            label={`Connect ${label}`}
            onLinked={onLinked}
            className="text-xs px-4 py-2"
          />
          <a
            href={RETIREMENT_SETUP_LINKS[retirementType]}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold underline"
            style={{ color: "var(--color-accent-700)" }}
          >
            Don&apos;t have one yet? Here&apos;s how to open one
          </a>
        </div>
      </div>
    );
  }

  const loginUrl = account ? institutionLoginUrl(account.institution_name) : null;

  return (
    <div className="mt-1">
      <p className="text-xs font-medium" style={{ color: "var(--color-accent-700)" }}>
        Connected{account ? ` — ${account.institution_name} ${account.account_name} •••• ${account.mask}` : ""}
      </p>
      {account && (
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {account.current_balance !== null && account.current_balance !== undefined && (
            <span className="text-xs text-neutral-500">
              Current account balance: <span className="font-mono font-semibold text-neutral-700">{currency(account.current_balance)}</span>
            </span>
          )}
          {loginUrl && (
            <a
              href={loginUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold underline inline-flex items-center gap-1"
              style={{ color: "var(--color-accent-700)" }}
            >
              View account <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
      <p className="text-[11px] text-neutral-400 leading-snug mt-1">
        Balance comes straight from Plaid and reflects everything in the account -- growth, past contributions,
        anything sent outside PriorityPay too, not just what PriorityPay has sent it.
      </p>
    </div>
  );
}
