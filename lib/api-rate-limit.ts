import { NextResponse } from "next/server";

/**
 * Shared pieces for rate-limiting public GET endpoints.
 *
 * `lib/api-forms.ts` already owns the limits for the three form POST routes.
 * This module covers the read-only endpoints that had no limiter at all
 * (audit S6, S4), so the limits and the 429 shape stay in one place instead of
 * being retyped per route.
 */

/**
 * Generous by design. The point is to cap enumeration of the upstream FX
 * provider's cache-key space, not to ration ordinary use: the converter fires
 * at most a handful of requests per interaction, so a real visitor never sees
 * this.
 */
export const RATES_RATE_LIMIT = { limit: 60, windowMs: 60_000 } as const;

/**
 * Admin login, in escalating tiers (audit S1).
 *
 * The audit asked for a persisted failure counter with exponential backoff.
 * `check_rate_limit` is a fixed-window counter, so backoff is expressed as
 * overlapping windows rather than a growing timer: a burst trips the 15-minute
 * tier, a persistent attacker also trips the hourly one, and a slow grinder
 * trips the daily one. Every tier is checked on every attempt, so the effective
 * ceiling tightens the longer an attack runs — the same shape as backoff, built
 * from the atomic primitive that already exists.
 *
 * A legitimate operator who mistypes twice is unaffected. One who mistypes six
 * times waits, which is the intended behaviour of a credential guard.
 */
export const ADMIN_LOGIN_TIERS = [
  { scope: "admin-login", limit: 5, windowMs: 15 * 60_000 },
  { scope: "admin-login-hour", limit: 10, windowMs: 60 * 60_000 },
  { scope: "admin-login-day", limit: 20, windowMs: 24 * 60 * 60_000 },
] as const;

/**
 * A ceiling across all callers, so an attempt spread thinly over many IPs still
 * trips something. Sized well above any plausible legitimate volume: there is
 * one operator, and 50 login attempts in 15 minutes from the whole internet is
 * already an attack.
 */
export const ADMIN_LOGIN_GLOBAL = {
  key: "admin-login:global",
  limit: 50,
  windowMs: 15 * 60_000,
} as const;

/**
 * Deliberately tight. This one guards a shared secret against brute force, and
 * a legitimate viewer loads the page once and then reads it.
 */
export const STATS_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;

/** Seconds until the window resets, floored at 1 so the header is never "0". */
export function retryAfterSeconds(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

/**
 * A 429 that is never cached. Without `no-store` a CDN could hold the
 * rejection and serve it to unrelated callers for the remainder of the
 * `s-maxage` window — turning a rate limit into an outage.
 */
export function tooManyRequests(resetAt: number, message: string): NextResponse {
  const retryAfter = retryAfterSeconds(resetAt);
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "retry-after": String(retryAfter),
        "cache-control": "no-store",
      },
    },
  );
}
