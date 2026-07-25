import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatSubmissionEmail,
  getNotifierConfig,
  notifySubmission,
} from "@/lib/notify";
import type { StoredSubmission } from "@/lib/storage";

const lead: StoredSubmission = {
  id: "abc123",
  kind: "lead",
  createdAt: "2026-07-23T10:00:00.000Z",
  data: { name: "Jane Doe", email: "jane@acme.com", accountType: "business", company: "" },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("formatSubmissionEmail", () => {
  it("builds a subject and body, skipping empty fields", () => {
    const { subject, text } = formatSubmissionEmail(lead);
    expect(subject).toBe("[Marsa] New account lead");
    expect(text).toContain("name: Jane Doe");
    expect(text).toContain("email: jane@acme.com");
    expect(text).not.toContain("company:"); // empty value filtered out
    expect(text).toContain("Reference: abc123");
  });
});

describe("getNotifierConfig", () => {
  it("stays disabled unless both the key and sender are set", () => {
    expect(getNotifierConfig({})).toBeNull();
    expect(getNotifierConfig({ RESEND_API_KEY: "re_x" })).toBeNull();
    expect(getNotifierConfig({ RESEND_FROM: "a@b.com" })).toBeNull();
  });

  it("defaults the recipient to the support address", () => {
    const cfg = getNotifierConfig({ RESEND_API_KEY: "re_x", RESEND_FROM: "a@b.com" });
    expect(cfg).toEqual({ apiKey: "re_x", from: "a@b.com", to: "support@marsa.money" });
  });
});

describe("notifySubmission", () => {
  it("does nothing when notifications are not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await notifySubmission(lead, null)).toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the notification to Resend", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await notifySubmission(lead, {
      apiKey: "re_secret",
      from: "Marsa <noreply@marsa.money>",
      to: "team@marsa.money",
    });

    expect(result).toEqual({ sent: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_secret");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.to).toEqual(["team@marsa.money"]);
    expect(body.reply_to).toBe("jane@acme.com");
  });

  it("swallows delivery failures — the submission is already stored", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500 })),
    );
    const result = await notifySubmission(lead, {
      apiKey: "re_secret",
      from: "a@b.com",
      to: "team@marsa.money",
    });
    expect(result).toEqual({ sent: false });
  });
});
