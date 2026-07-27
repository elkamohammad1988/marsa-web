import { emailRedirectUrl, handleAuthEmailRequest } from "@/lib/api-auth";
import { requestPasswordRecovery } from "@/lib/gotrue";

export const runtime = "nodejs";

/**
 * Start a password reset.
 *
 * The link in the email lands on `/auth/confirm`, which exchanges the token
 * for a session and then sends the person to `/reset-password`. That
 * destination is carried in the URL rather than assumed, because the same
 * confirmation route also handles sign-up links, which end somewhere else.
 */
export async function POST(request: Request) {
  return handleAuthEmailRequest(request, {
    event: "auth.recovery.failed",
    send: (config, email) =>
      requestPasswordRecovery(config, {
        email,
        redirectTo: emailRedirectUrl("/reset-password"),
      }),
  });
}
