"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Loader2 } from "lucide-react";
import { PrimaryButton } from "./ui";

const STORAGE_KEY = "pp_plaid_link_token";

// Real Plaid Link (sandbox). Fetches a link_token on mount, opens Plaid's
// hosted UI, and on success exchanges the public_token server-side (see
// app/api/plaid/exchange-public-token) which also wires the Dwolla funding
// source. `onLinked(account)` fires once the whole chain finishes.
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
// no public_token to exchange (same Item, same Dwolla funding source --
// nothing new to attach), so it just calls /api/plaid/sync-cursor to
// establish a baseline and reports back via `onUpdated`.
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
  style,
}) {
  const [linkToken, setLinkToken] = useState(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState(null);
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
      .then((r) => r.json())
      .then((d) => {
        setLinkToken(d.link_token);
        window.localStorage.setItem(storageKey, d.link_token);
      })
      .catch(() => setError("Could not reach Plaid."));
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
    const res = await fetch("/api/plaid/exchange-public-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        public_token,
        account_id: account.id,
        institution_name: metadata.institution?.name,
        account_name: account.name,
        mask: account.mask,
        account_type: creditCard ? "credit" : businessAccount ? "business" : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setExchanging(false);
      setError(data.error || "Could not finish linking that account.");
      return;
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
