import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthUnavailableNotice,
  authOffTitle,
  authOffDescription,
} from "@/components/auth/AuthUnavailableNotice";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isAuthConfigured } from "@/lib/auth-config";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Create an account",
  description: "Create a Marsa account.",
  path: "/register",
  noindex: true,
});

export default function RegisterPage() {
  const authOn = isAuthConfigured();

  return (
    <AuthShell
      title={authOn ? "Create an account" : authOffTitle}
      description={
        authOn ? (
          <>
            This creates a real account. It stores an email address and, if you give one, a name.
            It is not a bank account and there is no money in it. See{" "}
            <Link
              href="/demo"
              className="font-medium text-brand-strong underline decoration-brand-strong/40 underline-offset-4 hover:decoration-brand-strong"
            >
              the demo
            </Link>{" "}
            for what the product would do.
          </>
        ) : (
          authOffDescription
        )
      }
      footer={
        authOn ? (
          <>
            Already registered?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-strong underline decoration-brand-strong/40 underline-offset-4 hover:decoration-brand-strong"
            >
              Sign in
            </Link>
          </>
        ) : undefined
      }
    >
      {authOn ? <RegisterForm /> : <AuthUnavailableNotice />}
    </AuthShell>
  );
}
