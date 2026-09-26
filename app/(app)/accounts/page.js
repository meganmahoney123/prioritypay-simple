"use client";

import { useEffect, useMemo, useState } from "react";
import { Landmark, CreditCard, Briefcase } from "lucide-react";
import { Card, Badge, currency } from "@/components/ui";
import PlaidLinkButton from "@/components/PlaidLinkButton";
import AccountCategoryBreakdown from "@/components/AccountCategoryBreakdown";
import { bloomGhostButtonStyle, bloomWarningCardStyle } from "@/lib/bloomTheme";

// Identity verification used to gate this whole page -- see the removed
// verification-status check below and the equivalent removal in
// app/onboarding/page.js. That was required back when this app applied to
// originate real transfers on someone's behalf, which never came through;
// manual-approval mode (lib/runSplit.js) means PriorityPay never touches
// money itself, so
// there's nothing left that actually needs identity verified before
// connecting an account.
export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [categoryBalances, setCategoryBalances] = useState({});
  const [creditCardBalances, setCreditCardBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [disconnectError, setDisconnectError] = useState(null);

  const load = async () => {
    // Fetched once here (not per-account inside AccountCategoryBreakdown)
    // to avoid N duplicate /api/allocations/account-balances requests for
    // N connected accounts -- the whole payload is small and each account
    // Card just reads its own slice out of the lookup below.
    const [accountsRes, categoryBalancesRes] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/allocations/account-balances").then((r) => r.json()),
    ]);
    setAccounts(accountsRes.accounts || []);
    setCategoryBalances(Object.fromEntries((categoryBalancesRes.accounts || []).map((a) => [a.accountId, a])));
    // Net-owed breakdown per credit card (see lib/cardCharges.js) --
    // live balance, how much of it is already covered by a category
    // withdrawal, and what's actually still owed.
    setCreditCardBalances(Object.fromEntries((categoryBalancesRes.creditCards || []).map((c) => [c.accountId, c])));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Every category the person has, across EVERY connected account -- not
  // just the account whose card this is -- so the "where did the extra
  // money come from" prompt on an overdrawn category (see
  // AccountCategoryBreakdown/FundingSourcePrompt) can offer a category
  // from a different account too. Money moving between two categories
  // doesn't require they share a bank account.
  const accountsById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const allCategories = useMemo(
    () =>
      Object.values(categoryBalances).flatMap((a) =>
        (a.categories || []).map((c) => ({
          label: c.label,
          accountId: a.accountId,
          accountLabel: accountsById[a.accountId]
            ? `${accountsById[a.accountId].institution_name} •••• ${accountsById[a.accountId].mask}`
            : null,
        }))
      ),
    [categoryBalances, accountsById]
  );

  // Aggregate hero band (matches the approved AccountsADesktop.dc.html
  // mockup's "Guilt-Free Spending Available" summary at the top of the
  // page) -- purely derived from numbers already fetched above and
  // already shown per-account/per-card below, no new backend logic:
  //   Total balance, all accounts = sum of each depository/business
  //     account's real accountBalance (excludes credit cards, which carry
  //     what they're OWED on, not a balance you have).
  //   Allocated to categories = sum of each account's own categorized
  //     total (categoryBalances[id].totalBalance).
  //   Credit card balance owed (net) = sum of every card's netOwed (see
  //     lib/cardCharges.js -- already excludes charges a category
  //     withdrawal has covered).
  const totalBalanceAllAccounts = useMemo(
    () => Object.values(categoryBalances).reduce((s, a) => s + (a.accountBalance || 0), 0),
    [categoryBalances]
  );
  const totalAllocatedToCategories = useMemo(
    () => Object.values(categoryBalances).reduce((s, a) => s + (a.totalBalance || 0), 0),
    [categoryBalances]
  );
  const totalCardOwed = useMemo(
    () => Object.values(creditCardBalances).reduce((s, c) => s + (c.netOwed || 0), 0),
    [creditCardBalances]
  );
  const totalCardExcluded = useMemo(
    () => Object.values(creditCardBalances).reduce((s, c) => s + (c.excludedByWithdrawal || 0), 0),
    [creditCardBalances]
  );
  const guiltFreeAvailable = totalBalanceAllAccounts - totalAllocatedToCategories - totalCardOwed;

  // Credit cards get their own "Connected Credit Cards" section below,
  // same grouping as the mockup, instead of sitting in the same grid as
  // depository/business accounts -- the card JSX itself is unchanged,
  // just which grid it renders in.
  const depositoryAccounts = accounts.filter((a) => a.account_type !== "credit");
  const creditAccounts = accounts.filter((a) => a.account_type === "credit");

  const disconnect = async (acc) => {
    const confirmed = window.confirm(
      `Disconnect ${acc.institution_name} ${acc.account_name} •••• ${acc.mask}? ` +
        `Any split rule currently sending money here will need a new account, and PriorityPay will stop seeing its deposits.`
    );
    if (!confirmed) return;

    setDisconnectError(null);
    setDisconnectingId(acc.id);
    const res = await fetch("/api/plaid/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: acc.id }),
    });
    const data = await res.json();
    setDisconnectingId(null);
    if (!res.ok || !data.ok) {
      setDisconnectError(data.error || "Could not disconnect that account.");
      return;
    }
    load();
  };

  if (loading) return <p className="text-sm" style={{ color: "var(--color-neutral-700)" }}>Loading…</p>;

  // Shared per-account Card markup, unchanged from before -- just pulled
  // into a function so it can render inside either the "Your Accounts" or
  // "Connected Credit Cards" grid below without duplicating the JSX.
  const renderAccountCard = (acc) => (
    <Card key={acc.id} style={{ padding: "18px 20px", borderRadius: "var(--radius-md)", background: "var(--color-surface)" }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 flex items-center justify-center"
            style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent-100)" }}
          >
            {acc.account_type === "credit" ? (
              <CreditCard size={18} style={{ color: "var(--color-accent-700)" }} />
            ) : acc.account_type === "business" ? (
              <Briefcase size={18} style={{ color: "var(--color-accent-700)" }} />
            ) : (
              <Landmark size={18} style={{ color: "var(--color-accent-700)" }} />
            )}
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-heading)", fontSize: 18 }}>{acc.institution_name}</div>
            <div className="text-xs" style={{ color: "var(--color-neutral-700)" }}>{acc.account_name} •••• {acc.mask}</div>
          </div>
        </div>
        <Badge>{acc.account_type === "credit" ? "Credit card" : acc.account_type === "business" ? "Business account" : "Active"}</Badge>
      </div>
      {acc.account_type === "credit" ? (
        creditCardBalances[acc.id] ? (
          <div className="text-xs" style={{ color: "var(--color-neutral-700)" }}>
            <div className="flex items-center justify-between mb-1">
              <span>Live balance</span>
              <span className="font-mono" style={{ color: "var(--color-text)" }}>{currency(creditCardBalances[acc.id].liveBalance)}</span>
            </div>
            {creditCardBalances[acc.id].excludedByWithdrawal > 0 && (
              <div className="flex items-center justify-between mb-1" style={{ color: "var(--color-accent-700)" }}>
                <span>− Already accounted for via withdrawals</span>
                <span className="font-mono">{currency(creditCardBalances[acc.id].excludedByWithdrawal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1 mt-1" style={{ borderTop: "1px solid var(--color-divider)" }}>
              <span className="font-semibold" style={{ color: "var(--color-text)" }}>Net amount owed</span>
              <span className="font-mono font-bold">{currency(creditCardBalances[acc.id].netOwed)}</span>
            </div>
            <p className="mt-2" style={{ color: "var(--color-neutral-700)" }}>Spending here shows up in close-out. Not used for splits.</p>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Spending here shows up in close-out. Not used for splits.</p>
        )
      ) : acc.account_type === "business" ? (
        <p className="text-xs" style={{ color: "var(--color-neutral-700)" }}>Balance shown for visibility only, never used for splits or transfers.</p>
      ) : acc.autoDetectEnabled ? (
        <p className="text-xs font-medium" style={{ color: "var(--color-accent-700)" }}>Deposits here are split automatically, you'll get a checklist to confirm and send each transfer</p>
      ) : (
        <div>
          <PlaidLinkButton
            mode="update"
            accountId={acc.id}
            label="Enable auto-detect"
            onUpdated={load}
            className="text-xs"
            style={{ borderRadius: "var(--radius-pill)", fontFamily: "var(--font-heading)", fontWeight: 700, padding: "8px 16px", fontSize: 13 }}
          />
        </div>
      )}
      <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--color-divider)" }}>
        <button
          type="button"
          onClick={() => disconnect(acc)}
          disabled={disconnectingId === acc.id}
          className="text-xs"
          style={bloomGhostButtonStyle({
            color: "var(--color-accent-700)",
            border: "none",
            background: "transparent",
            padding: "6px 4px",
            fontSize: 13,
            opacity: disconnectingId === acc.id ? 0.45 : 1,
            cursor: disconnectingId === acc.id ? "not-allowed" : "pointer",
          })}
        >
          {disconnectingId === acc.id ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
      <AccountCategoryBreakdown accountId={acc.id} data={categoryBalances[acc.id]} allCategories={allCategories} onChanged={load} />
    </Card>
  );

  return (
    <div className="space-y-6">
      <div id="connect">
        {/* "...or app" was dropped here on purpose -- Plaid's Transactions
            product links real bank/credit union accounts, not P2P apps
            like Venmo or Cash App, so the old copy overpromised what this
            button can actually connect. */}
        <PlaidLinkButton
          label="Connect a bank account"
          onLinked={load}
          style={{ borderRadius: "var(--radius-pill)", fontFamily: "var(--font-heading)", fontWeight: 700 }}
        />
        <PlaidLinkButton
          label="Add a credit card"
          creditCard
          onLinked={load}
          className="text-xs mt-2 ml-2"
          style={{
            borderRadius: "var(--radius-pill)",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            padding: "10px 20px",
            background: "var(--color-accent-800)",
            border: "1px solid var(--color-accent-800)",
          }}
        />
        <p className="text-xs mt-2" style={{ color: "var(--color-neutral-700)" }}>
          Credit cards are for close-out expense tracking only, they're never used for splits or transfers.
        </p>
        {disconnectError && (
          <div className="text-xs mt-2 p-3" style={bloomWarningCardStyle()}>
            {disconnectError}
          </div>
        )}
      </div>

      {/* Aggregate hero band -- matches the approved AccountsADesktop.dc.html
          mockup's "Guilt-Free Spending Available" summary. Only shown once
          there's at least one depository/business account to summarize, so
          it doesn't show a hollow $0 band before anything's connected. */}
      {depositoryAccounts.length > 0 && (
        <div style={{ border: "1px solid var(--color-accent-300)", borderRadius: "var(--radius-lg)", background: "var(--color-accent-200)", color: "var(--color-accent-800)", padding: "26px 30px" }}>
          <div className="flex items-center justify-between gap-10 flex-wrap">
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-700)" }}>
                Guilt-Free Spending Available
              </div>
              <div className="font-mono" style={{ fontSize: 40, fontWeight: 700, marginTop: 4, color: "var(--color-accent-900)" }}>
                {currency(guiltFreeAvailable)}
              </div>
            </div>
            <div className="flex gap-8 flex-wrap">
              <div>
                <div style={{ fontSize: 11, color: "var(--color-accent-700)", fontWeight: 600 }}>Total balance, all accounts</div>
                <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{currency(totalBalanceAllAccounts)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9C3B22", fontWeight: 600 }}>− Allocated to categories</div>
                <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: "#9C3B22" }}>{currency(totalAllocatedToCategories)}</div>
              </div>
              {totalCardOwed > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: "#9C3B22", fontWeight: 600 }}>− Credit card balance owed (net)</div>
                  <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 2, color: "#9C3B22" }}>{currency(totalCardOwed)}</div>
                </div>
              )}
            </div>
          </div>
          {totalCardExcluded > 0 && (
            <div style={{ fontSize: 11.5, color: "var(--color-accent-700)", marginTop: 14, lineHeight: 1.4 }}>
              The credit card balance above excludes {currency(totalCardExcluded)} already covered by category withdrawals. See the card breakdown below.
            </div>
          )}
        </div>
      )}

      {depositoryAccounts.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
            Your Accounts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {depositoryAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}

      {creditAccounts.length > 0 && (
        <div>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
            Connected Credit Cards
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {creditAccounts.map(renderAccountCard)}
          </div>
        </div>
      )}
    </div>
  );
}
