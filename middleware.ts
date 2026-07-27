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
import { refreshSession } from "@/lib/gotrue";
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

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.search = "";
  return NextResponse.redirect(loginUrl);
}

/* --------------------------------------------------------------- account -- */

type Resolved = {
  session: UserSession | null;
  /** True when a session existed and could not be renewed. */
  expired: boolean;
  /** True when the request's own cookie was rewritten and must be forwarded. */
  forwarded: boolean;
  /** Writes any cookie change onto the response that is finally returned. */
  apply: (response: NextResponse) => Promise<void>;
};

const NO_COOKIE_CHANGE = async () => {};

/**
 * The session for this request, renewed if it was about to expire.
 *
 * Renewal belongs here rather than in each page for one structural reason: a
 * server component cannot set a cookie. Middleware is the only place in the
 * request that can both notice an access token is expiring and hand the
 * replacement back to the browser — so putting it anywhere else would mean a
 * session that silently stops working an hour after sign-in.
 *
 * A refresh that fails is final: Supabase rotates refresh tokens, so the one
 * we hold is either spent, revoked, or past the session's own timebox, and
 * none of those is retryable. The cookie is cleared and the request continues
 * as an anonymous one.
 */
async function resolveSession(request: NextRequest, config: AuthConfig): Promise<Resolved> {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await decodeSession(cookie, config.secret);

  // No session, or one that verified and has life left in it.
  if (!session) {
    // A cookie that is present but did not decode is stale, forged or signed
    // with a rotated secret. Clearing it turns an infinite redirect loop into
    // one redirect.
    return cookie
      ? { session: null, expired: false, forwarded: false, apply: async (res) => detachSession(res) }
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
    captureException(err, {
      event: "auth.refresh.failed",
      severity: "warning",
      fallback: "session cleared; the visitor is asked to sign in again",
    });
    return {
      session: null,
      expired: true,
      forwarded: false,
      apply: async (res) => detachSession(res),
    };
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

  const toSignIn = () => {
    if (isApi) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const url = request.nextUrl.clone();
    const target = signInUrl(`${pathname}${search}`, expired ? "session-expired" : undefined);
    const parsed = new URL(target, request.nextUrl.origin);
    url.pathname = parsed.pathname;
    url.search = parsed.search;
    return NextResponse.redirect(url);
  };

  switch (policy.access) {
    case "guest-only": {
      if (!session) return proceed();
      const url = request.nextUrl.clone();
      url.pathname = ACCOUNT_HOME;
      url.search = "";
      return NextResponse.redirect(url);
    }

    case "authenticated":
      return session ? proceed() : toSignIn();

    case "permission": {
      if (!session) return toSignIn();
      if (can(session.role, policy.permission)) return proceed();
      // Signed in, but not for this. An API gets a status it can act on; a
      // person gets their account home, which is somewhere they can use,
      // rather than a dead end explaining a boundary they cannot cross.
      if (isApi) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      const url = request.nextUrl.clone();
      url.pathname = ACCOUNT_HOME;
      url.search = "";
      return NextResponse.redirect(url);
    }

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
