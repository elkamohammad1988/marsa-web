import { NextResponse } from "next/server";
import { rateLimitShared, clientKey } from "@/lib/rate-limit";
import { getStore, newId, type SubmissionKind } from "@/lib/storage";
import { notifySubmission } from "@/lib/notify";
import type { ValidationResult } from "@/lib/validation";

/**
 * Shared handler for the form-submission endpoints. Applies rate limiting, a
 * honeypot bot check, server-side validation (the source of truth), durable
 * storage, and then — only once the record is safe — an email notification.
 *
 * Returns a consistent JSON shape the client forms understand:
 * `{ ok, persisted }` on success, `{ errors }` (422) or `{ error }` (400/429)
 * on failure.
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

  const { persisted } = await getStore().save(submission);

  // Store first, notify second: the visitor's result never depends on email.
  await notifySubmission(submission);

  return NextResponse.json({ ok: true, persisted });
}
