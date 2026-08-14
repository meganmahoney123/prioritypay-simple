import { plaidClient } from "@/lib/plaid";

// Cursor-based transaction sync -- Plaid's recommended way to keep up with
// an Item's transactions, instead of re-querying a date range and having
// to figure out for yourself what's new. Pages through everything added
// since `cursor` (null means "from the beginning") and returns both the
// full added list and the new cursor to persist for next time.
//
// We only ever care about `added` here: modified/removed transactions
// don't matter for auto-splitting, since we only react to a deposit once,
// the moment it first shows up.
export async function syncNewTransactions(accessToken, cursor) {
  let added = [];
  let nextCursor = cursor || null;
  let hasMore = true;

  while (hasMore) {
    const res = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: nextCursor || undefined,
    });
    added = added.concat(res.data.added);
    nextCursor = res.data.next_cursor;
    hasMore = res.data.has_more;
  }

  return { added, cursor: nextCursor };
}

// Fetches every transaction posted between startDate/endDate (inclusive,
// "YYYY-MM-DD") for one account, for the PHASE B monthly close-out review.
// Deliberately independent of syncNewTransactions/the stored cursor above --
// that cursor is the webhook's own bookkeeping for deposit-detection
// dedup, and reusing or advancing it here would corrupt that. transactionsGet
// (not the sync endpoint) is the right tool for "give me everything in this
// specific past date range," paginated via total_transactions since Plaid
// caps each response at 500.
export async function getTransactionsForRange(accessToken, startDate, endDate) {
  let transactions = [];
  let offset = 0;
  const count = 500;

  while (true) {
    const res = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count, offset },
    });
    transactions = transactions.concat(res.data.transactions);
    const total = res.data.total_transactions;
    offset += res.data.transactions.length;
    if (offset >= total || res.data.transactions.length === 0) break;
  }

  return transactions;
}
