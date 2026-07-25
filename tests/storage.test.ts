import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
// Type-only: erased at compile time, so it cannot trigger module evaluation
// before DATA_DIR is set below.
import type { StoredSubmission } from "@/lib/storage";

// DATA_DIR is read when lib/storage is first imported, so it has to be set
// before the dynamic import below — hence top-level await rather than a plain
// static import.
const TMP_DIR = path.join(os.tmpdir(), `marsa-storage-${process.pid}-${Date.now()}`);
process.env.DATA_DIR = TMP_DIR;

const {
  createStore,
  FileSubmissionStore,
  PostgresSubmissionStore,
  StorageConfigError,
  StorageWriteError,
  searchText,
} = await import("@/lib/storage");

const lead: StoredSubmission = {
  id: "abc123",
  kind: "lead",
  createdAt: "2026-07-23T10:00:00.000Z",
  data: { name: "Jane Doe", email: "jane@acme.com", accountType: "business", company: "" },
};

const contact: StoredSubmission = {
  id: "def456",
  kind: "contact",
  createdAt: "2026-07-24T09:00:00.000Z",
  data: { name: "Karim B", email: "karim@shop.ma", topic: "support" },
};

const pgEnv = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

beforeAll(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  await fs.rm(TMP_DIR, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createStore — provider selection", () => {
  it("uses the file store when no database is configured (development)", () => {
    expect(createStore({})).toBeInstanceOf(FileSubmissionStore);
    expect(createStore({ NODE_ENV: "development" })).toBeInstanceOf(FileSubmissionStore);
  });

  it("requires BOTH the url and the service key to use postgres", () => {
    expect(createStore({ SUPABASE_URL: pgEnv.SUPABASE_URL })).toBeInstanceOf(FileSubmissionStore);
    expect(
      createStore({ SUPABASE_SERVICE_ROLE_KEY: pgEnv.SUPABASE_SERVICE_ROLE_KEY }),
    ).toBeInstanceOf(FileSubmissionStore);
  });

  it("uses postgres when both are set", () => {
    expect(createStore(pgEnv)).toBeInstanceOf(PostgresSubmissionStore);
  });

  it("marks only the database provider as durable", () => {
    expect(createStore({}).durable).toBe(false);
    expect(createStore(pgEnv).durable).toBe(true);
  });

  it("refuses to build a non-durable store in production, naming the variables", () => {
    expect(() => createStore({ NODE_ENV: "production" })).toThrow(StorageConfigError);
    expect(() => createStore({ NODE_ENV: "production" })).toThrow(/SUPABASE_URL/);
    expect(() => createStore({ NODE_ENV: "production" })).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("refuses in production when only half the pair is set", () => {
    expect(() =>
      createStore({ NODE_ENV: "production", SUPABASE_URL: pgEnv.SUPABASE_URL }),
    ).toThrow(StorageConfigError);
  });

  it("is satisfied in production once both variables are present", () => {
    expect(createStore({ ...pgEnv, NODE_ENV: "production" })).toBeInstanceOf(
      PostgresSubmissionStore,
    );
  });
});

describe("searchText", () => {
  it("flattens submitted values into a lowercase haystack", () => {
    expect(searchText(lead)).toBe("jane doe jane@acme.com business ");
  });
});

describe("FileSubmissionStore", () => {
  it("persists, lists, filters and counts submissions", async () => {
    const store = new FileSubmissionStore();

    await expect(store.save(lead)).resolves.toBeUndefined();
    await expect(store.save(contact)).resolves.toBeUndefined();

    const all = await store.list();
    expect(all.total).toBe(2);
    // Newest first.
    expect(all.items[0].id).toBe("def456");

    const leadsOnly = await store.list({ kind: "lead" });
    expect(leadsOnly.total).toBe(1);
    expect(leadsOnly.items[0].data.email).toBe("jane@acme.com");

    const searched = await store.list({ q: "KARIM" });
    expect(searched.total).toBe(1);
    expect(searched.items[0].id).toBe("def456");

    const stats = await store.stats();
    expect(stats.total).toBe(2);
    expect(stats.byKind).toEqual({ lead: 1, contact: 1, subscribe: 0 });

    const health = await store.health();
    expect(health.ok).toBe(true);
  });

  it("paginates", async () => {
    const store = new FileSubmissionStore();
    const page = await store.list({ limit: 1, offset: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it("throws instead of reporting success when the write fails", async () => {
    // A directory where `subscribe.jsonl` should be makes appendFile fail with
    // EISDIR, standing in for the read-only filesystem of a serverless deploy.
    await fs.mkdir(path.join(TMP_DIR, "subscribe.jsonl"), { recursive: true });
    const store = new FileSubmissionStore();
    const subscribe: StoredSubmission = {
      id: "ghi789",
      kind: "subscribe",
      createdAt: "2026-07-25T09:00:00.000Z",
      data: { email: "nina@example.com" },
    };

    await expect(store.save(subscribe)).rejects.toBeInstanceOf(StorageWriteError);

    await fs.rm(path.join(TMP_DIR, "subscribe.jsonl"), { recursive: true, force: true });
  });

  it("skips corrupted lines instead of failing the whole read", async () => {
    await fs.appendFile(path.join(TMP_DIR, "lead.jsonl"), "{not json}\n", "utf8");
    const store = new FileSubmissionStore();
    const page = await store.list({ kind: "lead" });
    expect(page.total).toBe(1);
  });

  it("does not put the absolute data directory path in the health detail", async () => {
    // Previously `writing to ${DATA_DIR}`, returned verbatim by the
    // unauthenticated /api/health, describing the server's filesystem (S2).
    const health = await new FileSubmissionStore().health();

    expect(health.ok).toBe(true);
    expect(health.detail).toBe("file store writable");
    expect(health.detail).not.toContain(TMP_DIR);
    expect(health.detail).not.toContain(path.sep);
  });
});

describe("PostgresSubmissionStore", () => {
  const cfg = { endpoint: "https://project.supabase.co/rest/v1", key: "service-key" };

  it("inserts a flattened row including the search column", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 201,
      text: async () => "[]",
      json: async () => [{ id: lead.id }],
      headers: new Headers(),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new PostgresSubmissionStore(cfg);
    await expect(store.save(lead)).resolves.toBeUndefined();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/submissions");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.id).toBe("abc123");
    expect(body.kind).toBe("lead");
    expect(body.search).toContain("jane@acme.com");
  });

  it("throws rather than silently falling back when the database rejects the insert", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => "boom",
        headers: new Headers(),
      })),
    );

    const store = new PostgresSubmissionStore(cfg);
    await expect(store.save(lead)).rejects.toBeInstanceOf(StorageWriteError);
  });

  it("throws when the table does not exist yet on a fresh project", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 404,
        text: async () =>
          '{"code":"PGRST205","message":"Could not find the table \'public.submissions\'"}',
        headers: new Headers(),
      })),
    );

    const store = new PostgresSubmissionStore(cfg);
    await expect(store.save(lead)).rejects.toBeInstanceOf(StorageWriteError);
  });

  it("does not leak the database response body in the thrown error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () =>
          '{"code":"23514","message":"violates check constraint submissions_kind_check"}',
        headers: new Headers(),
      })),
    );

    const store = new PostgresSubmissionStore(cfg);
    await expect(store.save(lead)).rejects.toThrow(
      /^database insert failed for lead submission abc123$/,
    );
  });

  it("builds a filtered, paginated query and reads the total from Content-Range", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => [
        { id: "1", kind: "lead", created_at: "2026-07-23T10:00:00Z", data: {}, meta: null },
      ],
      text: async () => "",
      headers: new Headers({ "content-range": "0-0/42" }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const store = new PostgresSubmissionStore(cfg);
    const page = await store.list({ kind: "lead", q: "acme", limit: 10, offset: 20 });

    expect(page.total).toBe(42);
    expect(page.items[0].createdAt).toBe("2026-07-23T10:00:00Z");

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("kind=eq.lead");
    expect(url).toContain("limit=10");
    expect(url).toContain("offset=20");
    expect(url).toContain("search=ilike.*acme*");
    expect(url).toContain("order=created_at.desc");
  });

  it("reports unhealthy rather than throwing when the database is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const store = new PostgresSubmissionStore(cfg);
    const health = await store.health();
    expect(health.ok).toBe(false);
  });

  it("does not put the upstream error text in the health detail", async () => {
    // /api/health is unauthenticated. A PostgrestError message carries the HTTP
    // status, the table name and up to 300 characters of the response body,
    // which for Postgres errors names columns, constraints and hints (S2).
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 400,
        text: async () =>
          '{"code":"42703","message":"column submissions.secret_column does not exist"}',
        headers: new Headers(),
      })),
    );
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const health = await new PostgresSubmissionStore(cfg).health();

    expect(health.ok).toBe(false);
    expect(health.detail).toBe("database unreachable");
    expect(health.detail).not.toContain("secret_column");
    expect(health.detail).not.toContain("submissions");
    expect(health.detail).not.toContain("42703");

    // Removed from the caller's view, not discarded.
    expect(error.mock.calls.flat().map(String).join(" ")).toContain("secret_column");
  });
});
