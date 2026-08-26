"use client";

import { ExternalLink } from "lucide-react";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import { RETIREMENT_LABELS, RETIREMENT_SETUP_LINKS } from "@/lib/allocations";
import { institutionLoginUrl } from "@/lib/institutionLinks";
import { currency } from "@/components/ui";

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
            <span className="text-xs text-[var(--color-neutral-700)]">
              Current account balance: <span className="font-mono font-semibold text-[var(--color-neutral-800)]">{currency(account.current_balance)}</span>
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
      <p className="text-[11px] text-[var(--color-neutral-700)] leading-snug mt-1">
        Balance comes straight from Plaid and reflects everything in the account — growth, past contributions,
        anything sent outside PriorityPay too, not just what PriorityPay has sent it.
      </p>
    </div>
  );
}
