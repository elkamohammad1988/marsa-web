import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth-config";
import { getSession } from "@/lib/auth";
import { detachSession } from "@/lib/auth-session";
import { signOut } from "@/lib/gotrue";
import { isCrossSite } from "@/lib/same-origin";
import { captureException } from "@/lib/observability";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

/**
 * Sign out.
 *
 * A plain form POST answered with a 303, not a JSON endpoint: signing out is
 * then a button that works with JavaScript disabled or still loading, which
 * matters more for this control than for any other in the account area.
 *
 * Two things happen, in an order chosen so the outcome cannot be worse than
 * the failure. The cookie is cleared unconditionally — a sign-out that failed
 * because the network was down must still sign the person out of this browser.
 * Revoking the refresh token at Supabase is attempted first and its failure is
 * reported rather than surfaced, because it changes what happens to a token
 * someone else may already have captured, and that is worth knowing about even
 * though this person is already gone.
 */
export async function POST(request: Request) {
  if (isCrossSite(request)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const config = getAuthConfig();
  const session = await getSession();

  if (config && session) {
    try {
      await signOut(config, session.accessToken);
    } catch (err) {
      captureException(err, {
        event: "auth.signout.revoke_failed",
        severity: "warning",
        fallback: "cookie cleared; the refresh token stays valid until it expires",
      });
    }
  }

  const origin = new URL(request.url).origin || absoluteUrl("/");
  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  detachSession(response);
  return response;
}
