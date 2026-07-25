import { NextResponse } from "next/server";
import { rateLimitShared, clientKey } from "@/lib/rate-limit";
import { getStore, newId, type SubmissionKind } from "@/lib/storage";
import { notifySubmission } from "@/lib/notify";
import { siteConfig } from "@/lib/site";
import type { ValidationResult } from "@/lib/validation";

/**
 * Shown verbatim to the visitor when a submission could not be stored.
 *
 * Deliberately says nothing about *why*: the underlying error can contain the
 * PostgREST response body (table and constraint names, upstream error text) or
 * a server filesystem path. Those go to the server log; the browser gets this
 * string and an action to take.
 */
const STORAGE_ERROR_MESSAGE =
  `We could not save your details just now, so nothing has been recorded. ` +
  `Please try again in a moment — or email ${siteConfig.email.support} and we will pick it up from there.`;

/**
 * Shared handler for the form-submission endpoints. Applies rate limiting, a
 * honeypot bot check, server-side validation (the source of truth), durable
 * storage, and then — only once the record is safe — an email notification.
 *
 * Returns a consistent JSON shape the client forms understand:
 * `{ ok: true }` on success, `{ errors }` (422) or `{ error }` (400/429/503)
 * on failure.
 *
 * `{ ok: true }` is returned only after `save()` has resolved, which it does
 * only for a durable write. A storage failure is a 503 with a generic message,
 * never a success the visitor would read as "we have your details".
 */
export async function handleFormPost<T extends Record<string, unknown>>(
  request: Request,
  opts: {
    kind: SubmissionKind;
    scope: string;
    limit?: number;
    validate: (input: Record<string, unknown>) => ValidationResult<T>;
  },
): Promise<NextResponse> {
  const rl = await rateLimitShared(clientKey(request.headers, opts.scope), {
    limit: opts.limit ?? 5,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.json();
    body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot: automated bots fill hidden fields humans never see. Pretend the
  // submission succeeded so the bot moves on, but persist nothing.
  if (typeof body.hp === "string" && body.hp.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const result = opts.validate(body);
  if (!result.success) {
    return NextResponse.json({ errors: result.errors }, { status: 422 });
  }

  const submission = {
    id: newId(),
    kind: opts.kind,
    createdAt: new Date().toISOString(),
    data: result.data,
    meta: {
      userAgent: request.headers.get("user-agent") ?? undefined,
      referer: request.headers.get("referer") ?? undefined,
    },
  };

  // Storage is the gate. `save()` resolves only for a durable write, and
  // `getStore()` throws when production is missing its database configuration
  // — both land here and become a visible error rather than a success screen.
  try {
    await getStore().save(submission);
  } catch (err) {
    console.error(
      `[api-forms] refusing to confirm ${opts.kind} submission ${submission.id}: storage failed.`,
      err instanceof Error ? `${err.name}: ${err.message}` : err,
    );
    return NextResponse.json({ error: STORAGE_ERROR_MESSAGE }, { status: 503 });
  }

  // Store first, notify second: the visitor's result never depends on email.
  // `notifySubmission` swallows its own failures by design — the record is
  // already safe, so a mail outage must not turn a stored lead into an error.
  await notifySubmission(submission);

  return NextResponse.json({ ok: true });
}
