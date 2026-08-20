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

/**
 * The generation a session belongs to (audit P7).
 *
 * Until this existed there was exactly one way to end an admin session early —
 * rotate `ADMIN_SESSION_SECRET` and redeploy. That is a heavy, slow answer to a
 * routine question ("the laptop with that session on it was stolen"), and
 * because it is heavy it is the kind of thing an operator puts off. It also
 * conflates two different actions: rotating the secret means the signing key
 * may have leaked, while revoking a session usually means nothing about the key
 * at all.
 *
 * So the version is *in the signed payload* and compared on every verification.
 * Incrementing `ADMIN_SESSION_VERSION` invalidates every existing session at
 * the next request and needs no new secret — one environment variable, one
 * restart, and the operator signs in again.
 *
 * It is inside the signature rather than beside it: an unsigned version in the
 * cookie is one an attacker edits to whatever the server currently expects.
 *
 * Default `"1"` so an unset variable is a valid, stable configuration rather
 * than a reason to refuse. Compared as a string, not a number, because the
 * value is only ever tested for equality — a date, a word, or a random
 * identifier all work, and parsing would reject them for no benefit.
 */
export const DEFAULT_SESSION_VERSION = "1";

export function sessionVersion(
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env.ADMIN_SESSION_VERSION?.trim();
  return value ? value : DEFAULT_SESSION_VERSION;
}

/**
 * Build a signed session token valid for the next 8 hours.
 *
 * The payload is `<expiry>.<version>`. `verifyPayload` splits on the *last*
 * separator to find the signature, which is what makes a multi-part payload
 * safe here — that behaviour was already documented in `lib/signed-cookie.ts`
 * as a stated property rather than an accident, and this is the first caller
 * to rely on it.
 *
 * Tokens minted before this change carry a bare expiry and no version. They do
 * not verify any more, so every admin session in existence ends once at deploy
 * time. That is one sign-in for one operator, and the alternative — treating a
 * versionless token as belonging to version 1 — would mean the very tokens
 * predating the feature are the ones it cannot revoke.
 */
export async function createSessionToken(
  secret: string,
  now = Date.now(),
  version = sessionVersion(),
): Promise<{ token: string; maxAge: number }> {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  return {
    token: await signPayload(`${expiresAt}.${version}`, secret),
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
  version = sessionVersion(),
): Promise<boolean> {
  const payload = await verifyPayload(token, secret);
  if (payload === null) return false;

  // Split on the first separator: the expiry never contains one, so everything
  // after it is the version — including a version that itself has dots, like a
  // date. A token with no separator at all is pre-versioning and is refused.
  const separator = payload.indexOf(".");
  if (separator <= 0) return false;

  const expiry = Number(payload.slice(0, separator));
  if (!Number.isFinite(expiry) || expiry * 1000 <= now) return false;

  // `safeEqual` rather than `===`. The version is not a secret, so this is not
  // strictly required — but it costs nothing, and a comparison against a value
  // from a cookie is exactly the shape that should never be the one place in
  // this file that leaks timing.
  return safeEqual(payload.slice(separator + 1), version);
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
