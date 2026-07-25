import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminConfig, isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

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
              Set <code className="font-mono text-xs">ADMIN_PASSWORD</code> (8+ characters) and{" "}
              <code className="font-mono text-xs">ADMIN_SESSION_SECRET</code> (16+ characters) in
              the environment, then redeploy. Until then this area stays closed.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
