// QuickBooks Online OAuth 2.0 + Accounting API helper (PHASE Q).
//
// No SDK dependency added -- Intuit's OAuth and Accounting API are plain
// REST/OAuth2, and this project already prefers hand-rolled HTTP over
// pulling in a client library where the surface area needed is this small
// (see how lib/dwolla.js and lib/stripe.js are the only two SDKs in this
// codebase, both for rails that genuinely need it). Same lazy-config
// pattern as stripeClient()/dwollaClient() -- read env vars at call time,
// not at module load, so `next build` doesn't choke on unset vars.

const QBO_ENV = process.env.QBO_ENV === "production" ? "production" : "sandbox";
const AUTHORIZE_BASE = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const API_BASE =
  QBO_ENV === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";

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
  if (expiresAt - Date.now() > 60_000) return connection.access_token;

  const tokens = await refreshTokens(connection.refresh_token);
  const now = Date.now();
  const accessTokenExpiresAt = new Date(now + tokens.expires_in * 1000).toISOString();
  const refreshTokenExpiresAt = new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString();

  await admin
    .from("simple_qbo_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      access_token_expires_at: accessTokenExpiresAt,
      refresh_token_expires_at: refreshTokenExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

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
// profit-vs-deposit true-up (see PHASE Q's simple_qbo_profit_snapshots
// comment in supabase/schema.sql). Returns just NetIncome -- the report's
// full line-item breakdown isn't needed for the true-up itself, only the
// bottom line to compare against tracked deposits.
export async function fetchNetIncomeForMonth({ accessToken, realmId, year, month }) {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDateObj = new Date(year, month, 0); // last day of that month
  const endDate = endDateObj.toISOString().slice(0, 10);

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
