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
export default function AccountSelect({ value, onChange, accounts, onCreateNew, onConnectAnother, recommendCreate }) {
  const connected = accounts.find((a) => a.id === value);
  const createOption = onCreateNew && (
    <option value={CREATE}>
      {recommendCreate
        ? "Recommended: Want to create a new savings account for this bucket?"
        : "Want to create a new savings account for this bucket?"}
    </option>
  );
  const connectOption = onConnectAnother && <option value={CONNECT}>Connect another account</option>;
  return (
    <div className="flex items-center gap-1.5">
      <Link2 size={12} className="text-neutral-400 shrink-0" />
      <select
        value={value || ""}
        onChange={(e) => {
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
        }}
        className={`text-xs border rounded-lg px-2 py-1 w-full ${
          connected ? "border-emerald-200 bg-emerald-50 text-emerald-800 font-medium" : "border-amber-200 bg-amber-50 text-amber-800"
        }`}
      >
        {recommendCreate && createOption}
        <option value="">Not connected — choose an account</option>
        {accounts.map((acc) => (
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
