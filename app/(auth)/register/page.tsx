import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthUnavailableNotice } from "@/components/auth/AuthUnavailableNotice";
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
  return (
    <AuthShell
      title="Create an account"
      description={
        <>
          This creates a real account: an email address and, if you give one, a name, stored in
          Supabase. It is not a bank account and there is no money — see{" "}
          <Link
            href="/demo"
            className="font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            the demo
          </Link>{" "}
          for what the product would do.
        </>
      }
      footer={
        <>
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      {isAuthConfigured() ? <RegisterForm /> : <AuthUnavailableNotice />}
    </AuthShell>
  );
}
