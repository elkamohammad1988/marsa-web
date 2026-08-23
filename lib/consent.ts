/**
 * The visitor's cookie-consent decision.
 *
 * Audit finding S7: a banner wrote the decision to localStorage and broadcast a
 * `marsa:cookie-consent` event that nothing anywhere listened for, so "Reject
 * non-essential" changed nothing and the demo funnel kept tracking visitors who
 * had explicitly refused. This module was written to be the one place both
 * sides of that agreed on.
 *
 * **The banner has since been removed, and nothing in this repository writes
 * the key.** That is not an oversight and this module is not dead: the site
 * carries nothing non-essential to consent to — `/legal/cookies` says so, and
 * the only cookies are the ones that make signing in work — so a banner would
 * have been a consent theatre for a decision there is nothing to decide. What
 * stays is the *reading*, in `components/demo/DemoFlow.tsx`, because a stored
 * refusal must be honoured wherever it came from: a decision recorded by an
 * earlier build, or by a banner a later one adds, suppresses the funnel event
 * without anybody having to remember to re-wire it.
 *
 * Anything other than the two known values is read as "not decided" rather
 * than trusted, so a stale or hand-edited entry can never be read as consent.
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
