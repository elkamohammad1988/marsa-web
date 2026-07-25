import { isEmail } from "@/lib/validation";

/**
 * Environment validation.
 *
 * Audit finding B8: every configuration read in this codebase is a presence
 * check with a silent fallback. Each fallback is individually defensible, but
 * in aggregate a production deploy can be misconfigured several different ways
 * and still boot, serve traffic and look healthy on every page.
 *
 * The problems this catches are the ones a presence check cannot: a value that
 * is *present but wrong*. `SUPABASE_URL=htps://typo` passes `if (!url)` and
 * then fails on the first insert. `RESEND_API_KEY` set without `RESEND_FROM`
 * disables notification email with no signal at all — submissions are stored
 * and nobody is told.
 *
 * Everything is reported at once rather than one failure per redeploy, and
 * every message names the variable and what is wrong with it.
 *
 * Scope note: admin credential rules (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`)
 * are validated in `lib/admin-auth.ts` and are deliberately not duplicated
 * here — they move as part of the admin authentication work, not with general
 * configuration.
 */

export class EnvironmentError extends Error {
  constructor(readonly issues: EnvIssue[]) {
    super(
      `Invalid environment configuration:\n${issues
        .map((i) => `  • ${i.variable}: ${i.problem}`)
        .join("\n")}`,
    );
    this.name = "EnvironmentError";
  }
}

export type EnvIssue = { variable: string; problem: string };

type Env = Record<string, string | undefined>;

/** Trimmed value, or undefined when unset or whitespace-only. */
function read(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Accepts a bare address or the RFC 5322 display form `Name <a@b.co>`, which
 * is what a mail "from" header usually carries.
 */
function isSenderAddress(value: string): boolean {
  const angled = value.match(/<([^>]+)>\s*$/);
  return isEmail(angled ? angled[1] : value);
}

/**
 * Every problem with the given environment. An empty array means it is
 * internally consistent — not that every optional feature is switched on.
 */
export function validateEnvironment(env: Env = process.env): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const add = (variable: string, problem: string) => issues.push({ variable, problem });

  /* -------------------------------------------------------------- database */

  const supabaseUrl = read(env, "SUPABASE_URL");
  const supabaseKey = read(env, "SUPABASE_SERVICE_ROLE_KEY");

  if (supabaseUrl && !isAbsoluteHttpUrl(supabaseUrl)) {
    add("SUPABASE_URL", "must be an absolute http(s) URL, e.g. https://<project>.supabase.co");
  }
  if (supabaseUrl && supabaseUrl.includes("xxxxxxxxxxxx")) {
    add("SUPABASE_URL", "still holds the placeholder from .env.example");
  }
  // The pair is all-or-nothing. Half of it silently downgrades storage to the
  // non-durable file store, which is how leads went missing (B1).
  if (supabaseUrl && !supabaseKey) {
    add("SUPABASE_SERVICE_ROLE_KEY", "is required whenever SUPABASE_URL is set");
  }
  if (supabaseKey && !supabaseUrl) {
    add("SUPABASE_URL", "is required whenever SUPABASE_SERVICE_ROLE_KEY is set");
  }
  if (env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    add(
      "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
      "must not exist — a NEXT_PUBLIC_ prefix ships the value to the browser, " +
        "and this key bypasses row-level security",
    );
  }

  /* ----------------------------------------------------------------- email */

  const resendKey = read(env, "RESEND_API_KEY");
  const resendFrom = read(env, "RESEND_FROM");
  const resendTo = read(env, "RESEND_TO");

  // Also all-or-nothing: either half alone disables notification silently.
  if (resendKey && !resendFrom) {
    add("RESEND_FROM", "is required whenever RESEND_API_KEY is set, or no mail is ever sent");
  }
  if (resendFrom && !resendKey) {
    add("RESEND_API_KEY", "is required whenever RESEND_FROM is set, or no mail is ever sent");
  }
  if (resendFrom && !isSenderAddress(resendFrom)) {
    add("RESEND_FROM", 'must be an email address or "Name <address@example.com>"');
  }
  if (resendTo && !isSenderAddress(resendTo)) {
    add("RESEND_TO", "must be an email address");
  }

  /* ------------------------------------------------------------------ site */

  const siteUrl = read(env, "NEXT_PUBLIC_SITE_URL");
  if (siteUrl && !isAbsoluteHttpUrl(siteUrl)) {
    add("NEXT_PUBLIC_SITE_URL", "must be an absolute http(s) URL");
  }

  return issues;
}

/**
 * Throw in production, warn everywhere else.
 *
 * Development stays zero-configuration on purpose — the site is meant to run
 * with an empty environment. A misconfiguration there is worth a warning, not
 * a refusal to start.
 */
export function assertEnvironment(env: Env = process.env): void {
  const issues = validateEnvironment(env);
  if (!issues.length) return;

  if (env.NODE_ENV === "production") throw new EnvironmentError(issues);

  console.warn(
    `[env] ${issues.length} configuration problem(s) — this would refuse to start in production:\n${issues
      .map((i) => `  • ${i.variable}: ${i.problem}`)
      .join("\n")}`,
  );
}
