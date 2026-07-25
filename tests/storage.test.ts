import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
// Type-only: erased at compile time, so it cannot trigger module evaluation
// before DATA_DIR is set below.
import type { StoredSubmission, SubmissionStore } from "@/lib/storage";

// DATA_DIR is read when lib/storage is first imported, so it has to be set
// before the dynamic import below — hence top-level await rather than a plain
// static import.
const TMP_DIR = path.join(os.tmpdir(), `marsa-storage-${process.pid}-${Date.now()}`);
process.env.DATA_DIR = TMP_DIR;

const { createStore, FileSubmissionStore, PostgresSubmissionStore, searchText } =
  await import("@/lib/storage");

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
  it("uses the file store when no database is configured", () => {
    expect(createStore({})).toBeInstanceOf(FileSubmissionStore);
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
});

describe("searchText", () => {
  it("flattens submitted values into a lowercase haystack", () => {
    expect(searchText(lead)).toBe("jane doe jane@acme.com business ");
  });
});

describe("FileSubmissionStore", () => {
  it("persists, lists, filters and counts submissions", async () => {
    const store = new FileSubmissionStore();

    expect(await store.save(lead)).toEqual({ persisted: true });
    expect(await store.save(contact)).toEqual({ persisted: true });

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

  it("skips corrupted lines instead of failing the whole read", async () => {
    await fs.appendFile(path.join(TMP_DIR, "lead.jsonl"), "{not json}\n", "utf8");
    const store = new FileSubmissionStore();
    const page = await store.list({ kind: "lead" });
    expect(page.total).toBe(1);
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

    const fallback: SubmissionStore = {
      provider: "file",
      durable: false,
      save: vi.fn(async () => ({ persisted: true })),
      list: vi.fn(async () => ({ items: [], total: 0 })),
      stats: vi.fn(async () => ({
        total: 0,
        byKind: { lead: 0, contact: 0, subscribe: 0 },
        last7Days: 0,
      })),
      health: vi.fn(async () => ({ ok: true })),
    };

    const store = new PostgresSubmissionStore(cfg, fallback);
    expect(await store.save(lead)).toEqual({ persisted: true });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/submissions");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.id).toBe("abc123");
    expect(body.kind).toBe("lead");
    expect(body.search).toContain("jane@acme.com");
    expect(fallback.save).not.toHaveBeenCalled();
  });

  it("never loses a submission when the database rejects the insert", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => "boom",
        headers: new Headers(),
      })),
    );
    const saved: StoredSubmission[] = [];
    const fallback: SubmissionStore = {
      provider: "file",
      durable: false,
      save: async (s) => {
        saved.push(s);
        return { persisted: true };
      },
      list: async () => ({ items: [], total: 0 }),
      stats: async () => ({
        total: 0,
        byKind: { lead: 0, contact: 0, subscribe: 0 },
        last7Days: 0,
      }),
      health: async () => ({ ok: true }),
    };

    const store = new PostgresSubmissionStore(cfg, fallback);
    expect(await store.save(lead)).toEqual({ persisted: true });
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("abc123");
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

    const store = new PostgresSubmissionStore(cfg, new FileSubmissionStore());
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
    const store = new PostgresSubmissionStore(cfg, new FileSubmissionStore());
    const health = await store.health();
    expect(health.ok).toBe(false);
    expect(health.detail).toContain("ECONNREFUSED");
  });
});
