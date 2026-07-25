import { cookies } from "next/headers";

/**
 * Admin session handling.
 *
 * The admin area is a single shared password (there is one operator today, and
 * a user table would be security theatre without one). What matters is that the
 * session cookie cannot be forged: it carries an expiry plus an HMAC-SHA256
 * signature over that expiry, verified with a constant-time compare.
 *
 * Both ADMIN_PASSWORD and ADMIN_SESSION_SECRET must be set, otherwise the admin
 * area is disabled outright — a default password is worse than no admin.
 */

export const ADMIN_COOKIE = "marsa_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type AdminConfig = { password: string; secret: string };

export function getAdminConfig(
  env: Record<string, string | undefined> = process.env,
): AdminConfig | null {
  const password = env.ADMIN_PASSWORD;
  const secret = env.ADMIN_SESSION_SECRET;
  if (!password || !secret) return null;
  if (password.length < 8 || secret.length < 16) {
    console.error(
      "[admin] ADMIN_PASSWORD must be at least 8 characters and ADMIN_SESSION_SECRET at least 16; admin is disabled.",
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

/** True when the current request carries a valid admin session. */
export async function isAdminRequest(): Promise<boolean> {
  const config = getAdminConfig();
  if (!config) return false;
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value, config.secret);
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
