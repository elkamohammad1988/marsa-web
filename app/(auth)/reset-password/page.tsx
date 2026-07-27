import { AuthShell } from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { requireSession } from "@/lib/auth";
import { ACCOUNT_HOME } from "@/lib/auth-routes";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Choose a new password",
  description: "Set a new password for your Marsa account.",
  path: "/reset-password",
  noindex: true,
});

/**
 * Set a new password.
 *
 * Reached from a recovery link, which `/auth/confirm` has already exchanged
 * for a session — so this page needs no token of its own, and `requireSession`
 * is the whole gate. Somebody who arrives here without one is sent to sign in,
 * which is correct: without a session there is nothing to prove they own the
 * account.
 */
export default async function ResetPasswordPage() {
  const session = await requireSession();

  return (
    <AuthShell
      title="Choose a new password"
      description={`Setting a new password for ${session.email}.`}
    >
      <NewPasswordForm submitLabel="Save and continue" redirectTo={ACCOUNT_HOME} />
    </AuthShell>
  );
}
