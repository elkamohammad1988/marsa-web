/**
 * The visitor's cookie-consent decision.
 *
 * Shared deliberately by the banner that records the decision and every
 * surface that has to honour it. Audit finding S7: the banner wrote the
 * decision to localStorage and broadcast a `marsa:cookie-consent` event that
 * nothing anywhere listened for, so "Reject non-essential" changed nothing and
 * the demo funnel kept tracking visitors who had explicitly refused.
 *
 * Keeping the key and the reading of it in one module is what stops the two
 * sides drifting apart again — a duplicated string literal is exactly how the
 * original mismatch would come back.
 */

export const CONSENT_STORAGE_KEY = "marsa-cookie-consent";

export type ConsentDecision = "accepted" | "rejected";

/**
 * The stored decision, or null when the visitor has not chosen yet or storage
 * is unavailable (Safari private mode, a hardened browser, SSR).
 *
 * Anything that is not one of the two known values is treated as "not
 * decided" rather than trusted, so a stale or hand-edited entry cannot be read
 * as consent.
 */
export function readConsent(): ConsentDecision | null {
  try {
    const stored = globalThis.localStorage?.getItem(CONSENT_STORAGE_KEY);
    return stored === "accepted" || stored === "rejected" ? stored : null;
  } catch {
    return null;
  }
}

/**
 * Whether the visitor actively refused non-essential processing.
 *
 * Deliberately not the inverse of "accepted": an undecided visitor is not a
 * refusing visitor, and the two must not collapse into one boolean. Only an
 * explicit "rejected" suppresses telemetry.
 */
export function hasRejectedNonEssential(): boolean {
  return readConsent() === "rejected";
}
