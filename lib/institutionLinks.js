// Best-effort "go view this account on the real institution's site" links,
// keyed off Plaid's institution_name -- same idea and same fallback shape
// as CreateSubAccountFlow.js's BANK_HELP, just for the brokerage/retirement
// custodians people are more likely to connect a real Solo 401k/SEP IRA
// through. Plaid has no API for "deep link straight into this specific
// account," so this always lands on the institution's general login page,
// not the account itself -- close enough to get someone one click from
// their real numbers. Not verified against the live URLs; check before
// relying on them, since login pages move. Anything unlisted falls back to
// a search instead of a dead link.
const INSTITUTION_LOGIN_URLS = {
  Fidelity: "https://login.fidelity.com/",
  Vanguard: "https://logon.vanguard.com/",
  "Charles Schwab": "https://client.schwab.com/Login/SignOn/CustomerCenterLogin.aspx",
  Schwab: "https://client.schwab.com/Login/SignOn/CustomerCenterLogin.aspx",
  "E*TRADE": "https://us.etrade.com/e/t/user/login",
  Etrade: "https://us.etrade.com/e/t/user/login",
  Betterment: "https://www.betterment.com/app/login",
  "Merrill Edge": "https://www.merrilledge.com/",
  "TD Ameritrade": "https://invest.ameritrade.com/grid/p/login",
  "T. Rowe Price": "https://www.troweprice.com/personal-investing/account-access.html",
  Empower: "https://home.personalcapital.com/page/login/goHome",
  "Rocket Dollar": "https://dashboard.rocketdollar.com/login",
  "American Funds": "https://www.capitalgroup.com/individual/login.html",
};

export function institutionLoginUrl(institutionName) {
  if (!institutionName) return null;
  return (
    INSTITUTION_LOGIN_URLS[institutionName] ||
    `https://www.google.com/search?q=${encodeURIComponent(institutionName + " login")}`
  );
}
