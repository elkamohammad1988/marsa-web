import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionCookieOptions } from "@/lib/admin-auth";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

/**
 * True when the request demonstrably came from another site.
 *
 * `SameSite=Lax` already prevents the session cookie being *sent* cross-site,
 * but a response's `Set-Cookie` clearing that session is still honoured — so a
 * malicious page could force an admin logout (audit S9). Nuisance-level: no
 * data is exposed and no state changes beyond ending a session.
 *
 * `Sec-Fetch-Site` is the reliable signal where it exists (every current
 * browser sends it). `Origin` is the fallback. Both absent means a non-browser
 * client — curl, a probe — which is allowed through: rejecting on *absence*
 * would break those callers without stopping an attacker, who controls neither
 * header from a page.
 */
function isCrossSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "cross-site";

  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin !== new URL(request.url).origin;
  } catch {
    return true;
  }
}

/** Clears the admin session and returns to the login screen. */
export async function POST(request: Request) {
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const origin = new URL(request.url).origin || absoluteUrl("/");
  const response = NextResponse.redirect(new URL("/admin/login", origin), { status: 303 });
  response.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  return response;
}
