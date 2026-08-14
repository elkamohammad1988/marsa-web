import { NextResponse } from "next/server";
import { getAuthConfig, type AuthConfig } from "@/lib/auth-config";
import { getSession } from "@/lib/auth";
import type { UserSession } from "@/lib/auth-session";
import { GoTrueError } from "@/lib/gotrue";
import { isCrossSite } from "@/lib/same-origin";
import { captureException, newReference } from "@/lib/observability";
import { absoluteUrl } from "@/lib/site";
import {
  accountBucket,
  AUTH_EMAIL_ACCOUNT_TIERS,
  AUTH_EMAIL_TIERS,
  checkTiers,
  retryAfterSeconds,
} from "@/lib/api-rate-limit";
import { clientKey } from "@/lib/rate-limit";
import { validateEmailOnly } from "@/lib/validation";

/**
 * The parts every authentication endpoint repeats.
 *
 * `lib/api-forms.ts` does this job for the three submission endpoints. The
 * authentication routes need a different preamble — a cross-site check and a
 * configuration that may be absent — so they get their own, rather than one
 * function growing a mode flag.
 */

/**
 * Returned when the environment has no authentication configured.
 *
 * This used to name the three missing environment variables, on the reasoning
 * that whoever sees it is running the project locally and is the same person
 * who can fix it. The first half of that is not true. This string is a 503
 * response body, so it reaches anything that can issue a request — including a
 * visitor's devtools on the deployed build, which runs with no credentials by
 * design and therefore returns this to every auth call made against it.
 *
 * Nothing in the old message was secret; which variables this application reads
 * is in `.env.example` and in the public repository. It was simply addressed to
 * a reader who was not there, and configuration prose surfacing in a product is
 * a composition failure whether or not it discloses anything. The operator who
 * *is* there reads the server log, which still names what is missing —
 * `lib/env.ts` and `getAuthConfig()` both say so, loudly, at start-up.
 */
export const AUTH_UNAVAILABLE_MESSAGE =
  "Accounts are not available on this deployment.";

/**
 * One message for every credential failure.
 *
 * GoTrue distinguishes "no such user" from "wrong password" from "email not
 * confirmed" in its own error codes. Relaying any of that turns the sign-in
 * form into an oracle for whether an address has an account here — so the
 * three collapse into this, and the sign-in page carries a permanent
 * "resend the confirmation link" affordance so that the one case a person can
 * actually fix is reachable without being told which case they are in.
 */
export const INVALID_CREDENTIALS_MESSAGE = "That email address and password do not match.";

/**
 * A JSON object body, or null when the request did not carry one.
 *
 * A non-object body (`null`, `[]`, `"a string"`) becomes `{}` rather than
 * null: it parsed, so it is a validation problem and the validator will name
 * the missing fields. Only unparseable input is a 400.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const raw: unknown = await request.json();
    return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  } catch {
    return null;
  }
}

type Preflight =
  | { ok: true; config: AuthConfig; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/**
 * Cross-site check, configuration, and a parsed JSON body — or the response to
 * return instead.
 *
 * Ordered so the cheapest rejection happens first and so nothing is parsed on
 * behalf of a request that was never allowed to make one.
 */
export async function preflight(request: Request): Promise<Preflight> {
  if (isCrossSite(request)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  const config = getAuthConfig();
  if (!config) {
    return {
      ok: false,
      response: NextResponse.json({ error: AUTH_UNAVAILABLE_MESSAGE }, { status: 503 }),
    };
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return { ok: false, response: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }

  return { ok: true, config, body };
}

type AuthenticatedRequest =
  | { ok: true; config: AuthConfig; session: UserSession; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

/**
 * The same preamble for the endpoints that act on an existing session.
 *
 * `preflight` cannot serve these: an endpoint under `/api/account` needs to
 * know *who* is calling, and answers 401 rather than 503 when it cannot tell.
 * The session is re-read here even though middleware has already checked it,
 * for the audit S5 reason — the matcher is maintained by hand, and this is
 * what fails closed the day it stops covering a path.
 */
export async function requireApiSession(request: Request): Promise<AuthenticatedRequest> {
  if (isCrossSite(request)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  const config = getAuthConfig();
  const session = await getSession();
  if (!config || !session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Please sign in." }, { status: 401 }),
    };
  }

  const body = await readJsonBody(request);
  if (body === null) {
    return { ok: false, response: NextResponse.json({ error: "Invalid request." }, { status: 400 }) };
  }

  return { ok: true, config, session, body };
}

/**
 * A failure nobody anticipated: a reference the caller can quote, the detail
 * only in the log.
 *
 * The reference is the correlation id audit B2 asked for, placed where it does
 * the most good — minted only when something failed, shown to the person it
 * failed for, and written into the captured event, so "it said reference
 * K3F9QW2A" resolves to exactly one log line.
 */
export function unexpectedFailure(
  err: unknown,
  event: string,
  action = "complete that",
): NextResponse {
  const reference = newReference();
  captureException(err, { event, reference });
  return NextResponse.json(
    {
      error:
        `We could not ${action} just now, and nothing has changed. ` +
        `Please try again in a moment, quoting reference ${reference}.`,
      reference,
    },
    { status: 503 },
  );
}

/** A 429 that names the wait and is never cached. */
export function rateLimited(resetAt: number): NextResponse {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "retry-after": String(retryAfterSeconds(resetAt)),
        "cache-control": "no-store",
      },
    },
  );
}

/**
 * Where the links in Supabase's emails point.
 *
 * Built from the configured site origin — never from the request's `Host`
 * header. A password-reset link whose origin came from the request is the
 * host-header injection bug: an attacker sends `Host: evil.example` to the
 * reset endpoint, the victim receives a genuine email from the real sender
 * with a link to the attacker's domain, and clicking it hands over a token
 * that resets their password.
 *
 * This origin must also be listed in the project's redirect allow-list, or
 * Supabase refuses to use it. See AUTHENTICATION.md.
 */
export function emailRedirectUrl(next?: string): string {
  const target = absoluteUrl("/auth/confirm");
  return next ? `${target}?next=${encodeURIComponent(next)}` : target;
}

/**
 * Shared handler for the two endpoints that send a message to an address the
 * caller supplied: password recovery, and re-sending a confirmation link.
 *
 * They are one function because the interesting behaviour is identical and it
 * is the behaviour that is easy to get wrong: **the response never varies**.
 * Same status, same body, whether the address has an account, has one that is
 * already confirmed, or has never been seen. An endpoint that answers
 * differently for a registered address is a list of every customer, readable
 * by anyone with a script.
 *
 * That includes failure. An upstream error is captured and the caller is still
 * told the message is on its way, because "we could not send that" for one
 * address and success for another is the same disclosure by another route. The
 * cost is a person who never receives an email and is not told why; the
 * captured event is what makes that visible to an operator rather than
 * invisible to everyone.
 */
export async function handleAuthEmailRequest(
  request: Request,
  opts: { event: string; send: (config: AuthConfig, email: string) => Promise<void> },
): Promise<NextResponse> {
  const pre = await preflight(request);
  if (!pre.ok) return pre.response;
  const { config, body } = pre;

  const byAddress = await checkTiers(clientKey(request.headers, ""), AUTH_EMAIL_TIERS);
  if (!byAddress.ok) return rateLimited(byAddress.resetAt);

  const result = validateEmailOnly(body);
  // A malformed address is a typo, not an enumeration attempt — nothing is
  // disclosed by saying so, and a silent success would leave the person
  // waiting for mail that was never going to arrive.
  if (!result.success) return NextResponse.json({ errors: result.errors }, { status: 422 });

  const byAccount = await checkTiers(
    `:${await accountBucket(result.data.email, config.secret)}`,
    AUTH_EMAIL_ACCOUNT_TIERS,
  );
  if (!byAccount.ok) return rateLimited(byAccount.resetAt);

  try {
    await opts.send(config, result.data.email);
  } catch (err) {
    captureException(err, { event: opts.event, severity: "warning" });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Field errors we are willing to relay, keyed by GoTrue's machine-readable
 * code — never by its message text or its status.
 *
 * Branching on the status was wrong and was removed: GoTrue answers 422 for a
 * weak password, for an address it considers invalid, *and* for sign-ups being
 * switched off in the dashboard. Mapping the status meant an operator who had
 * disabled registration sent every visitor a permanent, confident instruction
 * to choose a stronger password. The code is the only part of that response
 * with a stable meaning.
 *
 * The password wording names both things a caller can do about it, because we
 * cannot see which one the project's own policy is asking for: our validator
 * has already enforced twelve characters, so reaching this means Supabase is
 * applying a complexity rule this application has no way to read.
 */
const GOTRUE_FIELD_ERRORS: Record<string, { field: string; message: string }> = {
  weak_password: {
    field: "password",
    message: "That password was rejected. Try a longer one, or mix in numbers and symbols.",
  },
  email_address_invalid: {
    field: "email",
    message: "That email address was not accepted. Check it and try again.",
  },
};

/**
 * Turn a failed GoTrue exchange into a response.
 *
 * Three outcomes, and the default is the safe one. A fault the caller can fix
 * is reported against the field it belongs to. An upstream 429 is passed
 * through as a 429, because Supabase's own limiter is telling us something
 * true. Everything else — including a 4xx we do not recognise — becomes a 503
 * with a reference and no detail: GoTrue's message text is written for a
 * developer reading a log, and some of it distinguishes accounts that exist
 * from accounts that do not.
 */
export function goTrueFailure(err: unknown, event: string): NextResponse {
  if (err instanceof GoTrueError) {
    const known = err.code ? GOTRUE_FIELD_ERRORS[err.code] : undefined;
    if (known) {
      return NextResponse.json(
        { errors: { [known.field]: known.message } },
        { status: 422 },
      );
    }
    if (err.status === 429) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "cache-control": "no-store" } },
      );
    }
  }

  return unexpectedFailure(err, event);
}
