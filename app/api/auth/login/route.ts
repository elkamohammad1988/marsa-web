import { NextResponse } from "next/server";
import {
  accountBucket,
  AUTH_SIGN_IN_ACCOUNT_TIERS,
  AUTH_SIGN_IN_TIERS,
  checkTiers,
} from "@/lib/api-rate-limit";
import { clientKey } from "@/lib/rate-limit";
import {
  goTrueFailure,
  INVALID_CREDENTIALS_MESSAGE,
  preflight,
  rateLimited,
} from "@/lib/api-auth";
import { GoTrueError, signInWithPassword } from "@/lib/gotrue";
import { attachSession, sessionFromGoTrue } from "@/lib/auth-session";
import { ACCOUNT_HOME, safeRedirect } from "@/lib/auth-routes";
import { fetchRole } from "@/lib/profiles";
import { validateSignIn } from "@/lib/validation";

export const runtime = "nodejs";

/**
 * Exchange an email and password for a session cookie.
 *
 * Limited twice, because the two attacks have different shapes. The per-address
 * tiers stop one machine working through a list. The per-account tiers stop a
 * distributed attempt on one known email, which trips no per-address limit at
 * all — and the account bucket is an HMAC of the address, so rationing per
 * account does not put a column of customer emails in the rate-limit table.
 *
 * Not limited across all callers together. That would hand any anonymous
 * caller a switch that stops every customer signing in; see the note at the
 * foot of `lib/api-rate-limit.ts`.
 *
 * The order matters: the address limit is checked before the body is
 * validated, so an attacker cannot spend our validation on rejected requests,
 * and the account limit after, because it needs the address to key on.
 */
export async function POST(request: Request) {
  const pre = await preflight(request);
  if (!pre.ok) return pre.response;
  const { config, body } = pre;

  const byAddress = await checkTiers(clientKey(request.headers, ""), AUTH_SIGN_IN_TIERS);
  if (!byAddress.ok) return rateLimited(byAddress.resetAt);

  const result = validateSignIn(body);
  if (!result.success) return NextResponse.json({ errors: result.errors }, { status: 422 });

  const byAccount = await checkTiers(
    `:${await accountBucket(result.data.email, config.secret)}`,
    AUTH_SIGN_IN_ACCOUNT_TIERS,
  );
  if (!byAccount.ok) return rateLimited(byAccount.resetAt);

  try {
    const gotrue = await signInWithPassword(config, result.data);
    const role = await fetchRole(config, gotrue.access_token, gotrue.user.id);

    const response = NextResponse.json({
      ok: true,
      next: safeRedirect(body.next, ACCOUNT_HOME),
    });
    await attachSession(response, sessionFromGoTrue(gotrue, role), config.secret);
    return response;
  } catch (err) {
    // 400 is what GoTrue returns for wrong credentials and, when the project
    // requires confirmation, for an address that has not confirmed one. Both
    // become the same 401 with the same sentence: distinguishing them here is
    // what would make this endpoint an account-enumeration oracle. The sign-in
    // page carries a permanent "resend the confirmation link" control so the
    // one of those two a person can act on is still reachable.
    if (err instanceof GoTrueError && (err.status === 400 || err.status === 401)) {
      return NextResponse.json({ error: INVALID_CREDENTIALS_MESSAGE }, { status: 401 });
    }
    return goTrueFailure(err, "auth.signin.failed");
  }
}
