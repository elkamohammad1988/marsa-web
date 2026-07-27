/**
 * Signed-cookie primitives, shared by both session systems.
 *
 * `lib/admin-session.ts` grew these first, for the single-operator admin
 * password (audit S5/S1): an HMAC-SHA256 signature over a payload, a
 * constant-time compare, and a cookie policy. User authentication needs
 * exactly the same three things over a different payload, and a second copy of
 * a constant-time compare is the kind of duplication that gets one of the two
 * copies wrong later. So the primitive moved here and both callers use it.
 *
 * Two properties this module exists to hold:
 *
 * **No request context.** Nothing here imports `next/headers`, `node:crypto`
 * or anything else the Edge runtime lacks. `middleware.ts` authenticates every
 * protected request and runs on Edge, so a session that could only be verified
 * in Node would push the check back into the routes it is supposed to sit in
 * front of. `crypto.subtle` exists on both runtimes.
 *
 * **No secret ever leaves.** The signature is over the payload only, and the
 * payload is whatever the caller chose to disclose. Neither `verifyPayload`
 * nor `safeEqual` returns anything an attacker can use to narrow a guess: they
 * answer yes or no, in time that does not depend on how nearly right the guess
 * was.
 */

const encoder = new TextEncoder();

/**
 * Minimum length for any secret used to sign a cookie.
 *
 * HMAC-SHA256 keys shorter than this are guessable at a rate that makes the
 * signature decorative. Both session systems enforce it at configuration time
 * and refuse to run rather than run weakly.
 */
export const MIN_SECRET_LENGTH = 16;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-SHA256 of `value` under `secret`, hex-encoded. */
export async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

/**
 * Length-independent constant-time comparison.
 *
 * The naive `a === b` returns as soon as two bytes differ, so the time it
 * takes leaks how long a shared prefix the attacker has found — which turns
 * forging a signature from a search over the whole space into a search one
 * byte at a time. This reads every byte of the longer input either way.
 */
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

/** `payload` with its signature appended, as `<payload>.<hex signature>`. */
export async function signPayload(payload: string, secret: string): Promise<string> {
  return `${payload}.${await hmacHex(payload, secret)}`;
}

/**
 * The payload of a token this secret signed, or null.
 *
 * Splits on the LAST separator rather than the first, so a payload may itself
 * contain dots. The admin token's payload is a bare expiry and never does; the
 * user session's is base64url, which cannot. Splitting on the first would make
 * that a latent constraint rather than a stated one.
 */
export async function verifyPayload(
  token: string | undefined,
  secret: string,
): Promise<string | null> {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  if (!signature) return null;

  const expected = await hmacHex(payload, secret);
  return safeEqual(signature, expected) ? payload : null;
}

/**
 * Cookie policy for a session.
 *
 * `httpOnly` so no script can read it, which is what keeps an XSS bug from
 * becoming a stolen session. `sameSite: "lax"` so the cookie is not sent on a
 * cross-site POST — the CSRF property — while an ordinary link into the site
 * still arrives signed in. `secure` everywhere but development, where there is
 * no TLS to require.
 *
 * `maxAge: 0` is how both systems clear a session: same attributes, empty
 * value, immediate expiry. Clearing a cookie only works when the attributes
 * match the ones it was set with, which is why that path goes through here
 * rather than being written out by hand at each call site.
 */
export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
