import { Heading } from "@/components/ui/Heading";
import { FormAlert } from "@/components/auth/FormAlert";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { requireSession } from "@/lib/auth";
import { getAuthConfig } from "@/lib/auth-config";
import { permissionsFor, ROLE_LABELS } from "@/lib/auth-roles";
import { getProfile, type Profile } from "@/lib/profiles";
import { formatDay } from "@/lib/dates";
import { captureException } from "@/lib/observability";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Your account",
  description: "Your Marsa account profile.",
  path: "/account",
  noindex: true,
});

/** The two letters shown in place of an avatar. */
function initials(profile: Profile): string {
  const source = profile.fullName?.trim() || profile.email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card-lg border border-line bg-card p-6 shadow-e1">
      <Heading level="h3">{title}</Heading>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const session = await requireSession();
  const config = getAuthConfig();

  // The layout above already proved there is a session, so a failure here is
  // about the profile row, not about who the caller is. Reported and rendered
  // as an explanation rather than thrown: the likeliest cause by far is
  // migration 004 not having been applied, and a stack trace is a poor way to
  // say "run the migration".
  let profile: Profile | null = null;
  let unreadable = false;
  if (config) {
    try {
      profile = await getProfile(config, session.accessToken, session.userId);
    } catch (err) {
      unreadable = true;
      captureException(err, {
        event: "account.profile.unreadable",
        remedy: "apply db/migrations/004_auth_profiles.sql",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Heading level="h1" size="panel">
        Your account
      </Heading>

      {!profile && (
        <FormAlert tone="error">
          {unreadable
            ? "Your profile could not be read. The database may not have migration 004 applied yet."
            : "There is no profile row for this account yet. Applying db/migrations/004_auth_profiles.sql creates one for every existing user."}
        </FormAlert>
      )}

      {profile && (
        <Panel title="Profile">
          <div className="flex items-center gap-4">
            {/*
              Initials rather than a picture. `profiles.avatar_url` exists and
              is populated by any identity provider that supplies one, but the
              Content-Security-Policy allows images from 'self' and data: only
              — so a remote avatar would be blocked by the browser rather than
              rendered. Widening that policy for third-party image hosts is a
              real trade and the maintainer's call, so this shows something
              honest in the meantime.
            */}
            <span
              aria-hidden
              className="grid h-14 w-14 flex-none place-items-center rounded-full bg-brand/[0.12] text-lg font-semibold text-brand-strong"
            >
              {initials(profile)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-ink">
                {profile.fullName ?? "No name set"}
              </p>
              <p className="truncate text-sm text-ink-muted">{profile.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">
                Role
              </dt>
              <dd className="mt-1 text-sm text-ink">{ROLE_LABELS[profile.role]}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDay(profile.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-[0.14em] text-ink-subtle">
                Last updated
              </dt>
              <dd className="mt-1 text-sm text-ink">{formatDay(profile.updatedAt)}</dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <ProfileForm profile={profile} />
          </div>
        </Panel>
      )}

      <Panel title="Password">
        <NewPasswordForm submitLabel="Change password" />
      </Panel>

      {profile && (
        <Panel title="What this role can do">
          {/*
            The permissions are read from the same table the middleware and the
            route handlers consult, so this cannot drift into describing a
            boundary that is not enforced.
          */}
          <ul className="flex flex-wrap gap-2">
            {permissionsFor(profile.role).map((permission) => (
              <li
                key={permission}
                className="rounded-md border border-line bg-canvas/60 px-3 py-1 font-mono text-xs text-ink-muted"
              >
                {permission}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Roles are granted in the database, never from this page. The{" "}
            <code className="font-mono text-xs text-ink">authenticated</code> database role holds
            no privilege to update the column, so a request to change it fails at Postgres rather
            than at a check in the application.
          </p>
        </Panel>
      )}
    </div>
  );
}
