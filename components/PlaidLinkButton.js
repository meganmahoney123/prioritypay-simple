"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Loader2 } from "lucide-react";
import { PrimaryButton } from "./ui";

const STORAGE_KEY = "pp_plaid_link_token";

// Real Plaid Link (sandbox). Fetches a link_token on mount, opens Plaid's
// hosted UI, and on success exchanges the public_token server-side (see
// app/api/plaid/exchange-public-token) to store the linked account.
// `onLinked(account)` fires once the whole chain finishes.
//
// Some institutions (Chase, Bank of America, Wells Fargo -- in both sandbox
// and real life) use Plaid's OAuth flow: Link redirects the whole page out
// to the bank and back, rather than staying in the modal. That means this
// component unmounts and remounts with a fresh link_token, which would
// normally lose the in-progress session entirely. To resume it we persist
// the original token before leaving, and on return (detected via the
// `oauth_state_id` query param Plaid appends to the redirect) reuse that
// token with `receivedRedirectUri` instead of requesting a new one, then
// auto-reopen Link once it's ready -- the user already clicked "connect"
// once, they shouldn't have to again just because the bank redirected.
// `mode="update"` + `accountId` puts this in "update mode" -- re-opens
// Link against an *already linked* account (see
// app/api/plaid/create-update-link-token) to grant a product it didn't
// originally have, instead of creating a brand new one. On success there's
// no public_token to exchange (same Item, nothing new to attach), so it
// just calls /api/plaid/sync-cursor to establish a baseline and reports
// back via `onUpdated`.
export default function PlaidLinkButton({
  onLinked,
  onUpdated,
  disabled,
  label = "Connect a bank account",
  mode = "link",
  accountId,
  className,
  retirementType,
  investmentType,
  savingsOnly,
  creditCard,
  businessAccount,
  keyHint,
  style,
}) {
  const [linkToken, setLinkToken] = useState(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState(null);
  // Set only when the initial "update mode" link-token request itself fails
  // (e.g. the account's Plaid connection is broken/missing entirely) --
  // distinct from `error`, which also covers mid-flow failures on a
  // link-token that DID come back OK. A broken update-mode connection can
  // never become `ready` (no token was ever issued), so the button would
  // just sit there permanently disabled with a raw backend error under it
  // ("Account not found.") that isn't something the person can act on.
  // Render swaps in a plain-language, actionable message instead (see
  // below) rather than hiding the problem entirely.
  const [updateLinkBroken, setUpdateLinkBroken] = useState(false);
  const [isOAuthReturn] = useState(
    () => typeof window !== "undefined" && window.location.search.includes("oauth_state_id")
  );
  const storageKey = mode === "update"
    ? `${STORAGE_KEY}_update_${accountId}`
    : retirementType
    ? `${STORAGE_KEY}_retirement_${retirementType}`
    : investmentType
    ? `${STORAGE_KEY}_investment_${investmentType}`
    : savingsOnly
    ? `${STORAGE_KEY}_savings_only`
    : creditCard
    ? `${STORAGE_KEY}_credit_card`
    : businessAccount
    ? `${STORAGE_KEY}_business_account`
    // Two plain (non-typed) buttons can now sit on the same page (Accounts
    // page's "Connect a bank account" and "Connect an investment account"
    // -- same plain /api/plaid/create-link-token flow either way, just a
    // different label). Without a distinct key here they'd share one
    // localStorage slot for the OAuth-redirect resume token, so whichever
    // button's fetch finished last would silently win and the other could
    // resume with the wrong token after an OAuth bank's redirect back.
    // `keyHint` just needs to be unique per button instance on a page, not
    // meaningful -- it isn't sent to any API.
    : keyHint
    ? `${STORAGE_KEY}_${keyHint}`
    : STORAGE_KEY;

  useEffect(() => {
    if (isOAuthReturn) {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        setLinkToken(saved);
        return;
      }
    }
    const endpoint = mode === "update"
      ? "/api/plaid/create-update-link-token"
      : retirementType
      ? "/api/plaid/create-retirement-link-token"
      : investmentType
      ? "/api/plaid/create-investment-link-token"
      : creditCard
      ? "/api/plaid/create-credit-link-token"
      : "/api/plaid/create-link-token";
    const body = mode === "update"
      ? JSON.stringify({ accountId })
      : retirementType
      ? JSON.stringify({ retirementType })
      : investmentType
      ? JSON.stringify({ investmentType })
      : savingsOnly
      ? JSON.stringify({ savingsOnly: true })
      : undefined;
    fetch(endpoint, {
      method: "POST",
      headers: mode === "update" || retirementType || investmentType || savingsOnly ? { "Content-Type": "application/json" } : undefined,
      body,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) {
          if (mode === "update") {
            setUpdateLinkBroken(true);
          } else {
            setError(d.error || "Could not get a link token.");
          }
          return;
        }
        setLinkToken(d.link_token);
        window.localStorage.setItem(storageKey, d.link_token);
      })
      .catch(() => {
        if (mode === "update") {
          setUpdateLinkBroken(true);
        } else {
          setError("Could not reach Plaid.");
        }
      });
  }, [isOAuthReturn, mode, accountId, retirementType, investmentType, savingsOnly, creditCard, businessAccount, storageKey]);

  const onSuccess = useCallback(async (public_token, metadata) => {
    window.localStorage.removeItem(storageKey);
    setExchanging(true);
    setError(null);

    if (mode === "update") {
      const res = await fetch("/api/plaid/sync-cursor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      setExchanging(false);
      if (!res.ok || !data.ok) {
        setError(data.error?.error_message || data.error || "Could not finish enabling auto-detect.");
        return;
      }
      onUpdated?.();
      return;
    }

    const account = metadata.accounts[0];
    // `creditCard` (this button instance was told upfront it's card-only,
    // e.g. the old dedicated "Add a credit card" flow) still wins when
    // set, but a plain/unified button doesn't know what the person is
    // about to pick -- Plaid itself tells us afterward, via the linked
    // account's own `type` in the success metadata. Checking that too
    // means one unrestricted button can correctly file a credit card as
    // account_type "credit" even though nothing on this button instance
    // said "credit card" ahead of time.
    const isCreditAccount = creditCard || account.type === "credit";
    const res = await fetch("/api/plaid/exchange-public-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_token,
        account_id: account.id,
        institution_name: metadata.institution?.name,
        account_name: account.name,
        mask: account.mask,
        account_type: isCreditAccount ? "credit" : businessAccount ? "business" : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setExchanging(false);
      setError(data.error || "Could not finish linking that account.");
      return;
    }

    // Try to establish the sync cursor immediately, right on the first
    // link, instead of only ever doing this later via the webhook or a
    // separate "Enable auto-detect" reconnect. Since manual_approval mode
    // already requests Transactions on this very first Link call (see
    // create-link-token), Plaid/the bank has nothing further to consent
    // to -- so succeeding here means the account is fully auto-detect-
    // ready with only ONE bank login, not two. This can still fail (Plaid
    // sometimes hasn't finished its initial pull yet -- see the comment
    // in exchange-public-token), and that's fine: the webhook remains the
    // fallback that sets the cursor later, same as before this change, and
    // "Enable auto-detect" still exists for that case.
    if (!isCreditAccount && !businessAccount) {
      try {
        await fetch("/api/plaid/sync-cursor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: data.account.id }),
        });
      } catch {
        // Ignore -- webhook fallback still covers this.
      }
    }

    if (retirementType) {
      // PHASE B: connects the REAL Solo 401k/SEP IRA (retirement_accounts),
      // not a split rule -- this scoped retirementType flow is only used
      // from the close-out flow now, where it's the account close-out
      // actually sends contribution money to.
      const setRes = await fetch("/api/retirement/connect-real-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retirementType, accountId: data.account.id }),
      });
      const setData = await setRes.json();
      setExchanging(false);
      if (!setRes.ok) {
        setError(setData.error || "Linked the account, but couldn't assign it. Check Split Rules.");
        return;
      }
      onLinked?.(data.account);
      return;
    }

    if (investmentType) {
      const setRes = await fetch("/api/investment/set-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investmentType, accountId: data.account.id }),
      });
      const setData = await setRes.json();
      setExchanging(false);
      if (!setRes.ok) {
        setError(setData.error || "Linked the account, but couldn't assign it. Check Split Rules.");
        return;
      }
      onLinked?.(data.account);
      return;
    }

    setExchanging(false);
    onLinked?.(data.account);
  }, [onLinked, onUpdated, mode, accountId, retirementType, investmentType, creditCard, businessAccount, storageKey]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    receivedRedirectUri: isOAuthReturn && typeof window !== "undefined" ? window.location.href : undefined,
  });

  useEffect(() => {
    if (isOAuthReturn && ready) {
      open();
    }
  }, [isOAuthReturn, ready, open]);

  // Update-mode connection is broken (see updateLinkBroken above) -- no
  // token was ever issued, so the button could never actually work. Rather
  // than a permanently-disabled button plus a raw backend error, point at
  // the fix that actually works: disconnecting and relinking the account
  // (the Disconnect action already sits right below this on the Accounts
  // page's account card).
  if (mode === "update" && updateLinkBroken) {
    return (
      <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
        Couldn't reconnect this account automatically. Disconnecting and relinking it below should fix it.
      </p>
    );
  }

  return (
    <div>
      <PrimaryButton onClick={() => open()} disabled={disabled || !ready || exchanging} className={className} style={style}>
        {exchanging && <Loader2 size={15} className="animate-spin" />}
        {exchanging ? "Linking…" : isOAuthReturn && !ready ? "Resuming…" : label}
      </PrimaryButton>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}
