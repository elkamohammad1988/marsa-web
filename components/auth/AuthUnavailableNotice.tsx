import { Button } from "@/components/ui/Button";
import { IconLock } from "@/components/icons";

/**
 * Shown in place of a form when the environment has no authentication.
 *
 * The site is meant to run with an empty environment, so this is a normal
 * state rather than a fault. What changed, twice, is *who it is addressed to*.
 *
 * It began addressed only to a developer, and it was the entire page: four
 * lines naming `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTH_SESSION_SECRET` and
 * `db/migrations/`, sitting in a small box in the middle of an otherwise empty
 * screen. That is what anyone who clicks "Log In" in the navbar saw — a build
 * instruction where a sign-in should be. It is the single most expensive screen
 * in the product, because it converts "polished fintech" into "somebody's
 * unfinished side project" in one glance, and no amount of work on any other
 * page outranks it.
 *
 * The first fix demoted it: a designed empty state on top, with the variable
 * names moved into a collapsed `<details>` for the one reader who wants them.
 * Better, and still wrong in the same direction — a visitor who opens a
 * disclosure labelled "Running Marsa locally?" out of curiosity lands right
 * back in a configuration fragment, and the deployed build is precisely the one
 * where nobody reading it can act on it.
 *
 * So the instruction is gone from the page and lives where instructions live:
 * `AUTHENTICATION.md`, linked. That is a documentation link rather than a
 * configuration leak, and it is strictly more useful than the three variable
 * names were — setting up accounts needs a migration and two Supabase dashboard
 * settings that no environment variable can express, and the page never had
 * room to say so.
 *
 * What stays is the part that was right from the beginning: a real action that
 * actually works. The demo needs no configuration, so nobody who arrives here
 * leaves with nothing to do.
 */
export function AuthUnavailableNotice() {
  return (
    <div>
      <div className="rounded-card border border-line bg-surface-tint/50 px-5 py-6 text-center">
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand/[0.12] ring-1 ring-brand/25">
          <IconLock className="h-5 w-5 text-brand-strong" />
        </span>
        <p className="mt-4 font-display text-lg font-bold text-ink">
          Accounts aren&rsquo;t open in this build
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          Marsa is a concept build. Sign-in, email confirmation and per-row database permissions
          are all implemented — they are simply not switched on in this environment, so there is
          no account to sign in to.
        </p>
        <Button href="/demo" size="md" className="mt-5">
          Try the interactive demo
        </Button>
        <p className="mt-3 text-xs text-ink-subtle">No sign-up, and it needs no configuration.</p>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-subtle">
        Building something similar?{" "}
        <a
          href="https://github.com/elkamohammad1988/marsa-web/blob/main/AUTHENTICATION.md"
          className="text-brand-strong underline-offset-2 hover:underline"
        >
          How the authentication is built
        </a>{" "}
        — sessions, email confirmation, password reset, and the Postgres row-level security that
        decides who reads which row.
      </p>
    </div>
  );
}
