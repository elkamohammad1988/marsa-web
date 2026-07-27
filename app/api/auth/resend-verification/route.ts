import { emailRedirectUrl, handleAuthEmailRequest } from "@/lib/api-auth";
import { resendConfirmation } from "@/lib/gotrue";

export const runtime = "nodejs";

/**
 * Send the confirmation link again.
 *
 * This exists because sign-in refuses to say *why* it refused. An address that
 * has registered but never confirmed gets the same sentence as a wrong
 * password, which is the right answer to give an attacker and a dead end for
 * the person whose confirmation email went to spam. This is the way out of
 * that dead end, and it is reachable without anyone having to be told which
 * situation they are in.
 */
export async function POST(request: Request) {
  return handleAuthEmailRequest(request, {
    event: "auth.resend.failed",
    send: (config, email) =>
      resendConfirmation(config, { email, redirectTo: emailRedirectUrl() }),
  });
}
