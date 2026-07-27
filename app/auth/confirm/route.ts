import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth-config";
import { isOtpType, verifyOtp } from "@/lib/gotrue";
import { attachSession, sessionFromGoTrue } from "@/lib/auth-session";
import { ACCOUNT_HOME, safeRedirect, SIGN_IN_PATH } from "@/lib/auth-routes";
import { fetchRole } from "@/lib/profiles";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where every link in a Supabase email lands.
 *
 * Sign-up confirmation and password recovery both arrive here, distinguished
 * by `type`, and both leave with a session cookie set — one to the account
 * home, the other to the page that sets a new password.
 *
 * ── Why the token is exchanged here and not in the browser ─────────────────
 * GoTrue's default `{{ .ConfirmationURL }}` sends the reader to its own
 * `/verify` endpoint, which bounces them to the site with the tokens in the
 * URL *fragment*. A fragment is never sent to a server, so a server-rendered
 * application cannot see it: completing the flow would need client JavaScript
 * to read `location.hash` and post the tokens back, which puts a credential
 * into the page, into the browser history, and into any `Referer` the page
 * later sends.
 *
 * Overriding the email templates to emit `{{ .TokenHash }}` moves the whole
 * exchange to the server. The token arrives in a query string over TLS, is
 * spent here, and what goes back to the browser is an `httpOnly` cookie it
 * cannot read. The templates are a dashboard setting, which is why this is the
 * one part of the setup that needs a human — see AUTHENTICATION.md.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  // Sanitised even though the link came from our own email template: a token
  // is not the only thing in that URL, and `next` is under the control of
  // whoever forwards the link.
  const next = safeRedirect(url.searchParams.get("next"), ACCOUNT_HOME);
  const failed = new URL(`${SIGN_IN_PATH}?error=invalid-link`, url.origin);

  const config = getAuthConfig();
  // Nothing to verify against. The sign-in page explains the missing
  // configuration in full, so it is the right place to land.
  if (!config) return NextResponse.redirect(new URL(SIGN_IN_PATH, url.origin), { status: 303 });

  if (!tokenHash || !isOtpType(type)) return NextResponse.redirect(failed, { status: 303 });

  try {
    const gotrue = await verifyOtp(config, { tokenHash, type });
    const role = await fetchRole(config, gotrue.access_token, gotrue.user.id);

    const response = NextResponse.redirect(new URL(next, url.origin), { status: 303 });
    await attachSession(response, sessionFromGoTrue(gotrue, role), config.secret);
    return response;
  } catch (err) {
    // Expected in normal use — a link clicked twice, or clicked a week later —
    // so this is a warning rather than an error, and the reader gets a route
    // to a fresh link rather than a stack trace.
    captureException(err, {
      event: "auth.confirm.failed",
      severity: "warning",
      otpType: type,
    });
    return NextResponse.redirect(failed, { status: 303 });
  }
}
