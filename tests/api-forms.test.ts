import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
// Type-only: erased at compile time, so it cannot trigger module evaluation
// before DATA_DIR is set below.
import type { SubmissionStore } from "@/lib/storage";
import { siteConfig } from "@/lib/site";

/**
 * The submission pipeline, asserted at the boundary the visitor actually
 * experiences: the HTTP response that drives the form's success or error
 * screen.
 *
 * The rule under test is the one this module exists to guarantee — a form only
 * ever shows "we have your details" for a submission that was durably stored.
 * Every storage failure must produce an error response instead, carrying a
 * message that is safe to render and tells the visitor what to do next.
 */

import os from "node:os";
import path from "node:path";

const TMP_DIR = path.join(os.tmpdir(), `marsa-api-forms-${process.pid}-${Date.now()}`);
process.env.DATA_DIR = TMP_DIR;

const { handleFormPost } = await import("@/lib/api-forms");
const storage = await import("@/lib/storage");
const notify = await import("@/lib/notify");
const validation = await import("@/lib/validation");

type Json = {
  ok?: boolean;
  persisted?: boolean;
  error?: string;
  errors?: Record<string, string>;
};

function postRequest(body: Record<string, unknown>): Request {
  return new Request("https://marsa.money/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": randomIp() },
    body: JSON.stringify(body),
  });
}

/**
 * A distinct client IP per request. `handleFormPost` rate-limits on
 * `clientKey(headers, scope)`, and the in-memory bucket map is module state
 * shared across every test in this file — without this, later cases would get
 * a 429 instead of the outcome under test.
 */
let ipCounter = 0;
function randomIp(): string {
  ipCounter += 1;
  return `203.0.113.${ipCounter % 250}`;
}

const validLead = {
  name: "Jane Doe",
  email: "jane@acme.com",
  accountType: "personal",
  country: "NL",
  consent: true,
};

const opts = {
  kind: "lead" as const,
  scope: "leads-test",
  limit: 1000,
  validate: validation.validateLead,
};

async function submit(body: Record<string, unknown> = validLead) {
  const res = await handleFormPost(postRequest(body), opts);
  const json = (await res.json()) as Json;
  return { status: res.status, json };
}

beforeAll(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  await fs.rm(TMP_DIR, { recursive: true, force: true });
});

/** Silence the deliberate server-side error logging these cases produce. */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  // Notifications are off unless a case turns them on.
  vi.spyOn(notify, "notifySubmission").mockResolvedValue({ sent: false });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("submission with no Supabase configuration", () => {
  /**
   * Drives the real `createStore` selection logic rather than a stand-in, so
   * these assertions fail if the production config gate is ever relaxed.
   */
  function useRealStoreFor(env: Record<string, string | undefined>) {
    vi.spyOn(storage, "getStore").mockImplementation(() => storage.createStore(env));
  }

  it("shows an error, not a success screen, when production has no database", async () => {
    useRealStoreFor({ NODE_ENV: "production" });

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.ok).toBeUndefined();
    expect(json.error).toBeTruthy();
  });

  it("also refuses when only half the variable pair is set", async () => {
    useRealStoreFor({ NODE_ENV: "production", SUPABASE_URL: "https://p.supabase.co" });

    const { status } = await submit();

    expect(status).toBe(503);
  });

  it("names the missing variables in the server-side message only", async () => {
    // The operator-facing text names the variables...
    expect(storage.MISSING_DB_CONFIG_MESSAGE).toMatch(/SUPABASE_URL/);
    expect(storage.MISSING_DB_CONFIG_MESSAGE).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);

    useRealStoreFor({ NODE_ENV: "production" });

    // ...but the visitor never sees them.
    const { json } = await submit();
    expect(json.error).not.toMatch(/SUPABASE/);
    expect(json.error).not.toMatch(/NEXT_PUBLIC/);
  });

  it("still accepts submissions in development, where the file store is legitimate", async () => {
    // The zero-config local path is preserved: `npm run dev` keeps working
    // with no credentials, and a successful JSONL write is a real write.
    useRealStoreFor({ NODE_ENV: "development" });

    const { status, json } = await submit();

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  it("errors when the development file write itself fails", async () => {
    // A directory sitting where `lead.jsonl` belongs makes the real appendFile
    // fail with EISDIR — the dev equivalent of a read-only serverless disk.
    // The preceding case wrote that path as a file, so clear it first.
    const leadPath = path.join(TMP_DIR, "lead.jsonl");
    await fs.rm(leadPath, { recursive: true, force: true });
    await fs.mkdir(leadPath, { recursive: true });
    useRealStoreFor({ NODE_ENV: "development" });

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.ok).toBeUndefined();
    expect(json.error).toMatch(/nothing has been recorded/i);
    // The server filesystem path must not travel to the browser.
    expect(json.error).not.toMatch(/EISDIR/);
    expect(json.error).not.toMatch(/jsonl/);

    await fs.rm(leadPath, { recursive: true, force: true });
  });
});

describe("submission where the database write throws", () => {
  const pgEnv = {
    NODE_ENV: "production",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
  };

  /**
   * A real `PostgresSubmissionStore` over a stubbed transport: exercises the
   * genuine insert path, error wrapping and the api-forms catch, so the whole
   * chain is under test rather than a hand-written throw.
   */
  function useRealPostgresWithFetch(fetchImpl: () => Promise<unknown>) {
    vi.stubGlobal("fetch", vi.fn(fetchImpl));
    vi.spyOn(storage, "getStore").mockImplementation(() => storage.createStore(pgEnv));
  }

  it("returns an error when the database rejects the insert (real store)", async () => {
    useRealPostgresWithFetch(async () => ({
      ok: false,
      status: 500,
      text: async () => "internal error",
      headers: new Headers(),
    }));

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.ok).toBeUndefined();
  });

  it("returns an error when the table is missing on a fresh project (real store)", async () => {
    useRealPostgresWithFetch(async () => ({
      ok: false,
      status: 404,
      text: async () =>
        '{"code":"PGRST205","message":"Could not find the table \'public.submissions\' in the schema cache"}',
      headers: new Headers(),
    }));

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.error).not.toMatch(/PGRST205/);
    expect(json.error).not.toMatch(/schema cache/);
  });

  it("returns an error when the network drops mid-insert (real store)", async () => {
    useRealPostgresWithFetch(async () => {
      throw new Error("ECONNREFUSED 10.0.0.1:443");
    });

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.error).not.toMatch(/ECONNREFUSED/);
  });

  it("confirms receipt when the real store's insert succeeds", async () => {
    useRealPostgresWithFetch(async () => ({
      ok: true,
      status: 201,
      json: async () => [{ id: "abc" }],
      text: async () => "[]",
      headers: new Headers(),
    }));

    const { status, json } = await submit();

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
  });

  function failingStore(err: Error): SubmissionStore {
    return {
      provider: "postgres",
      durable: true,
      save: vi.fn(async () => {
        throw err;
      }),
      list: async () => ({ items: [], total: 0 }),
      stats: async () => ({
        total: 0,
        byKind: { lead: 0, contact: 0, subscribe: 0 },
        last7Days: 0,
      }),
      health: async () => ({ ok: true }),
    };
  }

  it("returns an error the form renders instead of confirming receipt", async () => {
    vi.spyOn(storage, "getStore").mockReturnValue(
      failingStore(new storage.StorageWriteError("database insert failed")),
    );

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.ok).toBeUndefined();
    expect(json.persisted).toBeUndefined();
  });

  it("tells the visitor nothing was recorded and how to reach a human", async () => {
    vi.spyOn(storage, "getStore").mockReturnValue(
      failingStore(new storage.StorageWriteError("database insert failed")),
    );

    const { json } = await submit();

    expect(json.error).toMatch(/nothing has been recorded/i);
    expect(json.error).toMatch(/try again/i);

    // The message used to promise an alternative contact route unconditionally.
    // The support address now defaults to empty rather than to a mailbox on a
    // domain nobody owns, so the offer is made only when there is somewhere for
    // it to go — and never rendered as "email  and we will".
    if (siteConfig.email.support) {
      expect(json.error).toContain(siteConfig.email.support);
    } else {
      expect(json.error).not.toMatch(/email\s|@/);
    }
  });

  it("leaks no database internals, paths or stack traces to the browser", async () => {
    const leaky = new storage.StorageWriteError(
      'PostgREST 400 on /submissions: {"code":"23514","hint":"check constraint",' +
        '"details":"/var/task/lib/storage.js"}',
    );
    vi.spyOn(storage, "getStore").mockReturnValue(failingStore(leaky));

    const { json } = await submit();
    const shown = json.error ?? "";

    expect(shown).not.toMatch(/PostgREST/);
    expect(shown).not.toMatch(/23514/);
    expect(shown).not.toMatch(/submissions/);
    expect(shown).not.toMatch(/\/var\/task/);
    expect(shown).not.toMatch(/check constraint/);
  });

  it("surfaces an unexpected non-storage error the same safe way", async () => {
    vi.spyOn(storage, "getStore").mockReturnValue(
      failingStore(new TypeError("fetch failed: ECONNREFUSED 10.0.0.1:5432")),
    );

    const { status, json } = await submit();

    expect(status).toBe(503);
    expect(json.error).not.toMatch(/ECONNREFUSED/);
    expect(json.error).not.toMatch(/10\.0\.0\.1/);
  });
});

describe("submission where the write succeeds but the notification fails", () => {
  it("still shows success, because the record is safe", async () => {
    const save = vi.fn(async () => {});
    vi.spyOn(storage, "getStore").mockReturnValue({
      provider: "postgres",
      durable: true,
      save,
      list: async () => ({ items: [], total: 0 }),
      stats: async () => ({
        total: 0,
        byKind: { lead: 0, contact: 0, subscribe: 0 },
        last7Days: 0,
      }),
      health: async () => ({ ok: true }),
    });
    // The real notifier swallows its own failures; this asserts the pipeline
    // does not resurrect them as a visitor-facing error.
    vi.spyOn(notify, "notifySubmission").mockResolvedValue({ sent: false });

    const { status, json } = await submit();

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.error).toBeUndefined();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("stores before notifying, so a mail outage cannot precede the write", async () => {
    const order: string[] = [];
    vi.spyOn(storage, "getStore").mockReturnValue({
      provider: "postgres",
      durable: true,
      save: async () => {
        order.push("save");
      },
      list: async () => ({ items: [], total: 0 }),
      stats: async () => ({
        total: 0,
        byKind: { lead: 0, contact: 0, subscribe: 0 },
        last7Days: 0,
      }),
      health: async () => ({ ok: true }),
    });
    vi.spyOn(notify, "notifySubmission").mockImplementation(async () => {
      order.push("notify");
      return { sent: false };
    });

    await submit();

    expect(order).toEqual(["save", "notify"]);
  });
});

describe("happy path", () => {
  it("confirms receipt once the submission is durably stored", async () => {
    const saved: unknown[] = [];
    vi.spyOn(storage, "getStore").mockReturnValue({
      provider: "postgres",
      durable: true,
      save: async (s) => {
        saved.push(s);
      },
      list: async () => ({ items: [], total: 0 }),
      stats: async () => ({
        total: 0,
        byKind: { lead: 0, contact: 0, subscribe: 0 },
        last7Days: 0,
      }),
      health: async () => ({ ok: true }),
    });
    vi.spyOn(notify, "notifySubmission").mockResolvedValue({ sent: true });

    const { status, json } = await submit();

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    // Never reports a non-durable write on the success path — the client
    // treats `persisted: false` as an error, so a success must not carry it.
    expect(json.persisted).not.toBe(false);
    expect(saved).toHaveLength(1);
  });

  it("still rejects invalid input with field errors, unchanged", async () => {
    const { status, json } = await submit({ ...validLead, email: "not-an-email" });

    expect(status).toBe(422);
    expect(json.errors?.email).toBeTruthy();
    expect(json.ok).toBeUndefined();
  });
});
