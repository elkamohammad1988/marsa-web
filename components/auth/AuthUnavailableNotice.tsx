import { MIN_AUTH_SECRET_LENGTH } from "@/lib/auth-config";

/**
 * Shown in place of a form when the environment has no authentication.
 *
 * The site is meant to run with an empty environment, so this is a normal
 * state rather than a fault — and the person reading it is running the project
 * locally, which is why it names the variables instead of apologising.
 *
 * The length is read from the constant `getAuthConfig()` enforces rather than
 * retyped as prose. The admin login page had exactly that bug: its panel still
 * read "8+" long after the constant rose to 16, so an operator who followed
 * the instruction produced a locked door and a line in a log nobody was
 * reading.
 */
export function AuthUnavailableNotice() {
  return (
    <div className="rounded-xl border border-line bg-canvas/60 p-4 text-sm text-ink-muted">
      <p className="font-medium text-ink">Accounts are not configured</p>
      <p className="mt-2 leading-relaxed">
        Set <code className="font-mono text-xs text-ink">SUPABASE_URL</code>,{" "}
        <code className="font-mono text-xs text-ink">SUPABASE_ANON_KEY</code> and{" "}
        <code className="font-mono text-xs text-ink">AUTH_SESSION_SECRET</code> (
        {MIN_AUTH_SECRET_LENGTH}+ characters), apply{" "}
        <code className="font-mono text-xs text-ink">db/migrations/</code>, then restart. Until
        then this area stays closed.
      </p>
      <p className="mt-2 leading-relaxed">
        The full sequence, including the two Supabase dashboard settings that cannot be set from
        code, is in <code className="font-mono text-xs text-ink">AUTHENTICATION.md</code>.
      </p>
    </div>
  );
}
