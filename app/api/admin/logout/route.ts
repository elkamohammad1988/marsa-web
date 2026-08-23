import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sessionCookieOptions } from "@/lib/admin-auth";
import { isCrossSite, seeOther } from "@/lib/same-origin";

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

  // Relative, so the browser resolves it against the document's own origin.
  // See `seeOther`: an absolute redirect built from `request.url` is what made
  // this button appear dead while the session was in fact being destroyed.
  const response = seeOther("/admin/login");
  response.cookies.set(ADMIN_COOKIE, "", sessionCookieOptions(0));
  return response;
}
