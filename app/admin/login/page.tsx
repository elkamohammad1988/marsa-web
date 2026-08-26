import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminConfig, isAdminRequest } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * Admin sign-in, and what stands in for it when no credentials exist.
 *
 * That panel used to be the setup instruction itself — two environment variable
 * names and the minimum length of each, interpolated from the constants
 * `getAdminConfig()` enforces so the prose could not drift from the rule. The
 * interpolation was the right fix for the bug it addressed: the panel read "8+"
 * long after `MIN_PASSWORD_LENGTH` rose to 16, so an operator who followed it
 * produced a locked door and a line in a log nobody was reading.
 *
 * It was still the wrong panel, because it answered the wrong question. This
 * route is public. `/admin/login` is reachable by anyone who types it, and on
 * the deployed build — which runs with no credentials at all, deliberately —
 * this is the *only* thing they see. A visitor evaluating whether this
 * developer can be trusted with their product got a build instruction with two
 * of the application's environment variables in it.
 *
 * Nothing there is a secret; which variables this application reads is in
 * `.env.example` and in the public repository. That is the argument that kept
 * it, and it is an argument about disclosure when the problem is composition:
 * a configuration fragment rendered where a product should be reads as an
 * unfinished side project, whatever it discloses. The instruction now lives
 * where instructions live — `docs/DEPLOYMENT.md` — and the page states the
 * situation in a sentence a non-technical reader can act on.
 *
 * `tests/config-copy-leaks.test.ts` holds the property that replaced the old
 * one: no public auth surface names an environment variable.
 */
export default async function AdminLoginPage() {
  if (await isAdminRequest()) redirect("/admin");
  const enabled = Boolean(getAdminConfig());

  return (
    <Container>
      <div className="mx-auto max-w-md rounded-card-lg border border-line bg-card p-7 shadow-e1">
        <Heading level="h1" size="panel">
          Marsa admin
        </Heading>
        <p className="mt-2 text-sm text-ink-muted">
          Sign in to review form submissions from the site.
        </p>

        {enabled ? (
          <AdminLoginForm />
        ) : (
          <div className="mt-6 rounded-card border border-line bg-surface-alt p-4 text-sm text-ink-muted">
            <p className="font-medium text-ink">The operator area is closed on this build</p>
            <p className="mt-1 leading-relaxed">
              Marsa is a concept build, and this deployment runs without credentials on purpose,
              so the dashboard is shut rather than half-working. It is a real area behind a real
              password: form submissions, CSV export and the demo funnel. Running the project
              yourself opens it; the steps are in the deployment guide.
            </p>
          </div>
        )}
      </div>
    </Container>
  );
}
