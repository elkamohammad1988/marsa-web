import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "@/lib/admin-session";

/**
 * Deny-by-default for the admin surface (audit S5).
 *
 * Every protected route already calls `isAdminRequest()` itself, and all four
 * current call sites are correct — so this is not fixing a live vulnerability.
 * It is changing the shape of the mistake that is possible. Today a new file at
 * `app/admin/anything/page.tsx` that forgets the call is silently
 * world-readable, with no error, no log line, and nothing in the type system,
 * the linter or the tests to catch it. After this, forgetting the call is
 * harmless because the request never reaches the handler.
 *
 * The in-route checks stay. Middleware is one matcher edit away from not
 * covering a path, and the route-level check is what fails closed if that
 * happens.
 *
 * Imports `lib/admin-session` rather than `lib/admin-auth`: middleware runs on
 * the Edge runtime and cannot use `next/headers`.
 */

/**
 * Paths under the matcher that must stay reachable without a session.
 *
 * Getting this wrong locks the operator out permanently — the login page and
 * the endpoint that issues the session cannot themselves require a session.
 * Logout is here so that clearing a stale or unparseable cookie always works.
 */
const UNAUTHENTICATED_ADMIN_PATHS = new Set([
  "/admin/login",
  "/api/admin/login",
  "/api/admin/logout",
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (UNAUTHENTICATED_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const config = getAdminConfig();
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const authenticated = config
    ? await verifySessionToken(token, config.secret)
    : false;

  if (authenticated) return NextResponse.next();

  // An unauthenticated API call gets a status it can act on; a page gets sent
  // to the login screen. Neither distinguishes "no admin configured" from
  // "wrong session", matching the login route's deliberate vagueness.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
