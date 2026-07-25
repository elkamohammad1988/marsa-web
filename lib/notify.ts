import { siteConfig } from "@/lib/site";
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

export type NotifierConfig = { apiKey: string; from: string; to: string };

export function getNotifierConfig(
  env: Record<string, string | undefined> = process.env,
): NotifierConfig | null {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from, to: env.RESEND_TO ?? siteConfig.email.support };
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
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
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    return { sent: true };
  } catch (err) {
    console.warn(
      `[notify] could not email ${submission.kind} ${submission.id}; it is stored and can be retrieved from /admin.`,
      err instanceof Error ? err.message : err,
    );
    return { sent: false };
  } finally {
    clearTimeout(timeout);
  }
}
