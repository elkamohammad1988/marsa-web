import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "@/lib/admin-session";
import { getAuthConfig, type AuthConfig } from "@/lib/auth-config";
import {
  attachSession,
  decodeSession,
  detachSession,
  encodeSession,
  needsRefresh,
  sessionFromGoTrue,
  SESSION_COOKIE,
  type UserSession,
} from "@/lib/auth-session";
import { can } from "@/lib/auth-roles";
import { ACCOUNT_HOME, policyFor, signInUrl, type RoutePolicy } from "@/lib/auth-routes";
import { GoTrueError, refreshSession } from "@/lib/gotrue";
import { fetchRole } from "@/lib/profiles";
import { captureException } from "@/lib/observability";

/**
 * Deny-by-default for both protected surfaces (audit S5, extended).
 *
 * The admin half was written first: every `/admin` route already called
 * `isAdminRequest()` itself and all four call sites were correct, so it was
 * never fixing a live vulnerability. It was changing the shape of the mistake
 * that is possible — a new file at `app/admin/anything/page.tsx` that forgets
 * the call is silently world-readable, with nothing in the type system, the
 * linter or the tests to catch it.
 *
 * The customer half applies the same rule to `/account`, and adds two things
 * an operator password never needed: renewing an access token before it
 * expires, and routing on a permission.
 *
 * The in-route checks stay on both. Middleware is one matcher edit away from
 * not covering a path, and the route-level check is what fails closed then.
 *
 * Imports `lib/admin-session` and `lib/auth-session` rather than
 * `lib/admin-auth` and `lib/auth`: middleware runs on the Edge runtime and
 * cannot use `next/headers`.
 */

/** Every redirect either gate issues, built one way. */
function redirectTo(request: NextRequest, pathname: string, search = ""): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search;
  return NextResponse.redirect(url);
}

/* ------------------------------------------------------------------ admin -- */

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

async function adminGate(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (UNAUTHENTICATED_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const config = getAdminConfig();
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  const authenticated = config ? await verifySessionToken(token, config.secret) : false;

  if (authenticated) return NextResponse.next();

  // An unauthenticated API call gets a status it can act on; a page gets sent
  // to the login screen. Neither distinguishes "no admin configured" from
  // "wrong session", matching the login route's deliberate vagueness.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return redirectTo(request, "/admin/login");
}

/* --------------------------------------------------------------- account -- */

type Resolved = {
  session: UserSession | null;
  /** True when a session existed and was definitively rejected upstream. */
  expired: boolean;
  /** True when the request's own cookie was rewritten and must be forwarded. */
  forwarded: boolean;
  /** Writes any cookie change onto the response that is finally returned. */
  apply: (response: NextResponse) => Promise<void>;
};

const NO_COOKIE_CHANGE = async () => {};

const clearCookie = async (response: NextResponse) => detachSession(response);

/**
 * The session for this request, renewed if it was about to expire.
 *
 * Renewal belongs here rather than in each page for one structural reason: a
 * server component cannot set a cookie. Middleware is the only place in the
 * request that can both notice an access token is expiring and hand the
 * replacement back to the browser — so putting it anywhere else would mean a
 * session that silently stops working an hour after sign-in.
 */
async function resolveSession(request: NextRequest, config: AuthConfig): Promise<Resolved> {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decodeSession(cookie, config.secret);

  if (!session) {
    // A cookie that is present but did not decode is stale, forged or signed
    // with a rotated secret. Clearing it turns an infinite redirect loop into
    // one redirect.
    return cookie
      ? { session: null, expired: false, forwarded: false, apply: clearCookie }
      : { session: null, expired: false, forwarded: false, apply: NO_COOKIE_CHANGE };
  }

  if (!needsRefresh(session)) {
    return { session, expired: false, forwarded: false, apply: NO_COOKIE_CHANGE };
  }

  try {
    const gotrue = await refreshSession(config, session.refreshToken);
    // The role is re-read rather than carried over, so a change of role takes
    // effect within one access-token lifetime instead of waiting out the
    // thirty-day session. The database is still the authority — see
    // `lib/profiles.ts` — but this keeps what the UI offers close to it.
    const role = await fetchRole(config, gotrue.access_token, gotrue.user.id);
    const renewed = sessionFromGoTrue(gotrue, role, { expiresAt: session.expiresAt });

    // Written onto the *request* as well as the response. Without this the
    // page rendering this very request still reads the old cookie — and after
    // a long absence that access token is already expired, so the first page
    // someone sees on coming back fails to load any data, once, for no visible
    // reason. `NextResponse.next({ request })` is what forwards it.
    request.cookies.set(SESSION_COOKIE, await encodeSession(renewed, config.secret));

    return {
      session: renewed,
      expired: false,
      forwarded: true,
      apply: async (response) => {
        await attachSession(response, renewed, config.secret);
      },
    };
  } catch (err) {
    /*
     * Two very different failures arrive here, and treating them alike is an
     * outage.
     *
     * GoTrue *rejecting* the token — spent, revoked, or past the session's own
     * timebox — is final. Retrying cannot help, so the cookie goes.
     *
     * A timeout, a refused connection or a 5xx says nothing about the session.
     * Clearing on those means one brief Supabase wobble signs out every
     * visitor whose access token happened to be inside the sixty-second
     * renewal window — an incident measured in seconds upstream becoming a
     * mass logout here. So the session is kept, this request proceeds on the
     * credential it already holds, and the next one tries again.
     */
    const rejected = err instanceof GoTrueError && err.status >= 400 && err.status < 500;

    captureException(err, {
      event: "auth.refresh.failed",
      severity: "warning",
      outcome: rejected
        ? "session cleared; the visitor is asked to sign in again"
        : "session kept; renewal retried on the next request",
    });

    return rejected
      ? { session: null, expired: true, forwarded: false, apply: clearCookie }
      : { session, expired: false, forwarded: false, apply: NO_COOKIE_CHANGE };
  }
}

/**
 * The response a policy calls for, given who the caller turned out to be.
 *
 * `proceed` rather than a bare `NextResponse.next()` so that a request whose
 * cookie was rewritten forwards it downstream, while the common path — no
 * refresh, nothing changed — stays exactly what it was before.
 */
function decide(
  request: NextRequest,
  policy: RoutePolicy,
  session: UserSession | null,
  expired: boolean,
  proceed: () => NextResponse,
): NextResponse {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  /**
   * What a refusal looks like, decided in one place.
   *
   * An API caller gets a status it can act on: a `fetch` cannot follow a
   * redirect into HTML and make anything of it. A person gets a page — the
   * sign-in screen if they are nobody yet, and their own account home if they
   * are somebody who simply may not use this, because that is somewhere they
   * can act rather than a dead end explaining a boundary they cannot cross.
   */
  const deny = (reason: "unauthenticated" | "forbidden"): NextResponse => {
    if (reason === "forbidden") {
      return isApi
        ? NextResponse.json({ error: "Forbidden." }, { status: 403 })
        : redirectTo(request, ACCOUNT_HOME);
    }
    if (isApi) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

    const target = new URL(
      signInUrl(`${pathname}${search}`, expired ? "session-expired" : undefined),
      request.nextUrl.origin,
    );
    return redirectTo(request, target.pathname, target.search);
  };

  switch (policy.access) {
    case "guest-only":
      return session ? redirectTo(request, ACCOUNT_HOME) : proceed();

    case "authenticated":
      return session ? proceed() : deny("unauthenticated");

    case "permission":
      if (!session) return deny("unauthenticated");
      return can(session.role, policy.permission) ? proceed() : deny("forbidden");

    case "public":
      return proceed();
  }
}

async function accountGate(request: NextRequest): Promise<NextResponse> {
  const policy = policyFor(request.nextUrl.pathname);
  if (policy.access === "public") return NextResponse.next();

  const config = getAuthConfig();
  if (!config) {
    // Authentication is not configured. A guest-only page must still render —
    // it is what explains the missing configuration — and everything else is
    // closed, because there is no way to be signed in.
    return decide(request, policy, null, false, () => NextResponse.next());
  }

  const resolved = await resolveSession(request, config);
  const proceed = () =>
    resolved.forwarded ? NextResponse.next({ request }) : NextResponse.next();

  const response = decide(request, policy, resolved.session, resolved.expired, proceed);
  await resolved.apply(response);
  return response;
}

/* ------------------------------------------------------------------------- */

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/")) {
    return adminGate(request);
  }
  return accountGate(request);
}

/**
 * Every path either gate governs.
 *
 * The account entries must stay in step with the policy table in
 * `lib/auth-routes.ts` — a protected prefix missing from here is a page whose
 * only remaining guard is the check inside it. `tests/auth-boundary.test.ts`
 * asserts the two agree, because Next.js requires this to be a literal and so
 * it cannot be derived.
 */
export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/account",
    "/account/:path*",
    "/api/account/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
