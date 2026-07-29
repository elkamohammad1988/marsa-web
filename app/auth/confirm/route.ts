import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth-config";
import { isOtpType, verifyOtp } from "@/lib/gotrue";
import { attachSession, sessionFromGoTrue } from "@/lib/auth-session";
import { ACCOUNT_HOME, safeRedirect, SIGN_IN_PATH, type AuthNotice } from "@/lib/auth-routes";
import { AUTH_CONFIRM_TIERS, checkTiers } from "@/lib/api-rate-limit";
import { clientKey } from "@/lib/rate-limit";
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

  /**
   * Back to sign in, saying which of the three things went wrong.
   *
   * `no-store` because this is a GET, and a cached "that link is invalid"
   * served to the next person holding a good one would be a bug nobody could
   * reproduce. The success path gets the same header from `attachSession`.
   */
  const bounce = (notice: AuthNotice) =>
    NextResponse.redirect(new URL(`${SIGN_IN_PATH}?error=${notice}`, url.origin), {
      status: 303,
      headers: { "cache-control": "no-store" },
    });

  const config = getAuthConfig();
  // Nothing to verify against. The sign-in page explains the missing
  // configuration in full, so it is the right place to land.
  if (!config) return NextResponse.redirect(new URL(SIGN_IN_PATH, url.origin), { status: 303 });

  // Unauthenticated, and every hit costs one upstream call to Supabase — so
  // without a limit this is a free amplifier for anybody who finds it. The
  // allowance is generous because a real link is sometimes fetched more than
  // once: a mail client prefetching it, a second tap, a shared NAT.
  const limit = await checkTiers(clientKey(request.headers, ""), AUTH_CONFIRM_TIERS);
  if (!limit.ok) return bounce("too-many-attempts");

  if (!tokenHash || !isOtpType(type)) return bounce("invalid-link");

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
    return bounce("invalid-link");
  }
}
