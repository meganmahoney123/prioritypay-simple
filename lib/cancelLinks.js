// Where to cancel or manage a subscription. PrioritySave never cancels
// anything and never moves money: this only links to the company's own page.
// The list is checked once a month (see CANCEL_LINKS_CHECKED) so broken pages
// are caught and fixed.
export const CANCEL_LINKS_CHECKED = "2026-11";

// [words to look for in the payment name, page to open]
export const CANCEL_LINKS = [
  [["netflix"], "https://www.netflix.com/cancelplan"],
  [["spotify"], "https://www.spotify.com/account/subscription/"],
  [["hulu"], "https://secure.hulu.com/account"],
  [["disney+", "disney plus", "disneyplus"], "https://www.disneyplus.com/account/subscription"],
  [["hbo max", "max.com"], "https://www.max.com/account"],
  [["peacock"], "https://www.peacocktv.com/account"],
  [["paramount"], "https://www.paramountplus.com/account/"],
  [["youtube premium", "youtube tv", "youtubepremium"], "https://www.youtube.com/paid_memberships"],
  [["amazon prime", "prime video", "amzn prime"], "https://www.amazon.com/gp/primecentral"],
  [["audible"], "https://www.audible.com/account/overview"],
  [["apple.com/bill", "apple music", "icloud", "apple tv"], "https://apps.apple.com/account/subscriptions"],
  [["google one", "google storage", "google play"], "https://play.google.com/store/account/subscriptions"],
  [["adobe"], "https://account.adobe.com/plans"],
  [["microsoft 365", "office 365", "msft"], "https://account.microsoft.com/services"],
  [["dropbox"], "https://www.dropbox.com/account/plan"],
  [["canva"], "https://www.canva.com/settings/billing-and-teams"],
  [["zoom"], "https://zoom.us/billing"],
  [["linkedin"], "https://www.linkedin.com/premium/manage"],
  [["github"], "https://github.com/settings/billing"],
  [["claude.ai", "anthropic"], "https://claude.ai/settings/billing"],
  [["chatgpt", "openai"], "https://chatgpt.com/#settings/Subscription"],
  [["peloton"], "https://members.onepeloton.com/preferences/subscriptions"],
  [["siriusxm", "sirius xm"], "https://care.siriusxm.com/"],
  [["godaddy"], "https://account.godaddy.com/subscriptions"],
  [["squarespace"], "https://account.squarespace.com/"],
  [["shopify"], "https://admin.shopify.com/"],
  [["quickbooks", "intuit"], "https://accounts.intuit.com/"],
  [["grammarly"], "https://account.grammarly.com/subscription"],
  [["duolingo"], "https://www.duolingo.com/settings/subscription"],
  [["new york times", "nytimes"], "https://myaccount.nytimes.com/seg/subscription"],
  [["wall street journal", "wsj"], "https://customercenter.wsj.com/"],
];

// Things that are not subscriptions you cancel by visiting a website.
const NOT_CANCELABLE = /rent|mortgage|loan|insurance|credit card|visa|mastercard|amex|discover|utilit|electric|water|gas bill|tax|hoa|payment to|student|minimum/i;

// { url, exact } for a payment name, or null when it isn't something to cancel.
// exact is false when we fall back to a search for how to cancel it.
// Every bill gets a link. Known services go to their own account page. Other
// subscriptions get a "how to cancel" search. Rent, loans, insurance, taxes and
// the like can't be "cancelled" the same way, so they get a "manage" search
// (find the company's login, payment or policy page). `hint` is the company
// name when the bill's own name is generic, like "Car insurance" for GEICO.
export function cancelLinkFor(name, hint) {
  const n = String(name || "").toLowerCase();
  if (!n.trim()) return null;
  const h = String(hint || "").toLowerCase();
  for (const [words, url] of CANCEL_LINKS) {
    if (words.some((w) => n.includes(w) || (h && h.includes(w)))) return { url, kind: "exact", exact: true };
  }
  const term = [name, hint].filter(Boolean).join(" ");
  if (NOT_CANCELABLE.test(n)) {
    return { url: `https://www.google.com/search?q=${encodeURIComponent(`${term} manage account or change payment`)}`, kind: "manage", exact: false };
  }
  return { url: `https://www.google.com/search?q=${encodeURIComponent(`how to cancel ${term} subscription`)}`, kind: "cancel", exact: false };
}
