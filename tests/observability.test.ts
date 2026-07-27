import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  captureException,
  consoleReporter,
  newReference,
  redact,
  setReporter,
  type CapturedEvent,
} from "@/lib/observability";

/**
 * Audit B2. The seam matters less than two properties of it:
 *
 *   1. it can never break the request it is observing, because every call site
 *      sits in a `catch` that has already decided the visitor should not be
 *      affected; and
 *   2. it can never forward personal data, because the capture sites deal in
 *      submission ids and error bodies and one careless
 *      `captureException(err, { submission })` would start posting names and
 *      email addresses to a third-party service.
 */

const captured: CapturedEvent[] = [];
let restore: ReturnType<typeof setReporter>;

beforeEach(() => {
  captured.length = 0;
  restore = setReporter((event) => captured.push(event));
});

afterEach(() => {
  setReporter(restore);
  vi.restoreAllMocks();
});

describe("captureException", () => {
  it("reports an Error with its name, message and a bounded stack", () => {
    captureException(new TypeError("boom"), { event: "test.site" });

    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      event: "test.site",
      severity: "error",
      name: "TypeError",
      message: "boom",
    });
    expect(captured[0].stack!.length).toBeLessThanOrEqual(2000);
    expect(Date.parse(captured[0].timestamp)).not.toBeNaN();
  });

  it("survives a value that is not an Error", () => {
    captureException("plain string", { event: "test.site" });
    captureException({ weird: true }, { event: "test.site" });

    expect(captured.map((e) => e.message)).toEqual(["plain string", '{"weird":true}']);
  });

  it("defaults to error and accepts warning", () => {
    captureException(new Error("a"), { event: "a" });
    captureException(new Error("b"), { event: "b", severity: "warning" });

    expect(captured.map((e) => e.severity)).toEqual(["error", "warning"]);
  });

  it("never throws when the reporter does", () => {
    setReporter(() => {
      throw new Error("the reporter is the thing that is broken");
    });

    // If this throws, a failed storage write becomes a 500 instead of the
    // handled 503 the caller intended — observability breaking the request.
    expect(() => captureException(new Error("original"), { event: "x" })).not.toThrow();
  });

  it("collects loose options into the context", () => {
    captureException(new Error("x"), { event: "storage.write", kind: "lead", attempt: 2 });
    expect(captured[0].context).toEqual({ kind: "lead", attempt: 2 });
  });
});

describe("redact", () => {
  it("removes anything whose key reads as personal or secret", () => {
    expect(
      redact({
        kind: "lead",
        email: "someone@example.com",
        name: "Jordan Rivera",
        SUPABASE_SERVICE_ROLE_KEY: "sb_secret_…",
        userAgent: "Mozilla/5.0",
        ipAddress: "203.0.113.4",
      }),
    ).toEqual({
      kind: "lead",
      email: "[redacted]",
      name: "[redacted]",
      SUPABASE_SERVICE_ROLE_KEY: "[redacted]",
      userAgent: "Mozilla/5.0",
      ipAddress: "[redacted]",
    });
  });

  it("reaches into nested objects", () => {
    expect(redact({ submission: { id: "abc", email: "a@b.co" } })).toEqual({
      submission: { id: "abc", email: "[redacted]" },
    });
  });

  it("applies to everything that reaches a reporter", () => {
    captureException(new Error("x"), { event: "e", email: "a@b.co", kind: "lead" });
    expect(captured[0].context).toEqual({ email: "[redacted]", kind: "lead" });
  });
});

describe("the default reporter", () => {
  it("writes one parseable line, routed by severity", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    consoleReporter({
      event: "storage.write",
      severity: "error",
      message: "disk full",
      context: { kind: "lead" },
      timestamp: "2026-07-26T00:00:00.000Z",
    });
    consoleReporter({
      event: "notify.send",
      severity: "warning",
      message: "smtp down",
      context: {},
      timestamp: "2026-07-26T00:00:00.000Z",
    });

    expect(error).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();

    const line = error.mock.calls[0][0] as string;
    expect(line).not.toContain("\n");
    expect(JSON.parse(line)).toMatchObject({ event: "storage.write", severity: "error" });
  });
});

describe("newReference", () => {
  it("is 8 characters from an alphabet with no lookalikes", () => {
    // Read aloud on the phone, retyped from a screenshot: 0/O and 1/I/L are
    // where a support reference stops resolving to one log line.
    for (let i = 0; i < 50; i++) {
      const reference = newReference();
      expect(reference).toHaveLength(8);
      expect(reference).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 200 }, newReference));
    expect(seen.size).toBe(200);
  });
});

describe("no failure path logs straight to the console any more", () => {
  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(path.join(process.cwd(), dir))) {
      const rel = path.join(dir, entry);
      if (statSync(path.join(process.cwd(), rel)).isDirectory()) out.push(...sourceFiles(rel));
      else if (/\.tsx?$/.test(entry)) out.push(rel);
    }
    return out;
  }

  /**
   * Two console calls survive on purpose and are named here so the exemption
   * is a decision rather than an oversight:
   *
   * - `lib/storage.ts` echoes the submission itself when a write fails. That
   *   is the last-resort recovery record, it contains personal data, and it
   *   must stay in the platform's own logs rather than being forwarded to a
   *   third-party error service.
   * - `lib/env.ts` prints a multi-line, human-readable configuration report at
   *   startup in development. In production the same condition throws.
   *
   * `lib/observability.ts` is exempt for the obvious reason: it *is* the
   * console reporter.
   */
  const ALLOWED = new Set(
    ["lib/storage.ts", "lib/env.ts", "lib/observability.ts"].flatMap((p) => [
      p,
      p.replace(/\//g, "\\"),
    ]),
  );

  it.each(
    [...sourceFiles("app"), ...sourceFiles("lib")].filter((f) => !ALLOWED.has(f)),
  )("%s reports failures through the seam", (file) => {
    const source = readFileSync(path.join(process.cwd(), file), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(source).not.toMatch(/console\.(error|warn)\s*\(/);
  });
});
