import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const env = process.env.PLAID_ENV || "sandbox";

const configuration = new Configuration({
  basePath: PlaidEnvironments[env],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

// Server-only. PLAID_SECRET must never reach the browser -- only import
// this inside app/api/** route handlers.
export const plaidClient = new PlaidApi(configuration);
