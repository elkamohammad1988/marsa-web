import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthUnavailableNotice } from "@/components/auth/AuthUnavailableNotice";
import { SignInForm } from "@/components/auth/SignInForm";
import { isAuthConfigured } from "@/lib/auth-config";
import { noticeFor, safeRedirect } from "@/lib/auth-routes";
import { buildMetadata } from "@/lib/seo";

/**
 * Dynamic because `isAuthConfigured()` reads the environment. Prerendered,
 * this page would freeze the build machine's configuration into a page that
 * tells a visitor whether the *server* can sign them in.
 */
export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Sign in",
  description: "Sign in to your Marsa account.",
  path: "/login",
  noindex: true,
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  // Both arrive from the URL and neither is trusted: the destination is
  // reduced to a same-origin path, and the message is looked up in a closed
  // set rather than rendered from the query string.
  const next = safeRedirect(params.next, "");
  const notice = noticeFor(params.error);

  return (
    <AuthShell
      title="Sign in"
      description="Welcome back. Your account area is where the profile and role model built in this milestone actually run."
      footer={
        <>
          No account yet?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </>
      }
    >
      {isAuthConfigured() ? (
        <SignInForm next={next || undefined} notice={notice ?? undefined} />
      ) : (
        <AuthUnavailableNotice />
      )}
    </AuthShell>
  );
}
