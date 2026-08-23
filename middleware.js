import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Paths that must stay reachable even when a signed-in user hasn't cleared
// their MFA challenge yet -- the challenge page itself (obviously), the
// pre-session auth pages, the API layer (redirecting a fetch() call to an
// HTML page breaks every client-side JSON parse -- API routes that need
// AAL2 enforce it themselves instead), and static/public marketing pages
// that don't need to be gated at all.
const MFA_EXEMPT_PREFIXES = ["/mfa-challenge", "/login", "/signup", "/api", "/terms", "/privacy"];

function isMfaExempt(pathname) {
  return MFA_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Refreshes the Supabase auth cookie on every request -- without this,
// sessions silently expire mid-visit. Standard Supabase + Next.js App
// Router pattern. Also enforces the post-password MFA step: if a signed-in
// user has a verified TOTP factor but this session hasn't completed the
// second factor yet (aal1, with aal2 available), every page request gets
// redirected to /mfa-challenge before it can reach Plaid Link (onboarding)
// or any authenticated page -- see app/mfa-challenge/page.js.
export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (user && !isMfaExempt(pathname)) {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== aal.nextLevel) {
      const url = request.nextUrl.clone();
      url.pathname = "/mfa-challenge";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
