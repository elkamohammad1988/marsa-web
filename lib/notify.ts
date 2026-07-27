import { siteConfig } from "@/lib/site";
import { captureException } from "@/lib/observability";
import type { StoredSubmission, SubmissionKind } from "@/lib/storage";

/**
 * Outbound notification for new submissions.
 *
 * Notification is a side effect layered on top of storage, never a substitute
 * for it: the submission is already durably stored by the time this runs, so a
 * mail failure is logged and swallowed rather than surfaced to the visitor.
 *
 * Uses the Resend REST API directly (no SDK dependency). Disabled — silently
 * and safely — when RESEND_API_KEY / RESEND_FROM are not configured.
 */

const EMAIL_SUBJECTS: Record<SubmissionKind, string> = {
  subscribe: "New newsletter subscriber",
  lead: "New account lead",
  contact: "New contact enquiry",
};

const NOTIFY_TIMEOUT_MS = 8000;

export type NotifierConfig = { apiKey: string; from: string; to: string };

export function getNotifierConfig(
  env: Record<string, string | undefined> = process.env,
): NotifierConfig | null {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM;
  // `to` used to fall back to a hard-coded support address. With that default
  // removed, an unset RESEND_TO leaves nobody to send to — which is a
  // misconfiguration, not a reason to post mail into the void.
  const to = env.RESEND_TO ?? siteConfig.email.support;
  if (!apiKey || !from || !to) return null;
  return { apiKey, from, to };
}

/** Render a submission as a plain-text notification email (subject + body). */
export function formatSubmissionEmail(submission: StoredSubmission): {
  subject: string;
  text: string;
} {
  const rows = Object.entries(submission.data)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${k}: ${String(v)}`);

  const subject = `[${siteConfig.name}] ${EMAIL_SUBJECTS[submission.kind]}`;
  const text = [
    EMAIL_SUBJECTS[submission.kind],
    "",
    ...rows,
    "",
    `Received: ${submission.createdAt}`,
    `Reference: ${submission.id}`,
  ].join("\n");

  return { subject, text };
}

/**
 * Send the notification. Returns whether it was delivered — callers use this
 * for observability only; it must never change the visitor-facing result.
 */
export async function notifySubmission(
  submission: StoredSubmission,
  config: NotifierConfig | null = getNotifierConfig(),
): Promise<{ sent: boolean }> {
  if (!config) return { sent: false };

  const { subject, text } = formatSubmissionEmail(submission);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        subject,
        text,
        reply_to: typeof submission.data.email === "string" ? submission.data.email : undefined,
      }),
      // Armed for the whole exchange rather than cleared once headers arrive
      // (audit B9). This one runs *after* the visitor's submission is already
      // stored, so an unbounded hang here delays a response the visitor is
      // waiting on for a side effect they do not depend on.
      signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return { sent: true };
  } catch (err) {
    // Warning, not error: the submission is already durably stored, so nothing
    // is lost. What is lost is the *notification* — nobody is told a lead
    // arrived — and with no alert on this, "we stopped getting emails" is
    // noticed weeks later by absence.
    captureException(err, {
      event: "notify.send",
      severity: "warning",
      kind: submission.kind,
      submissionId: submission.id,
      recoverable: "the record is stored and retrievable from /admin",
    });
    return { sent: false };
  }
}
