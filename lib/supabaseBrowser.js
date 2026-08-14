"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side client, used ONLY for auth (sign up / sign in / sign out /
// session). All actual data reads and writes go through our own API routes
// (see app/api/**) so the anon key is never asked to touch tables that hold
// Plaid access tokens or Dwolla IDs -- Postgres RLS is row-level, not
// column-level, so keeping data access server-side is what actually keeps
// those columns out of the browser.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
