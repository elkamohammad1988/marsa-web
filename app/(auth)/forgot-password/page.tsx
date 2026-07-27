import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthUnavailableNotice } from "@/components/auth/AuthUnavailableNotice";
import { EmailOnlyForm } from "@/components/auth/EmailOnlyForm";
import { isAuthConfigured } from "@/lib/auth-config";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Reset your password",
  description: "Request a password reset link for your Marsa account.",
  path: "/forgot-password",
  noindex: true,
});

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Give us the address on the account and we will send a link that lets you set a new password."
      footer={
        <Link
          href="/login"
          className="font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      {isAuthConfigured() ? (
        <EmailOnlyForm
          endpoint="/api/auth/forgot-password"
          submitLabel="Send reset link"
          pendingLabel="Sending…"
          /*
            "If that address has an account, a reset link is on its way" —
            never "we have sent you an email". The endpoint answers identically
            whether or not the account exists, precisely so this page cannot be
            used to find out, and the wording has to hold the same line the
            endpoint does.
          */
          confirmation="If that address has an account, a reset link is on its way. It expires shortly, so use it soon — and check your spam folder if it does not arrive."
        />
      ) : (
        <AuthUnavailableNotice />
      )}
    </AuthShell>
  );
}
