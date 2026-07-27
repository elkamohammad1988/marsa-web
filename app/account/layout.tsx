import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SignOutButton } from "@/components/account/SignOutButton";
import { requireSession } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/auth-roles";

export const metadata: Metadata = {
  // Belt and braces alongside robots.ts: an account area must never be
  // indexed, and a layout covers every page added under it later.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The signed-in shell.
 *
 * `requireSession()` here rather than in each page, so a page added under
 * `/account` later is protected by existing. That is the same reasoning as the
 * route policy in `lib/auth-routes.ts`, applied one layer down — and the two
 * are deliberately both present: middleware is the boundary an attacker meets,
 * and this is what still holds if the matcher stops covering a path.
 *
 * The navigation is built from a permission, never from a role name. Adding a
 * third role that may read the directory then means one row in
 * `ROLE_PERMISSIONS` and no change here at all.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="py-10 md:py-14">
      <Container>
        <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-subtle">
              Your account
            </p>
            <p className="mt-1 truncate text-sm text-ink-muted">
              Signed in as <span className="font-medium text-ink">{session.email}</span> ·{" "}
              {ROLE_LABELS[session.role]}
            </p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <nav aria-label="Account">
              <ul className="flex items-center gap-2">
                <li>
                  <Link
                    href="/account"
                    className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    Overview
                  </Link>
                </li>
                {can(session.role, "accounts:read") && (
                  <li>
                    <Link
                      href="/account/admin"
                      className="inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      Accounts
                    </Link>
                  </li>
                )}
              </ul>
            </nav>
            <SignOutButton />
          </div>
        </header>

        <div className="pt-8">{children}</div>
      </Container>
    </div>
  );
}
