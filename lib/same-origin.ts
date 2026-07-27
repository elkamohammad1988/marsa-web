/**
 * Is this state-changing request coming from our own pages?
 *
 * Written for the admin logout route (audit S9) and now the guard on every
 * authentication endpoint, which is why it moved here.
 *
 * `SameSite=Lax` on the session cookie already stops the cookie being *sent*
 * on a cross-site POST, so a forged request arrives unauthenticated and does
 * nothing. Two cases survive that and are what this is for:
 *
 *   • **Forced state without a session.** A response's `Set-Cookie` is honoured
 *     whatever the request's origin, so a malicious page could log a visitor
 *     out — or, worse, log them *in* as an account the attacker controls, and
 *     then watch what they do next in the belief it is their own.
 *   • **Endpoints that send email.** Registration and password recovery both
 *     cause a message to be delivered to an address chosen by the caller.
 *     Requiring same-origin keeps another site from using them as a relay.
 *
 * `Sec-Fetch-Site` is the reliable signal where it exists — every current
 * browser sends it, and it cannot be set by script. `Origin` is the fallback.
 * Both absent means a non-browser client (curl, a probe, a test), which is
 * allowed through: rejecting on *absence* would break those callers without
 * stopping an attacker, who controls neither header from a page.
 */
export function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "cross-site";

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    // An Origin header that is not a URL is not something a browser produces.
    return true;
  }
}
