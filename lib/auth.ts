import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuthConfig } from "@/lib/auth-config";
import { decodeSession, SESSION_COOKIE, type UserSession } from "@/lib/auth-session";
import { can, type Permission } from "@/lib/auth-roles";
import { ACCOUNT_HOME, SIGN_IN_PATH } from "@/lib/auth-routes";

/**
 * Authentication in a request context.
 *
 * The counterpart to `lib/admin-auth.ts`, and split the same way and for the
 * same reason: the primitives live in `lib/auth-session.ts` so `middleware.ts`
 * can verify a session without `next/headers`, which middleware cannot use.
 * This module is what server components and route handlers call.
 *
 * Everything here re-checks what middleware has already checked. That
 * duplication is deliberate — it is the audit S5 lesson applied to a second
 * boundary. The middleware matcher is a list of path patterns maintained by
 * hand, and the day it stops covering a route, these are what fail closed.
 */

/** The session on this request, or null. Never throws. */
export async function getSession(): Promise<UserSession | null> {
  const config = getAuthConfig();
  if (!config) return null;

  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value, config.secret);
}

/**
 * The session, or a redirect to sign in.
 *
 * Redirects to the bare sign-in path with no `?next=`. Middleware sets that
 * parameter, because it knows the path being requested; a server component
 * does not have a first-class way to ask. Reaching this function at all means
 * middleware did not run for this route, so the destination after signing in
 * is the account home — a working outcome, one navigation short of ideal, and
 * not worth reading a header Next.js does not promise.
 */
export async function requireSession(): Promise<UserSession> {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PATH);
  return session;
}

/**
 * The session, if it carries a permission; otherwise back to the account home.
 *
 * Not a 403 page: somebody signed in who reaches a surface they may not use is
 * far more likely to have followed a stale link than to be probing, and the
 * account home is where they can actually do something. The API equivalent in
 * `middleware.ts` answers 403, because a fetch cannot follow a redirect into
 * HTML and get anything useful from it.
 */
export async function requirePermission(permission: Permission): Promise<UserSession> {
  const session = await requireSession();
  if (!can(session.role, permission)) redirect(ACCOUNT_HOME);
  return session;
}
