import { NextResponse } from "next/server";

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

/**
 * The 303 that sends a form POST back to a page on this site.
 *
 * **Relative, deliberately, and this is a fix rather than a preference.** All
 * three form endpoints — admin sign-out, admin erasure, customer sign-out —
 * used to answer `NextResponse.redirect(new URL(path, new URL(request.url).origin))`.
 * `request.url` is reconstructed by the server, not read off the document, so
 * its origin is whatever host the *server* believes it is on. The browser's
 * origin is whatever the reader typed. The two agree right up until they do
 * not: a reverse proxy, an `X-Forwarded-Host` that never arrives, a host alias,
 * an apex reached as `www`, or — the case this was caught on — a server bound
 * to `localhost` answering a request made to `127.0.0.1`.
 *
 * When they disagree the redirect is cross-origin, and every page on this site
 * is served with `form-action 'self'`. Chrome enforces that directive **on the
 * redirect as well as on the submission**, so the browser blocks the
 * navigation — silently, from the reader's point of view. What the operator
 * sees is a Delete button that erases nothing and a Sign out button that does
 * not sign them out. What actually happened is that both worked: the record
 * was gone and the session was destroyed before the response was even written.
 * A destructive control that reports failure while succeeding is the worst
 * shape this bug could take, and nothing in the type system, the unit suite or
 * a page-load smoke check could see it — only a real browser pressing the
 * button.
 *
 * A relative `Location` cannot have this failure. RFC 7231 §7.1.2 has the
 * browser resolve it against the request URL, which *is* the document's
 * origin, so the result is same-origin by construction on every host, proxy
 * and alias. `NextResponse.redirect()` cannot express it — it requires an
 * absolute URL — so the response is constructed directly.
 *
 * `path` must already be a site-relative path that the caller has validated;
 * this does not sanitise. `safeAdminReturn` in the erasure route is what does
 * that, by rebuilding the path from a closed set of parameters.
 */
export function seeOther(path: string, init: { headers?: HeadersInit } = {}): NextResponse {
  const headers = new Headers(init.headers);
  headers.set("location", path);
  return new NextResponse(null, { status: 303, headers });
}
