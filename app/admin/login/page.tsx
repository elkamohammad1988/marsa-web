import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import {
  getAdminConfig,
  isAdminRequest,
  MIN_PASSWORD_LENGTH,
  MIN_SECRET_LENGTH,
} from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Admin sign-in, and the setup instructions shown when no credentials exist.
 *
 * The two minimum lengths in that panel are read from the constants
 * `getAdminConfig()` actually enforces rather than retyped as prose. They read
 * "8+" and "16+" long after `MIN_PASSWORD_LENGTH` rose to 16, so an operator
 * following the instruction would have set a password the app then rejected —
 * closing the admin area with nothing but a server log to explain it.
 */
export default async function AdminLoginPage() {
  if (await isAdminRequest()) redirect("/admin");
  const enabled = Boolean(getAdminConfig());

  return (
    <Container>
      <div className="mx-auto max-w-md rounded-card-lg border border-line bg-card p-7 shadow-card">
        <Heading level="h3">Marsa admin</Heading>
        <p className="mt-2 text-sm text-ink-muted">
          Sign in to review form submissions from the site.
        </p>

        {enabled ? (
          <AdminLoginForm />
        ) : (
          <div className="mt-6 rounded-xl border border-line bg-surface-cream p-4 text-sm text-ink-muted">
            <p className="font-medium text-ink">Admin is not configured</p>
            <p className="mt-1">
              Set <code className="font-mono text-xs">ADMIN_PASSWORD</code> (
              {MIN_PASSWORD_LENGTH}+ characters) and{" "}
              <code className="font-mono text-xs">ADMIN_SESSION_SECRET</code> ({MIN_SECRET_LENGTH}+
              characters) in the environment, then restart. Until then this area stays closed.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
