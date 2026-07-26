/**
 * Admin session primitives, with no dependency on request context.
 *
 * Split out from `lib/admin-auth.ts` so `middleware.ts` can verify a session
 * without importing `next/headers`, which is unavailable in middleware
 * (audit S5). Everything here is a pure function over its arguments and runs
 * unchanged on the Node and Edge runtimes — `crypto.subtle` exists on both.
 *
 * The admin area is a single shared password (there is one operator, and a
 * user table would be security theatre without one). What matters is that the
 * session cookie cannot be forged: it carries an expiry plus an HMAC-SHA256
 * signature over that expiry, verified with a constant-time compare.
 */

import { captureException } from "@/lib/observability";

export const ADMIN_COOKIE = "marsa_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

/**
 * Minimum credential lengths.
 *
 * The password floor was 8 (audit S1). One shared password with no lockout and
 * no second factor guards the name, email, country and company of every person
 * who ever filled in a form, so an 8-character search space was the weakest
 * link in the system by a wide margin.
 */
export const MIN_PASSWORD_LENGTH = 16;
export const MIN_SECRET_LENGTH = 16;

export type AdminConfig = { password: string; secret: string };

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig | null {
  const password = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!password || !secret) return null;
  if (password.length < MIN_PASSWORD_LENGTH || secret.length < MIN_SECRET_LENGTH) {
    // Reported rather than logged, because this is the failure that looks like
    // nothing: the admin area simply stays shut, the login page still renders,
    // and the only trace is one line in a stream nobody is reading.
    captureException(
      new Error(
        `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters and ` +
          `ADMIN_SESSION_SECRET at least ${MIN_SECRET_LENGTH}; admin is disabled.`,
      ),
      { event: "admin.config.rejected" },
    );
    return null;
  }
  return { password, secret };
}

const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

/** Length-independent constant-time comparison. */
export function safeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = aBytes.length ^ bBytes.length;
  const len = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

/** Build a signed session token valid for the next 8 hours. */
export async function createSessionToken(
  secret: string,
  now = Date.now(),
): Promise<{ token: string; maxAge: number }> {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const signature = await sign(String(expiresAt), secret);
  return { token: `${expiresAt}.${signature}`, maxAge: SESSION_TTL_SECONDS };
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;

  const expected = await sign(expiresAt, secret);
  if (!safeEqual(signature, expected)) return false;

  const expiry = Number(expiresAt);
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
    sign(candidate, config.secret),
    sign(config.password, config.secret),
  ]);
  return safeEqual(a, b);
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
