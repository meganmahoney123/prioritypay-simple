// QuickBooks Online OAuth 2.0 + Accounting API helper (PHASE T).
//
// No SDK dependency added -- Intuit's OAuth and Accounting API are plain
// REST/OAuth2, and this project already prefers hand-rolled HTTP over
// pulling in a client library where the surface area needed is this small
// (see how lib/dwolla.js and lib/stripe.js are the only two SDKs in this
// codebase, both for rails that genuinely need it). Same lazy-config
// spirit as stripeClient()/dwollaClient() for the values that matter:
// qboClientId()/qboClientSecret() read their env vars at call time, so
// `next build` (which imports every route module before real env vars are
// set) never chokes on an unset secret. The environment selection below
// (QBO_ENVIRONMENT/API_BASE) is read once at module load -- safe because it
// only picks a hostname and never throws on an unset value (defaults to
// sandbox).

import { encryptToken, decryptToken } from "@/lib/tokenCrypto";

const QBO_ENVIRONMENT = process.env.QBO_ENVIRONMENT === "production" ? "production" : "sandbox";
const AUTHORIZE_BASE = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const API_BASE =
  QBO_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

// Last calendar day of a month as a YYYY-MM-DD string, WITHOUT the classic
// `new Date(y, m, 0).toISOString()` timezone bug -- that builds a local
// midnight date and then converts to UTC, which rolls back to the previous
// day on any positive-UTC-offset host (dropping the month's last day from the
// report range). getDate() reads the local day number, which is the intended
// last day regardless of the server's timezone.
export function monthEndDate(year, month) {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function qboClientId() {
  return process.env.QBO_CLIENT_ID;
}

function qboClientSecret() {
  return process.env.QBO_CLIENT_SECRET;
}

function basicAuthHeader() {
  return "Basic " + Buffer.from(`${qboClientId()}:${qboClientSecret()}`).toString("base64");
}

// state is the entity_id (or the literal string "none") being connected --
// verified again in the callback against this same user's entities before
// any tokens are stored, so a tampered state can't attach a connection to
// an entity that isn't the requesting user's.
export function buildAuthorizeUrl({ redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: qboClientId(),
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTHORIZE_BASE}?${params.toString()}`;
}

export async function exchangeCodeForTokens({ code, redirectUri }) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`QBO token exchange failed: ${JSON.stringify(data)}`);
  return data; // { access_token, refresh_token, expires_in, x_refresh_token_expires_in, ... }
}

export async function refreshTokens(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`QBO token refresh failed: ${JSON.stringify(data)}`);
  return data;
}

// Returns a usable access token for a stored connection row, refreshing
// and persisting new tokens first if the current one has expired. Callers
// pass the whole connection row (as read from simple_qbo_connections) and
// an `admin` client to write the refreshed tokens back with -- kept here
// rather than in each route so the "refresh if needed" logic only exists
// once. A 60-second buffer avoids a token expiring mid-request.
export async function getValidAccessToken(admin, connection) {
  const expiresAt = new Date(connection.access_token_expires_at).getTime();
  // Stored tokens are encrypted at rest (AES-256-GCM, same as Plaid's
  // plaid_access_token -- see lib/tokenCrypto.js). decryptToken tolerates
  // legacy plaintext, so rows written before encryption still work.
  if (expiresAt - Date.now() > 60_000) return decryptToken(connection.access_token);

  const tokens = await refreshTokens(decryptToken(connection.refresh_token));
  const now = Date.now();
  const accessTokenExpiresAt = new Date(now + tokens.expires_in * 1000).toISOString();
  const refreshTokenExpiresAt = new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString();

  const { error: persistError } = await admin
    .from("simple_qbo_connections")
    .update({
      access_token: encryptToken(tokens.access_token),
      refresh_token: encryptToken(tokens.refresh_token),
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  // Intuit rotates the refresh token on every refresh and invalidates the
  // previous one after a short grace window. If we can't persist the new
  // pair, the refresh token still in the row is already on its way out --
  // fail loudly so the caller surfaces it, rather than returning a token
  // whose successor was silently lost and letting the connection brick on
  // the next refresh.
  if (persistError) throw new Error(`QBO token persist failed: ${persistError.message}`);

  return tokens.access_token;
}

// Minimal CompanyInfo call, used right after connecting purely to get a
// human-readable company_name to show in Settings -- never used for
// anything financial.
export async function fetchCompanyName({ accessToken, realmId }) {
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=65`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.CompanyInfo?.CompanyName || null;
}

// Profit and Loss summary report for one calendar month, used by the
// profit-vs-deposit true-up (see PHASE T's simple_qbo_profit_snapshots
// comment in supabase/migrations/20260907_business_tier.sql). Returns just NetIncome -- the report's
// full line-item breakdown isn't needed for the true-up itself, only the
// bottom line to compare against tracked deposits.
export async function fetchNetIncomeForMonth({ accessToken, realmId, year, month }) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = monthEndDate(year, month);

  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
    minorversion: "65",
  });
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/reports/ProfitAndLoss?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`QBO ProfitAndLoss fetch failed: ${res.status} ${await res.text()}`);
  const report = await res.json();

  // ProfitAndLoss's NetIncome row lives at the bottom of Rows.Row -- QBO's
  // report JSON is deeply nested and inconsistent about exact shape
  // between accounts, so this walks defensively rather than assuming a
  // fixed path.
  const rows = report?.Rows?.Row || [];
  const netIncomeRow = rows.find((r) => r.group === "NetIncome" || r.Summary?.ColData?.[0]?.value === "Net Income");
  const value = netIncomeRow?.Summary?.ColData?.[1]?.value ?? netIncomeRow?.ColData?.[1]?.value;
  return value !== undefined ? Number(value) : null;
}

// The actual line-item transaction list for one month (QBO's TransactionList
// report), as opposed to fetchNetIncomeForMonth's single bottom-line number.
// Used by the true-up's variance breakdown to show *which* transactions
// differ from PriorityPay's own tracked deposits, not just the net gap.
//
// Returns a normalized array of { date, type, name, amount } where `amount`
// is the transaction's natural (signed) amount as QBO reports it. Column
// order in this report is not fixed -- QBO reorders/renames columns between
// companies and configs -- so we resolve each field by its ColType rather
// than a positional guess, and walk nested section rows defensively (same
// reasoning as fetchNetIncomeForMonth's row walk).
export async function fetchTransactionsForMonth({ accessToken, realmId, year, month }) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = monthEndDate(year, month);
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate, minorversion: "65" });
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/reports/TransactionList?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`QBO TransactionList fetch failed: ${res.status} ${await res.text()}`);
  const report = await res.json();

  // Resolve columns by ColTitle first, then ColType -- QBO returns this
  // report two ways: some companies label columns with semantic ColTypes
  // (tx_date, txn_type, subt_nat_amount), others with generic ones
  // (Date / String / Money) and put the meaning in ColTitle. Checking both
  // covers both shapes. (Found against a real sandbox company whose report
  // used the generic form, which the ColType-only lookup missed entirely.)
  const cols = (report?.Columns?.Column || []).map((c) => ({
    title: (c.ColTitle || "").toLowerCase(),
    type: (c.ColType || "").toLowerCase(),
  }));
  const colIdx = (titles, types) => {
    let i = cols.findIndex((c) => titles.includes(c.title));
    if (i < 0) i = cols.findIndex((c) => types.includes(c.type));
    return i;
  };
  const iDate = colIdx(["date"], ["tx_date", "date"]);
  const iType = colIdx(["transaction type"], ["txn_type", "transaction_type"]);
  const iName = colIdx(["name"], ["name"]);
  const iAmount = colIdx(["amount"], ["subt_nat_amount", "subt_nat_home_amount", "amount", "money"]);

  const out = [];
  const walk = (rows) => {
    for (const r of rows || []) {
      const cd = r.ColData;
      if (cd) {
        const rawAmount = iAmount >= 0 ? cd[iAmount]?.value : undefined;
        const amount = rawAmount === undefined || rawAmount === "" ? null : Number(rawAmount);
        // Skip section/summary rows that carry no usable per-transaction amount.
        if (amount !== null && !Number.isNaN(amount)) {
          out.push({
            date: iDate >= 0 ? cd[iDate]?.value || null : null,
            type: iType >= 0 ? cd[iType]?.value || null : null,
            name: iName >= 0 ? cd[iName]?.value || null : null,
            amount,
          });
        }
      }
      if (r.Rows?.Row) walk(r.Rows.Row);
    }
  };
  walk(report?.Rows?.Row);
  return out;
}
