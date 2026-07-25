import { cookies } from "next/headers";
import { ADMIN_COOKIE, getAdminConfig, verifySessionToken } from "@/lib/admin-session";

/**
 * Admin authentication in a request context.
 *
 * The session primitives live in `lib/admin-session.ts` so `middleware.ts` can
 * verify a session without importing `next/headers`, which middleware cannot
 * use. Everything is re-exported here so existing call sites are unchanged.
 */

export * from "@/lib/admin-session";

/**
 * True when the current request carries a valid admin session.
 *
 * Still called by every protected route even though `middleware.ts` now
 * enforces the same check ahead of them (audit S5). That duplication is
 * deliberate defence in depth: middleware is one config edit away from not
 * matching a path, and the route-level check is what fails closed if that
 * happens.
 */
export async function isAdminRequest(): Promise<boolean> {
  const config = getAdminConfig();
  if (!config) return false;
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value, config.secret);
}
