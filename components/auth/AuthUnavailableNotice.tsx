import { MIN_AUTH_SECRET_LENGTH } from "@/lib/auth-config";
import { Button } from "@/components/ui/Button";
import { IconLock } from "@/components/icons";

/**
 * Shown in place of a form when the environment has no authentication.
 *
 * The site is meant to run with an empty environment, so this is a normal
 * state rather than a fault. What changed is *who it is addressed to*.
 *
 * It used to be addressed only to a developer, and it was the entire page:
 * four lines naming `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
 * `AUTH_SESSION_SECRET`, `db/migrations/` and `AUTHENTICATION.md`, sitting in
 * a small box in the middle of an otherwise empty screen. That is what anyone
 * who clicks "Log In" in the navbar saw — a build instruction where a bank's
 * sign-in should be. It is the single most expensive screen in the product,
 * because it converts "polished fintech" into "somebody's unfinished side
 * project" in one glance, and no amount of work on any other page outranks it.
 *
 * The developer instruction has not been deleted, because a person running
 * this locally genuinely needs it and there is nowhere else it belongs. It has
 * been demoted: the primary state is now a designed empty state with a real
 * action that actually works (the demo needs no configuration), and the
 * variable names live in a `<details>` addressed to the one reader who wants
 * them. A `<details>` is used rather than local state so this stays a server
 * component and keeps working with no JavaScript.
 *
 * The length still comes from the constant `getAuthConfig()` enforces rather
 * than retyped as prose. The admin login page had exactly that bug: its panel
 * still read "8+" long after the constant rose to 16, so an operator who
 * followed the instruction produced a locked door and a line in a log nobody
 * was reading.
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

      <details className="group mt-4 rounded-xl border border-line bg-canvas/40 px-4 py-3 text-sm">
        <summary className="cursor-pointer list-none font-medium text-ink-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
          Running Marsa locally?
          <span className="ml-1.5 inline-block text-ink-subtle transition-transform group-open:rotate-90">
            &rsaquo;
          </span>
        </summary>
        <div className="mt-3 space-y-2 leading-relaxed text-ink-muted">
          <p>
            Set <code className="font-mono text-xs text-ink">SUPABASE_URL</code>,{" "}
            <code className="font-mono text-xs text-ink">SUPABASE_ANON_KEY</code> and{" "}
            <code className="font-mono text-xs text-ink">AUTH_SESSION_SECRET</code> (
            {MIN_AUTH_SECRET_LENGTH}+ characters), apply{" "}
            <code className="font-mono text-xs text-ink">db/migrations/</code>, then restart.
          </p>
          <p>
            The full sequence, including the two Supabase dashboard settings that cannot be set
            from code, is in{" "}
            <code className="font-mono text-xs text-ink">AUTHENTICATION.md</code>.
          </p>
        </div>
      </details>
    </div>
  );
}
