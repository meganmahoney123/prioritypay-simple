// Maps a Plaid institution_name to the bank's own login/transfer page, so the
// "waiting on you" checklist (see components/PendingTransfers.js) can send
// someone straight to where they'd actually move the money themselves.
// PriorityPay never touches the transfer -- this is just a shortcut to the
// right front door. Keys are lowercased and matched by substring against the
// institution_name Plaid gives us, since Plaid's exact naming can vary
// slightly ("Ally Bank" vs "Ally", "Bank of America" vs "Bank of America,
// N.A.", etc.) -- see `resolveBankLoginUrl` below for the matching logic.
//
// This list is intentionally short and easy to extend -- add an entry
// whenever a real user hits the fallback below for a bank worth covering.
const BANK_LOGIN_URLS = {
  "ally": "https://secure.ally.com/",
  "american express": "https://global.americanexpress.com/login",
  "bank of america": "https://www.bankofamerica.com/",
  "capital one": "https://verified.capitalone.com/",
  "charles schwab": "https://client.schwab.com/",
  "schwab": "https://client.schwab.com/",
  "chase": "https://secure.chase.com/",
  "chime": "https://app.chime.com/",
  "citi": "https://online.citi.com/",
  "citibank": "https://online.citi.com/",
  "discover": "https://www.discover.com/",
  "fidelity": "https://login.fidelity.com/",
  "navy federal": "https://www.navyfederal.org/",
  "pnc": "https://www.pnc.com/",
  "sofi": "https://www.sofi.com/",
  "truist": "https://www.truist.com/",
  "u.s. bank": "https://www.usbank.com/",
  "us bank": "https://www.usbank.com/",
  "vanguard": "https://investor.vanguard.com/",
  "wells fargo": "https://www.wellsfargo.com/",
};

// Best-effort match: lowercase the institution name, strip a trailing
// "N.A."/"Bank"/"Inc." style suffix noise, then look for the first known key
// that appears as a substring. Falls back to a Google search for the bank's
// login page, which is at worst one extra click and never a dead link -- far
// better than silently rendering nothing for a bank not yet in the map above.
export function resolveBankLoginUrl(institutionName) {
  const name = (institutionName || "").toLowerCase().trim();
  if (!name) return null;

  for (const key of Object.keys(BANK_LOGIN_URLS)) {
    if (name.includes(key)) return BANK_LOGIN_URLS[key];
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${institutionName} login`)}`;
}
