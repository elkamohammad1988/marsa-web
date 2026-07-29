/**
 * Admin session primitives, with no dependency on request context.
 *
 * Split out from `lib/admin-auth.ts` so `middleware.ts` can verify a session
 * without importing `next/headers`, which is unavailable in middleware
 * (audit S5). Everything here is a pure function over its arguments and runs
 * unchanged on the Node and Edge runtimes.
 *
 * The admin area is a single shared password (there is one operator, and it
 * guards a different thing from the customer accounts in `lib/auth.ts` — form
 * submissions, not a person's own data). What matters is that the session
 * cookie cannot be forged: it carries an expiry plus an HMAC-SHA256 signature
 * over that expiry, verified with a constant-time compare.
 *
 * The signing, comparison and cookie policy now live in `lib/signed-cookie.ts`
 * because user sessions need the same three things. This module is what is
 * specific to the operator: one password, an 8-hour session, and a
 * configuration that refuses to run weakly.
 */

import { captureException } from "@/lib/observability";
import {
  hmacHex,
  MIN_SECRET_LENGTH,
  safeEqual,
  signPayload,
  verifyPayload,
} from "@/lib/signed-cookie";

export { safeEqual, MIN_SECRET_LENGTH };
/** The admin cookie's policy is the shared one; see `lib/signed-cookie.ts`. */
export { cookieOptions as sessionCookieOptions } from "@/lib/signed-cookie";

export const ADMIN_COOKIE = "marsa_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

/**
 * Minimum password length.
 *
 * The floor was 8 (audit S1). One shared password with no lockout and no
 * second factor guards the name, email, country and company of every person
 * who ever filled in a form, so an 8-character search space was the weakest
 * link in the system by a wide margin.
 */
export const MIN_PASSWORD_LENGTH = 16;

export type AdminConfig = { password: string; secret: string };

/**
 * Whether the weak-credential event has already been reported this process.
 *
 * `getAdminConfig()` runs in middleware on every `/admin` request, so an
 * unguarded capture repeats a condition that cannot change without a restart
 * once per request — a flood in whatever the reporter forwards to.
 */
let weakCredentialsReported = false;

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig | null {
  const password = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!password || !secret) return null;
  if (password.length < MIN_PASSWORD_LENGTH || secret.length < MIN_SECRET_LENGTH) {
    // Reported rather than logged, because this is the failure that looks like
    // nothing: the admin area simply stays shut, the login page still renders,
    // and the only trace is one line in a stream nobody is reading. Reported
    // once, and only when reading the process environment, so a caller passing
    // an explicit one — every test does — is never silenced by an earlier call.
    if (env === process.env && !weakCredentialsReported) {
      weakCredentialsReported = true;
      captureException(
        new Error(
          `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters and ` +
            `ADMIN_SESSION_SECRET at least ${MIN_SECRET_LENGTH}; admin is disabled.`,
        ),
        { event: "admin.config.rejected" },
      );
    }
    return null;
  }
  return { password, secret };
}

/** Build a signed session token valid for the next 8 hours. */
export async function createSessionToken(
  secret: string,
  now = Date.now(),
): Promise<{ token: string; maxAge: number }> {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  return { token: await signPayload(String(expiresAt), secret), maxAge: SESSION_TTL_SECONDS };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  const payload = await verifyPayload(token, secret);
  if (payload === null) return false;

  const expiry = Number(payload);
  return Number.isFinite(expiry) && expiry * 1000 > now;
}

/** Verify the password from a login attempt. */
export async function checkPassword(
  candidate: unknown,
  config: AdminConfig,
): Promise<boolean> {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  // Hash both sides first so the compare is over fixed-length digests.
  const [a, b] = await Promise.all([
    hmacHex(candidate, config.secret),
    hmacHex(config.password, config.secret),
  ]);
  return safeEqual(a, b);
}
