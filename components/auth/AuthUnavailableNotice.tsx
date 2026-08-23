import { Button } from "@/components/ui/Button";
import { IconLock } from "@/components/icons";
import { siteConfig } from "@/lib/site";

/**
 * The heading and the explanation for an environment with no authentication.
 *
 * They live here, next to the block that renders under them, because five
 * pages need to say the same thing and the one arrangement that must never
 * happen is the page title promising a flow the body then withdraws. Before
 * this, `/register` was headed "Create an account", described the account it
 * would create, and then rendered a panel saying accounts were not open — three
 * claims, two of them false, inside one viewport.
 */
export const authOffTitle = "Accounts aren't open in this build";

export const authOffDescription =
  "Marsa is a concept build. Sign-up, email confirmation, sign-in, password reset and " +
  "per-row database permissions are all written and tested in this repository. They are not " +
  "switched on here, so there is no account to create and none to sign in to.";

/**
 * Shown in place of a form when the environment has no authentication.
 *
 * The site is meant to run with an empty environment, so this is a normal
 * state rather than a fault. What it must not read as is an unfinished side
 * project: it began as four lines naming `SUPABASE_URL`, `SUPABASE_ANON_KEY`
 * and `AUTH_SESSION_SECRET` in a box in the middle of an empty screen, which
 * is what anyone clicking "Log In" in the navbar saw. Setup instructions now
 * live where instructions live, in `AUTHENTICATION.md`, and what stays on the
 * page is a real action that actually works — the demo needs no configuration,
 * so nobody who arrives here leaves with nothing to do.
 */
export function AuthUnavailableNotice() {
  return (
    <div>
      <div className="rounded-card border border-line bg-surface-tint/50 px-5 py-6 text-center">
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/[0.12] ring-1 ring-brand/25">
          <IconLock className="h-5 w-5 text-brand-strong" />
        </span>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
          The demo is the part of Marsa that needs no account and no configuration. It walks the
          whole product in about a minute.
        </p>
        <Button href="/demo" size="md" className="mt-5">
          Try the interactive demo
        </Button>
      </div>

      {/*
        The underline is permanent, not `hover:underline`, and that is a WCAG
        1.4.1 fix rather than taste. A link inside a sentence may be
        distinguished by colour alone only if it clears 3:1 against the text
        around it; gold on this muted grey measures 1.20:1. Links that stand
        alone on their own line are deliberately untouched.
      */}
      <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
        Building something similar?{" "}
        <a
          href={`${siteConfig.repoUrl}/blob/main/AUTHENTICATION.md`}
          className="text-brand-strong underline decoration-brand-strong/40 underline-offset-2 hover:decoration-brand-strong"
        >
          How the authentication is built
        </a>{" "}
        covers sessions, email confirmation, password reset, and the Postgres row-level
        security that decides who reads which row.
      </p>
    </div>
  );
}
