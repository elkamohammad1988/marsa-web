import { captureException } from "@/lib/observability";

/**
 * Configuration for customer authentication.
 *
 * Three values, all required together, none of which may reach the browser.
 * The shape follows `getPostgrestConfig` and `getAdminConfig`: return a
 * complete configuration or null, never a half-built one that fails later at a
 * point far from the cause.
 *
 * ── Why the anon key and not the service-role key ──────────────────────────
 * The service-role key bypasses Row Level Security. Authentication is the one
 * subsystem where that is exactly wrong: every read of a profile must be made
 * *as the signed-in user*, so that the database — not the application — is
 * what decides whose row they may see. The anon key carries no privilege of
 * its own; it identifies the project, and the user's own access token supplies
 * the identity. Getting this backwards would mean a bug in one route handler
 * could return anybody's row, and RLS would never be consulted.
 *
 * Which is why `SUPABASE_SERVICE_ROLE_KEY` is deliberately absent from this
 * module. `lib/storage.ts` keeps it for the submissions pipeline, where there
 * is no user to act as.
 */

export type AuthConfig = {
  /** GoTrue base, e.g. https://<project>.supabase.co/auth/v1 */
  authEndpoint: string;
  /**
   * PostgREST base for the same project. It lives here rather than being read
   * from `getPostgrestConfig()` because that function pairs the endpoint with
   * the service-role key, and profile reads must never use that key.
   */
  restEndpoint: string;
  /** Project anon key. Public by design; carries no privilege. */
  anonKey: string;
  /** Secret signing our own session envelope. Never public. */
  secret: string;
};

/**
 * Minimum length for `AUTH_SESSION_SECRET`.
 *
 * Higher than the shared floor because this one secret is what stands between
 * a forged cookie and every customer account, and it is generated once by a
 * machine rather than typed by a person — so there is no usability argument
 * for a low bound. 32 hex characters is 128 bits.
 */
export const MIN_AUTH_SECRET_LENGTH = 32;

/**
 * A complete authentication configuration, or null when authentication is not
 * set up.
 *
 * Null is a supported state, not an error: the site runs with an empty
 * environment by design, and every auth surface renders a "not configured"
 * explanation rather than a broken form. What is *not* supported is running
 * with a weak signing secret, which is refused with a reported event — the
 * failure that otherwise looks like nothing at all.
 */
export function getAuthConfig(
  env: Record<string, string | undefined> = process.env,
): AuthConfig | null {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  const secret = env.AUTH_SESSION_SECRET?.trim();
  if (!url || !anonKey || !secret) return null;

  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    captureException(
      new Error(
        `AUTH_SESSION_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters; ` +
          "authentication is disabled.",
      ),
      { event: "auth.config.rejected" },
    );
    return null;
  }

  return {
    authEndpoint: `${url}/auth/v1`,
    restEndpoint: `${url}/rest/v1`,
    anonKey,
    secret,
  };
}

/**
 * True when the environment can support signing in.
 *
 * The auth pages read this to decide between a working form and a setup
 * panel. That panel quotes `MIN_AUTH_SECRET_LENGTH` rather than retyping the
 * number as prose: the admin login page had the opposite problem, telling an
 * operator to set an 8-character password long after the constant had risen to
 * 16, so following the instruction produced a locked door and a server log.
 */
export function isAuthConfigured(env?: Record<string, string | undefined>): boolean {
  return getAuthConfig(env) !== null;
}
