import { NextResponse } from "next/server";
import { AUTH_SIGN_UP_TIERS, checkTiers } from "@/lib/api-rate-limit";
import { clientKey } from "@/lib/rate-limit";
import { emailRedirectUrl, goTrueFailure, preflight, rateLimited } from "@/lib/api-auth";
import { isExistingAccountDecoy, signUp } from "@/lib/gotrue";
import { attachSession, sessionFromGoTrue } from "@/lib/auth-session";
import { ACCOUNT_HOME } from "@/lib/auth-routes";
import { fetchRole } from "@/lib/profiles";
import { validateRegistration } from "@/lib/validation";
import { captureException } from "@/lib/observability";

export const runtime = "nodejs";

/**
 * Register an account.
 *
 * Rate-limited per address only. A ceiling shared by every caller would mean
 * one 50-request burst could stop anybody registering for an hour, which is a
 * worse outcome than the one it prevents; see the note at the foot of
 * `lib/api-rate-limit.ts`.
 *
 * The response is the same whether the address was free or already taken.
 * GoTrue arranges half of that itself, returning a decoy user with no
 * identities rather than an error; this route completes it by rendering the
 * same "check your inbox" outcome either way. Telling the caller which case
 * they are in would make this the account-enumeration endpoint for the whole
 * site.
 */
export async function POST(request: Request) {
  const pre = await preflight(request);
  if (!pre.ok) return pre.response;
  const { config, body } = pre;

  const limit = await checkTiers(clientKey(request.headers, ""), AUTH_SIGN_UP_TIERS);
  if (!limit.ok) return rateLimited(limit.resetAt);

  const result = validateRegistration(body);
  if (!result.success) return NextResponse.json({ errors: result.errors }, { status: 422 });

  try {
    const { session, user } = await signUp(config, {
      email: result.data.email,
      password: result.data.password,
      fullName: result.data.fullName,
      redirectTo: emailRedirectUrl(),
    });

    // No session means the project requires email confirmation, which is the
    // configuration this application is written for. The address goes into the
    // next URL so the "resend" control on that page has something to send to;
    // it is the caller's own address, in their own browser.
    if (!session) {
      if (isExistingAccountDecoy(user)) {
        // Worth knowing about, and safe to record: no address, no identifier.
        // A rising count here usually means confirmation email is not arriving
        // and people are trying to sign up again.
        captureException(new Error("Sign-up attempted for an address that already exists."), {
          event: "auth.signup.existing",
          severity: "warning",
        });
      }
      return NextResponse.json({
        ok: true,
        next: `/verify-email?email=${encodeURIComponent(result.data.email)}`,
      });
    }

    // Email confirmation is switched off for this project, so GoTrue returned
    // a usable session. Handled rather than assumed away: that setting lives in
    // the Supabase dashboard and can change without a deploy.
    const role = await fetchRole(config, session.access_token, session.user.id);
    const response = NextResponse.json({ ok: true, next: ACCOUNT_HOME });
    await attachSession(response, sessionFromGoTrue(session, role), config.secret);
    return response;
  } catch (err) {
    return goTrueFailure(err, "auth.signup.failed");
  }
}
