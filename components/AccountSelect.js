"use client";

import { Link2 } from "lucide-react";

const CREATE = "__create__";
const CONNECT = "__connect__";

// `onCreateNew` is optional -- pass it (with `recommendCreate` to control
// whether it's listed first or last) to surface a "Want to create a new
// savings account for this bucket?" option alongside the user's
// already-linked accounts. `onConnectAnother` is separately optional --
// pass it to surface a plain "Connect another account" option for someone
// who has a real account they just haven't linked to PriorityPay yet
// (different from onCreateNew, which walks through opening a brand-new
// one). Callers that pass neither (e.g. some Split Rules rows) get the
// plain picker as before.
//
// `theme="ledger"` swaps the visual treatment only (underlined select,
// gold-accented states matching the Ledger design) -- every prop and the
// CREATE/CONNECT sentinel-handling below is identical either way, so
// callers that don't pass a theme (Split Rules) are unaffected.
export default function AccountSelect({
  value,
  onChange,
  accounts,
  onCreateNew,
  onConnectAnother,
  recommendCreate,
  excludeSubtypes,
  theme,
}) {
  // Filters out accounts by Plaid subtype (e.g. keeping checking accounts
  // out of the Investments picker) without touching the caller's list --
  // the currently-selected account stays visible/selectable even if it
  // would now be filtered, so an existing (grandfathered) assignment
  // doesn't just silently vanish from the dropdown.
  const visibleAccounts = excludeSubtypes?.length
    ? accounts.filter((a) => a.id === value || !excludeSubtypes.includes(a.subtype))
    : accounts;
  const connected = accounts.find((a) => a.id === value);
  const createLabel = recommendCreate
    ? "Recommended: Want to create a new savings account for this bucket?"
    : "Want to create a new savings account for this bucket?";
  const createOption = onCreateNew && <option value={CREATE}>{createLabel}</option>;
  const connectOption = onConnectAnother && <option value={CONNECT}>Connect another account</option>;

  const handleChange = (e) => {
    if (e.target.value === CREATE) {
      onChange(null);
      onCreateNew?.();
      return;
    }
    if (e.target.value === CONNECT) {
      onChange(null);
      onConnectAnother?.();
      return;
    }
    onChange(e.target.value || null);
  };

  if (theme === "ledger") {
    const linkColor = connected ? "var(--color-accent)" : "color-mix(in srgb, var(--color-text) 35%, transparent)";
    const selColor = connected ? "var(--color-text)" : "var(--color-accent-700)";
    const selBorder = connected ? "var(--color-divider)" : "var(--color-accent-300)";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Link2 size={15} style={{ color: linkColor, flexShrink: 0 }} />
        <select
          value={value || ""}
          onChange={handleChange}
          style={{
            flex: 1,
            minWidth: 0,
            maxWidth: "100%",
            fontFamily: "var(--font-body)",
            fontSize: 14.5,
            color: selColor,
            background: "transparent",
            border: 0,
            borderBottom: `1px solid ${selBorder}`,
            borderRadius: 0,
            padding: "8px 2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {recommendCreate && createOption}
          <option value="">{visibleAccounts.length ? "Not connected — choose an account" : "No eligible account connected yet"}</option>
          {visibleAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.institution_name} {acc.account_name} •••• {acc.mask}
            </option>
          ))}
          {connectOption}
          {!recommendCreate && createOption}
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Link2 size={12} className="text-neutral-400 shrink-0" />
      <select
        value={value || ""}
        onChange={handleChange}
        className={`text-xs border rounded-lg px-2 py-1 w-full ${
          connected ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {recommendCreate && createOption}
        <option value="">Not connected — choose an account</option>
        {visibleAccounts.map((acc) => (
          <option key={acc.id} value={acc.id}>
            {acc.institution_name} {acc.account_name} •••• {acc.mask}
          </option>
        ))}
        {connectOption}
        {!recommendCreate && createOption}
      </select>
    </div>
  );
}
