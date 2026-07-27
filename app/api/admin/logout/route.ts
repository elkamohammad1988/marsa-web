import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionCookieOptions } from "@/lib/admin-auth";
import { isCrossSite } from "@/lib/same-origin";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Clears the admin session and returns to the login screen.
 *
 * The cross-site check was written here for audit S9 — a malicious page could
 * force an admin logout, because a `Set-Cookie` that clears a session is
 * honoured whatever the request's origin. It now lives in `lib/same-origin.ts`
 * and guards the customer authentication endpoints too, where the same
 * property protects rather more than a nuisance.
 */
export async function POST(request: Request) {
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const origin = new URL(request.url).origin || absoluteUrl("/");
  const response = NextResponse.redirect(new URL("/admin/login", origin), { status: 303 });
  response.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  return response;
}
