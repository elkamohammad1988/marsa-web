import type { Metadata } from "next";
import { Heading } from "@/components/ui/Heading";
import { FormAlert } from "@/components/auth/FormAlert";
import { requirePermission } from "@/lib/auth";
import { getAuthConfig } from "@/lib/auth-config";
import { ROLE_LABELS } from "@/lib/auth-roles";
import { listProfiles, PROFILE_PAGE_SIZE, type Profile } from "@/lib/profiles";
import { captureException } from "@/lib/observability";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accounts",
  robots: { index: false, follow: false, nocache: true },
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/**
 * Every account, for a role that may read them.
 *
 * This page is what makes the role model real rather than decorative, and it
 * is gated twice on purpose:
 *
 *   1. `requirePermission("accounts:read")` — and middleware asked the same
 *      question before this file ran. That decides what is *offered*.
 *   2. Row Level Security on `public.profiles`. That decides what is
 *      *returned*, and `listProfiles` deliberately sends "select every
 *      profile" with no role check of its own.
 *
 * The second is what makes the first survivable. If the role in a session
 * cookie were ever wrong — stale after a demotion, or forged — this page would
 * open and show exactly one row: the reader's own. There is no query in this
 * application that returns somebody else's profile to somebody who is not an
 * administrator, because the application is not what decides.
 */
export default async function AccountDirectoryPage() {
  const session = await requirePermission("accounts:read");
  const config = getAuthConfig();

  let profiles: Profile[] = [];
  let total = 0;
  let failed = false;

  if (config) {
    try {
      const page = await listProfiles(config, session.accessToken, { limit: PROFILE_PAGE_SIZE });
      profiles = page.items;
      total = page.total;
    } catch (err) {
      failed = true;
      captureException(err, { event: "account.directory.unreadable" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level="h1" className="text-2xl md:text-3xl">
          Accounts
        </Heading>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Every profile this database holds. What you can see here is decided by the policies in{" "}
          <code className="font-mono text-xs text-ink">db/migrations/004_auth_profiles.sql</code>,
          not by this page.
        </p>
      </div>

      {failed && (
        <FormAlert tone="error">
          The account list could not be read. The database may not have migration 004 applied yet.
        </FormAlert>
      )}

      {!failed && (
        <section className="overflow-hidden rounded-card-lg border border-line bg-card shadow-card">
          {/* Horizontal scroll is confined to the table, so the page itself
              never scrolls sideways on a narrow screen. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <caption className="sr-only">
                Accounts, newest first. {total} in total.
              </caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-ink-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Name
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Role
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-b border-line/60 last:border-0">
                    <th scope="row" className="px-5 py-3 font-medium text-ink">
                      {profile.email}
                    </th>
                    <td className="px-5 py-3 text-ink-muted">{profile.fullName ?? "—"}</td>
                    <td className="px-5 py-3 text-ink-muted">{ROLE_LABELS[profile.role]}</td>
                    <td className="px-5 py-3 tabular-nums text-ink-muted">
                      {formatDate(profile.createdAt)}
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-ink-subtle">
                      No accounts yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > profiles.length && (
            <p className="border-t border-line px-5 py-3 text-xs text-ink-subtle">
              {/* Said out loud rather than absorbed. A list that silently shows
                  the first page of a longer set is the shape that made the demo
                  funnel report over 100%. */}
              Showing the {profiles.length} most recent of {total}.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
