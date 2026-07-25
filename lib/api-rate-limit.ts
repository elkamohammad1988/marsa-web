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
