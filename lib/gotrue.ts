import type { AuthConfig } from "@/lib/auth-config";

/**
 * Minimal GoTrue client — the Supabase Auth REST API.
 *
 * The sibling of `lib/postgrest.ts`, and deliberately built the same way: HTTP
 * over `fetch`, no SDK, every request bounded by the same 8-second budget, and
 * failures arriving as a typed error carrying a status rather than as an
 * undefined value that reads like "no result".
 *
 * ── Why not @supabase/ssr ──────────────────────────────────────────────────
 * Three reasons, in the order they mattered.
 *
 * First, **the tokens never reach the browser**. `@supabase/ssr` stores the
 * session in cookies the browser client is meant to read, so they cannot be
 * `httpOnly`. Nothing in this application authenticates from the browser —
 * every call is a route handler or a server component — so the session can be
 * `httpOnly` here, and an XSS bug cannot read it.
 *
 * Second, **one way to talk to the database**. `@supabase/supabase-js` brings
 * its own PostgREST client, which would sit beside `lib/postgrest.ts` doing
 * the same job with different timeout, error and escaping behaviour. Two
 * clients means two places for the next bug.
 *
 * Third, the project ships four runtime dependencies and says so in the
 * README. That is a claim, and claims in this repository are kept true.
 *
 * The trade is real and worth stating: this file is code we own and must keep
 * correct against an API we do not control. It is small on purpose — nine
 * endpoints, no state, no token refresh scheduling, no storage adapter — and
 * every one of them is exercised in `tests/gotrue.test.ts`.
 */

const TIMEOUT_MS = 8000;

/** A GoTrue session as returned by the token, signup and verify endpoints. */
export type GoTrueSession = {
  access_token: string;
  refresh_token: string;
  /** Seconds until `access_token` expires. */
  expires_in: number;
  token_type: string;
  user: GoTrueUser;
};

export type GoTrueUser = {
  id: string;
  email?: string;
  /** Null or absent until the address has been confirmed. */
  email_confirmed_at?: string | null;
  created_at?: string;
  /**
   * Caller-supplied metadata (`full_name` at sign-up). User-writable, so it is
   * display data and never authorisation data — the role lives in a database
   * column the user has no privilege to update. See migration 004.
   */
  user_metadata?: Record<string, unknown>;
  /**
   * Empty when GoTrue is obscuring an existing account: signing up with an
   * address that already exists returns a decoy user rather than an error, so
   * the endpoint cannot be used to enumerate registered addresses.
   */
  identities?: unknown[];
};

/** The one-time-token types this application asks GoTrue to verify. */
export const OTP_TYPES = ["signup", "email", "recovery", "email_change"] as const;
export type OtpType = (typeof OTP_TYPES)[number];

export function isOtpType(value: unknown): value is OtpType {
  return typeof value === "string" && (OTP_TYPES as readonly string[]).includes(value);
}

/**
 * A failed GoTrue exchange.
 *
 * `message` carries the upstream text and is safe to *log*; it is never shown
 * to a visitor. Route handlers translate it into one of a small set of fixed
 * strings, because GoTrue's own messages distinguish "user not found" from
 * "wrong password" in some versions, and relaying that turns the login form
 * into an account-enumeration oracle.
 *
 * `code` is the machine-readable `error_code`, which is what a caller should
 * branch on when it needs to — never the message text.
 */
export class GoTrueError extends Error {
  constructor(
    message: string,
    readonly status = 502,
    readonly code?: string,
  ) {
    super(message);
    this.name = "GoTrueError";
  }
}

/** GoTrue has used three error body shapes across versions; accept all of them. */
function describeFailure(status: number, body: string): GoTrueError {
  let message = body.slice(0, 300);
  let code: string | undefined;
  try {
    const parsed = JSON.parse(body) as {
      msg?: string;
      message?: string;
      error?: string;
      error_description?: string;
      error_code?: string;
      code?: string | number;
    };
    message =
      parsed.msg ?? parsed.message ?? parsed.error_description ?? parsed.error ?? message;
    code = parsed.error_code ?? (typeof parsed.code === "string" ? parsed.code : undefined);
  } catch {
    // Not JSON — an edge proxy error page, most likely. Keep the raw prefix.
  }
  return new GoTrueError(`GoTrue ${status}: ${message}`, status, code);
}

/**
 * One request to GoTrue.
 *
 * `AbortSignal.timeout` rather than an `AbortController` cleared in a
 * `finally`, for the reason audit B9 recorded against the PostgREST client:
 * `finally` runs when the *headers* arrive, so a response that stalls
 * mid-body had no ceiling at all. This signal stays armed for the whole
 * exchange, body included.
 *
 * `accessToken` replaces the anon key in the Authorization header for the
 * endpoints that act on behalf of a signed-in user (`/logout`, `PUT /user`).
 * The `apikey` header stays the anon key either way — it identifies the
 * project, not the caller.
 */
async function request<T>(
  cfg: AuthConfig,
  path: string,
  init: { method: string; body?: unknown; accessToken?: string } ,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${cfg.authEndpoint}${path}`, {
      method: init.method,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${init.accessToken ?? cfg.anonKey}`,
        "content-type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch (err) {
    // A timeout arrives as a DOMException named TimeoutError, whose default
    // message never says how long was allowed — the first thing anyone reading
    // the log wants to know.
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? `no response within ${TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    throw new GoTrueError(`GoTrue request failed: ${reason}`);
  }

  const text = await res.text().catch(() => "");
  if (!res.ok) throw describeFailure(res.status, text);
  return (text ? JSON.parse(text) : null) as T;
}

/** `redirect_to` is a query parameter on GoTrue's email-sending endpoints. */
function withRedirect(path: string, redirectTo?: string): string {
  return redirectTo ? `${path}?redirect_to=${encodeURIComponent(redirectTo)}` : path;
}

/**
 * Register an account.
 *
 * Returns a session when the project has email confirmation switched off, and
 * a bare user when it is on — callers must handle both rather than assuming
 * one, because that setting lives in the Supabase dashboard and can change
 * without a deploy.
 */
export async function signUp(
  cfg: AuthConfig,
  input: { email: string; password: string; fullName?: string; redirectTo?: string },
): Promise<{ session: GoTrueSession | null; user: GoTrueUser }> {
  const result = await request<GoTrueSession & GoTrueUser>(
    cfg,
    withRedirect("/signup", input.redirectTo),
    {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
        // `data` becomes user_metadata, which migration 004's trigger reads to
        // seed the profile's display name. Nothing here is ever trusted for
        // authorisation: a user can rewrite their own metadata.
        data: input.fullName ? { full_name: input.fullName } : {},
      },
    },
  );

  return result.access_token
    ? { session: result, user: result.user }
    : { session: null, user: result };
}

/** Exchange an email and password for a session. */
export async function signInWithPassword(
  cfg: AuthConfig,
  input: { email: string; password: string },
): Promise<GoTrueSession> {
  return request<GoTrueSession>(cfg, "/token?grant_type=password", {
    method: "POST",
    body: { email: input.email, password: input.password },
  });
}

/**
 * Exchange a refresh token for a fresh session.
 *
 * Supabase rotates refresh tokens, so the returned one replaces the old one.
 * A failure here means the session is gone for good — revoked, expired, or
 * already spent — and the caller's only correct response is to clear the
 * cookie rather than retry.
 */
export async function refreshSession(
  cfg: AuthConfig,
  refreshToken: string,
): Promise<GoTrueSession> {
  return request<GoTrueSession>(cfg, "/token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

/**
 * Revoke a session at the server.
 *
 * Clearing our cookie is what ends the session for this browser; this is what
 * stops the refresh token being usable by anyone who captured it. Callers
 * clear the cookie whether or not this succeeds — a sign-out that fails
 * because the network is down must still sign the person out.
 */
export async function signOut(cfg: AuthConfig, accessToken: string): Promise<void> {
  await request<null>(cfg, "/logout", { method: "POST", accessToken });
}

/** Send a password-reset email. Succeeds whether or not the address exists. */
export async function requestPasswordRecovery(
  cfg: AuthConfig,
  input: { email: string; redirectTo?: string },
): Promise<void> {
  await request<null>(cfg, withRedirect("/recover", input.redirectTo), {
    method: "POST",
    body: { email: input.email },
  });
}

/** Re-send a confirmation email. Succeeds whether or not the address exists. */
export async function resendConfirmation(
  cfg: AuthConfig,
  input: { email: string; redirectTo?: string },
): Promise<void> {
  await request<null>(cfg, withRedirect("/resend", input.redirectTo), {
    method: "POST",
    body: { type: "signup", email: input.email },
  });
}

/**
 * Exchange the hashed one-time token from an email link for a session.
 *
 * This is the whole reason the email templates are overridden in the Supabase
 * dashboard (see AUTHENTICATION.md). GoTrue's default `{{ .ConfirmationURL }}`
 * points at its own `/verify` endpoint, which redirects to the site with the
 * tokens in the URL *fragment* — invisible to a server, so a server-rendered
 * app cannot complete the flow. A template emitting `{{ .TokenHash }}` lets
 * the exchange happen entirely on the server, and the token never appears in a
 * page the browser can read back.
 */
export async function verifyOtp(
  cfg: AuthConfig,
  input: { tokenHash: string; type: OtpType },
): Promise<GoTrueSession> {
  return request<GoTrueSession>(cfg, "/verify", {
    method: "POST",
    body: { type: input.type, token_hash: input.tokenHash },
  });
}

/** Set a new password for the signed-in user. */
export async function updatePassword(
  cfg: AuthConfig,
  accessToken: string,
  password: string,
): Promise<GoTrueUser> {
  return request<GoTrueUser>(cfg, "/user", {
    method: "PUT",
    accessToken,
    body: { password },
  });
}

/**
 * True when GoTrue returned a decoy user rather than creating an account.
 *
 * Signing up with an address that already exists succeeds, returning a user
 * with no identities, so that the endpoint cannot be used to enumerate
 * registered addresses. Callers must render the same "check your inbox"
 * response either way — this predicate exists so that the *server* can tell
 * the difference for its own logging, not so the answer can be shown.
 */
export function isExistingAccountDecoy(user: GoTrueUser): boolean {
  return Array.isArray(user.identities) && user.identities.length === 0;
}
