import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Cookie-aware server client -- reads the logged-in user's session from
// Next's request cookies. Use this to find out WHO is calling (getUser()),
// respecting RLS as that user.
export async function supabaseServer() {
  // cookies() returns a Promise as of Next.js 15 -- must be awaited before
  // any of its sync-looking methods (get/set) are called below.
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component render -- middleware refreshes
            // the session instead. Safe to ignore.
          }
        },
        remove(name, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same as above.
          }
        },
      },
    }
  );
}

// Service-role client -- bypasses RLS entirely. Only ever import this inside
// app/api/** route handlers, and only after confirming the caller's
// identity with supabaseServer().auth.getUser(). Never import this into
// anything that runs in the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Convenience: resolve the authenticated user for the current request, or
// null. Every API route should call this first and 401 if it comes back
// null -- see lib/apiAuth.js.
export async function getAuthedUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
