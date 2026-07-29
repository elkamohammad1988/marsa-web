import type { NextResponse } from "next/server";
import { cookieOptions, signPayload, verifyPayload } from "@/lib/signed-cookie";
import { toRole, type Role } from "@/lib/auth-roles";
import type { GoTrueSession } from "@/lib/gotrue";

/**
 * The user session, as it travels in a cookie.
 *
 * Supabase issues a JWT access token and a refresh token. This module wraps
 * both in an envelope of our own, signed with `AUTH_SESSION_SECRET`, and that
 * envelope is what the cookie carries.
 *
 * ── Why an envelope rather than the raw Supabase JWT ────────────────────────
 * `middleware.ts` has to answer "is this request signed in, and as what role"
 * before every protected page, on the Edge runtime, without a network call.
 * Verifying Supabase's own JWT there would mean either shipping its signing
 * secret into the environment (a secret whose disclosure forges *any* user) or
 * fetching and caching a JWKS and implementing ES256 verification. An HMAC
 * over our own payload is one `crypto.subtle` call, uses a secret that signs
 * nothing but this cookie, and reuses the primitive the admin session has been
 * running on since audit S5.
 *
 * The property it gives up is worth naming: a session that Supabase has
 * revoked still verifies here until the envelope's own access-token expiry
 * passes — at most one access-token lifetime, an hour by default. That is the
 * same window a verified Supabase JWT would have given, because a JWT cannot
 * be revoked mid-life either. What closes it is that every read of real data
 * goes to Postgres with the access token attached, so a revoked session gets
 * an authenticated-looking page and no data, and the refresh that follows
 * fails and clears the cookie.
 *
 * Edge-safe by construction: no `next/headers`, no `node:*`, no `Buffer`.
 */

export const SESSION_COOKIE = "marsa_session";

/**
 * Absolute session lifetime, refreshes included.
 *
 * The access token expires hourly and is renewed silently, which is what makes
 * "stay signed in" work. Without a second, absolute bound a session that is
 * used regularly never ends at all, and a refresh token captured once is good
 * forever. Thirty days is the ceiling; reaching it means signing in again.
 */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * How close to expiry the access token may get before it is renewed.
 *
 * Sixty seconds, so a request that passes middleware with a token barely
 * inside its window does not then have it expire while the page is still
 * fetching data.
 */
export const REFRESH_THRESHOLD_SECONDS = 60;

/**
 * Ceiling for the whole `Set-Cookie` value.
 *
 * Browsers drop an oversized cookie *silently*. The visible result is a login
 * that appears to work and lands the person back on the login page, with
 * nothing in any log to explain it — so this is checked at the moment of
 * encoding, where the cause is still in scope.
 */
export const MAX_COOKIE_BYTES = 4096;

/**
 * What the attributes add on top of `name=value`.
 *
 * `; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000` is the longest
 * form `cookieOptions` produces, rounded up. Browsers disagree about whether
 * the 4096-byte limit covers the attributes or only the pair, so the check
 * assumes the stricter reading — being wrong in that direction costs nothing,
 * and being wrong in the other direction is a cookie silently dropped.
 */
const COOKIE_ATTRIBUTE_BYTES = 64;

export type UserSession = {
  /** `auth.users.id`, and the primary key of the profile row. */
  userId: string;
  email: string;
  /**
   * The role as it stood when this envelope was minted, refreshed hourly with
   * the access token. Middleware uses it to route; it is never the last word.
   * Row Level Security decides what the database actually returns, so a stale
   * "admin" here opens a page and still reads only its owner's row.
   */
  role: Role;
  accessToken: string;
  refreshToken: string;
  /** Unix seconds at which `accessToken` stops being accepted by Supabase. */
  accessExpiresAt: number;
  /** Unix seconds at which the session ends regardless of refreshes. */
  expiresAt: number;
};

/** Thrown when a session will not fit in a cookie. Never shown to a visitor. */
export class SessionTooLargeError extends Error {
  constructor(readonly bytes: number) {
    super(
      `Session cookie would be ${bytes} bytes, over the ${MAX_COOKIE_BYTES}-byte ceiling ` +
        "browsers enforce by dropping it silently.",
    );
    this.name = "SessionTooLargeError";
  }
}

/* ------------------------------------------------------------ base64url -- */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(text: string): string {
  const bytes = encoder.encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    // `atob` rejects an unpadded length of 4n+1 and some runtimes reject any
    // unpadded input, so the padding stripped above is put back.
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    return decoder.decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------- encoding -- */

/**
 * Serialise and sign a session.
 *
 * The payload is readable to anyone holding the cookie — signing proves it was
 * not *edited*, it does not hide it. That is the right trade because the
 * cookie is `httpOnly` and the access token inside it is already a bearer
 * credential: anything that can read the cookie has the session regardless of
 * whether the envelope was also encrypted.
 */
export async function encodeSession(session: UserSession, secret: string): Promise<string> {
  const cookie = await signPayload(toBase64Url(JSON.stringify(session)), secret);
  // `.length` is bytes here: the payload is base64url and the signature is
  // hex, so every character is one ASCII byte. `+ 1` for the `=` separator.
  const bytes =
    SESSION_COOKIE.length + 1 + cookie.length + COOKIE_ATTRIBUTE_BYTES;
  if (bytes > MAX_COOKIE_BYTES) throw new SessionTooLargeError(bytes);
  return cookie;
}

function isSession(value: unknown): value is UserSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.userId === "string" &&
    typeof s.email === "string" &&
    typeof s.accessToken === "string" &&
    typeof s.refreshToken === "string" &&
    typeof s.accessExpiresAt === "number" &&
    typeof s.expiresAt === "number"
  );
}

/**
 * The session a cookie carries, or null.
 *
 * Null for every failure — missing, unsigned, signed with another secret,
 * truncated, not JSON, the wrong shape, or past its absolute expiry. Callers
 * get one answer to act on and no way to accidentally treat a malformed
 * session as a partial one.
 */
export async function decodeSession(
  cookie: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<UserSession | null> {
  const payload = await verifyPayload(cookie, secret);
  if (payload === null) return null;

  const json = fromBase64Url(payload);
  if (json === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isSession(parsed)) return null;
  if (parsed.expiresAt * 1000 <= now) return null;

  // Narrowed rather than trusted: a role this build does not know — a value
  // left behind by a downgrade, say — becomes the least-privileged one.
  return { ...parsed, role: toRole(parsed.role) };
}

/* ------------------------------------------------------------ lifecycle -- */

/**
 * Build a session from a fresh GoTrue exchange.
 *
 * `expiresAt` is passed in when refreshing so the absolute lifetime survives:
 * a renewal must not extend the ceiling, or the ceiling means nothing.
 */
export function sessionFromGoTrue(
  gotrue: GoTrueSession,
  role: Role,
  options: { now?: number; expiresAt?: number } = {},
): UserSession {
  const now = options.now ?? Date.now();
  const seconds = Math.floor(now / 1000);
  return {
    userId: gotrue.user.id,
    email: gotrue.user.email ?? "",
    role,
    accessToken: gotrue.access_token,
    refreshToken: gotrue.refresh_token,
    accessExpiresAt: seconds + gotrue.expires_in,
    expiresAt: options.expiresAt ?? seconds + SESSION_TTL_SECONDS,
  };
}

/** True when the access token is expired or close enough to it to renew. */
export function needsRefresh(session: UserSession, now = Date.now()): boolean {
  return session.accessExpiresAt - REFRESH_THRESHOLD_SECONDS <= Math.floor(now / 1000);
}

/** Seconds of life left in the session, for the cookie's `Max-Age`. */
export function remainingSeconds(session: UserSession, now = Date.now()): number {
  return Math.max(0, session.expiresAt - Math.floor(now / 1000));
}

/* --------------------------------------------------------------- cookie -- */

/**
 * Write a session onto a response.
 *
 * The cookie's `Max-Age` is what is left of the *absolute* lifetime, not the
 * access token's hour, so renewing does not silently extend the ceiling and a
 * browser drops the cookie at the same moment the envelope inside it stops
 * verifying.
 *
 * Route handlers and middleware both call this, which is why it takes a
 * response rather than reaching for `next/headers` — middleware cannot use
 * that, and a session that could only be issued in one of the two places would
 * mean two implementations.
 */
export async function attachSession(
  response: NextResponse,
  session: UserSession,
  secret: string,
  now = Date.now(),
): Promise<void> {
  const value = await encodeSession(session, secret);
  response.cookies.set(SESSION_COOKIE, value, cookieOptions(remainingSeconds(session, now)));
  denyCaching(response);
}

/**
 * Clear the session cookie.
 *
 * Same attributes, empty value, immediate expiry — a cookie is only removed by
 * a `Set-Cookie` whose path and domain match the one that created it, which is
 * why this goes through the shared options rather than being written by hand.
 */
export function detachSession(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", cookieOptions(0));
  denyCaching(response);
}

/**
 * Mark a response as never storable.
 *
 * Applied by both functions above, so that **every** response carrying a
 * session cookie is uncacheable by construction rather than by each caller
 * remembering. A shared cache that stored one of these would hand one
 * person's session to the next requester of the same URL — and while
 * well-behaved caches do not store a `Set-Cookie` response, "does not by
 * default" is a weaker guarantee than a header, and the header costs nothing.
 */
function denyCaching(response: NextResponse): void {
  response.headers.set("cache-control", "no-store");
}

/*
 * There is deliberately no `isEmailConfirmed` helper here.
 *
 * One was written and removed: nothing called it. Confirmation is enforced by
 * Supabase, which refuses to issue a session for an unconfirmed address when
 * the project requires one — so a session existing at all is the answer, and a
 * second check in application code would be a boundary that looks load-bearing
 * and is not. `GoTrueUser.email_confirmed_at` is still typed, for the day
 * something genuinely needs to read it.
 */
