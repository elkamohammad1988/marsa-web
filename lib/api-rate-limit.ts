import { NextResponse } from "next/server";
import { rateLimitShared } from "@/lib/rate-limit";
import { hmacHex } from "@/lib/signed-cookie";

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
 *
 * A ceiling shared by every caller is only ever safe on a door with **one
 * user**. Tripping it locks that door for everybody, so on the admin login —
 * where "everybody" is the operator, who can wait 15 minutes — it is a good
 * trade. On any endpoint the public uses it is an outage an attacker can cause
 * on demand, which is why the customer tiers below have no equivalent.
 */
export const ADMIN_LOGIN_GLOBAL = {
  key: "admin-login:global",
  limit: 50,
  windowMs: 15 * 60_000,
} as const;

/* ------------------------------------------------- customer authentication */

export type RateLimitTier = { scope: string; limit: number; windowMs: number };

export type GlobalCeiling = { key: string; limit: number; windowMs: number };

/**
 * Sign-in attempts from one address, in the same escalating shape as the admin
 * tiers above: a burst trips the short window, a grinder trips a longer one.
 *
 * Looser than the admin's 5-per-15-minutes because the population is
 * different. There is one operator, who knows their password; there are many
 * customers, and a person who has forgotten which of two passwords they used
 * should not be locked out for a quarter of an hour on the third try.
 */
export const AUTH_SIGN_IN_TIERS: readonly RateLimitTier[] = [
  { scope: "auth-signin", limit: 10, windowMs: 15 * 60_000 },
  { scope: "auth-signin-hour", limit: 30, windowMs: 60 * 60_000 },
  { scope: "auth-signin-day", limit: 60, windowMs: 24 * 60 * 60_000 },
];

/**
 * Sign-in attempts against one *account*, whatever address they come from.
 *
 * The per-IP tiers above are the wrong instrument for the attack that matters
 * most here: someone working through a password list against one known email,
 * from a rotating pool of addresses, trips none of them. This tier is what
 * that attack hits, and a real person mistyping their own password does not.
 */
export const AUTH_SIGN_IN_ACCOUNT_TIERS: readonly RateLimitTier[] = [
  { scope: "auth-signin-account", limit: 10, windowMs: 15 * 60_000 },
  { scope: "auth-signin-account-hour", limit: 25, windowMs: 60 * 60_000 },
];

/** Registration. Tight: a real person does this once. */
export const AUTH_SIGN_UP_TIERS: readonly RateLimitTier[] = [
  { scope: "auth-signup", limit: 5, windowMs: 60 * 60_000 },
  { scope: "auth-signup-day", limit: 10, windowMs: 24 * 60 * 60_000 },
];

/**
 * Password recovery and confirmation re-sends.
 *
 * These are the two endpoints that cause mail to be delivered to an address
 * the caller chose, so the thing being rationed is not compute but somebody
 * else's inbox — and the sender reputation of the domain doing the sending.
 */
export const AUTH_EMAIL_TIERS: readonly RateLimitTier[] = [
  { scope: "auth-email", limit: 5, windowMs: 60 * 60_000 },
];

/** The same, per target address, so one mailbox cannot be flooded from many IPs. */
export const AUTH_EMAIL_ACCOUNT_TIERS: readonly RateLimitTier[] = [
  { scope: "auth-email-account", limit: 3, windowMs: 60 * 60_000 },
];

/**
 * Confirmation and recovery links.
 *
 * `/auth/confirm` is unauthenticated and makes an upstream call to Supabase on
 * every hit, so without a limit it is a free amplifier: one request in, one
 * request out, from anybody. Generous, because a link can legitimately be
 * clicked a few times — a mail client prefetching it, a person tapping twice,
 * a shared address behind one NAT.
 */
export const AUTH_CONFIRM_TIERS: readonly RateLimitTier[] = [
  { scope: "auth-confirm", limit: 30, windowMs: 15 * 60_000 },
];

/*
 * There is deliberately **no** global ceiling on any of the customer tiers.
 *
 * One was written and removed. `auth-signin:global` at 200 per 15 minutes
 * meant any anonymous caller could stop every customer signing in for a
 * quarter of an hour, indefinitely, at about fourteen requests a minute.
 * `auth-email:global` was worse: a single 50-request burst blocked
 * registration *and* password recovery for an hour, because both endpoints
 * shared the bucket.
 *
 * The attack a global ceiling is supposed to catch — many addresses, spread
 * thin — is already caught where it matters. The per-account tiers cap guesses
 * against a given account at ten per fifteen minutes however many machines are
 * making them, and cap mail to a given inbox at three an hour. Those hold
 * without giving an attacker a switch that turns the product off.
 *
 * The residual risk is a distributed attacker burning the project's outbound
 * email quota across many different addresses. Supabase rate-limits its own
 * sending, which is the right place for that ceiling — it is the resource
 * being protected, and exhausting it degrades email rather than blocking every
 * sign-in.
 */

/**
 * A rate-limit bucket for an email address that does not contain the address.
 *
 * The shared limiter writes its key into `rate_limit_hits.key` in Postgres.
 * Bucketing per account is worth having; storing a column of customer email
 * addresses in a rate-limiting table to get it is not — that table has no
 * retention policy, no access policy of its own, and no reason to hold
 * personal data. An HMAC under the session secret gives a stable bucket per
 * address that cannot be read back into one.
 */
export async function accountBucket(email: string, secret: string): Promise<string> {
  return (await hmacHex(email.trim().toLowerCase(), secret)).slice(0, 32);
}

/**
 * Check every tier at once, plus an optional global ceiling.
 *
 * All of them, on every attempt, rather than stopping at the first — so the
 * response can name the longest wait instead of the first one that tripped,
 * and so the effective ceiling tightens the longer an attack runs.
 *
 * Written once here because the admin login route had it inline and the four
 * authentication routes would each have grown their own copy.
 */
export async function checkTiers(
  suffix: string,
  tiers: readonly RateLimitTier[],
  global: GlobalCeiling | null = null,
): Promise<{ ok: boolean; resetAt: number }> {
  const verdicts = await Promise.all([
    ...tiers.map((tier) =>
      rateLimitShared(`${tier.scope}${suffix}`, { limit: tier.limit, windowMs: tier.windowMs }),
    ),
    ...(global
      ? [rateLimitShared(global.key, { limit: global.limit, windowMs: global.windowMs })]
      : []),
  ]);

  const blocked = verdicts.filter((v) => !v.ok);
  return blocked.length
    ? { ok: false, resetAt: Math.max(...blocked.map((v) => v.resetAt)) }
    : { ok: true, resetAt: 0 };
}

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
