import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthUnavailableNotice } from "@/components/auth/AuthUnavailableNotice";
import { EmailOnlyForm } from "@/components/auth/EmailOnlyForm";
import { isAuthConfigured } from "@/lib/auth-config";
import { isEmail } from "@/lib/validation";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Confirm your email",
  description: "Confirm the email address on your Marsa account.",
  path: "/verify-email",
  noindex: true,
});

/**
 * Where registration lands, and where a stuck sign-in leads.
 *
 * Public rather than guest-only: somebody signed in on one device may still
 * need to confirm an address, and somebody who never completed registration
 * has no session to be recognised by.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Prefilled from the registration redirect. Validated before use so the
  // field cannot be seeded with arbitrary text from a link someone was sent.
  const candidate = typeof params.email === "string" ? params.email : "";
  const defaultEmail = isEmail(candidate) ? candidate : "";

  return (
    <AuthShell
      title="Confirm your email"
      description="We send a confirmation link when an account is created. Following it signs you in and finishes setting the account up."
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
        <div className="flex flex-col gap-5">
          <p className="text-sm leading-relaxed text-ink-muted">
            Not arrived? It can take a minute, and it is worth checking your spam folder. You can
            ask for another below.
          </p>
          <EmailOnlyForm
            endpoint="/api/auth/resend-verification"
            submitLabel="Send another link"
            pendingLabel="Sending…"
            defaultEmail={defaultEmail}
            confirmation="If that address has an account waiting to be confirmed, another link is on its way."
          />
        </div>
      ) : (
        <AuthUnavailableNotice />
      )}
    </AuthShell>
  );
}
