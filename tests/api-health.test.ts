import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { setReporter, type CapturedEvent } from "@/lib/observability";

/**
 * /api/health is unauthenticated, so what it says is what any stranger can
 * read. Audit finding S2: it returned the absolute DATA_DIR path, raw
 * PostgREST error bodies (carrying table, column and constraint names) and the
 * FX provider's HTTP status — free reconnaissance before authenticating to
 * anything.
 *
 * These assert the property that matters: whatever goes wrong inside, the
 * response body carries nothing but booleans.
 */

const TMP_DIR = path.join(os.tmpdir(), `marsa-health-${process.pid}-${Date.now()}`);
process.env.DATA_DIR = TMP_DIR;

const { GET } = await import("@/app/api/health/route");

type HealthBody = {
  status: string;
  checks: Record<string, Record<string, unknown>>;
  tookMs: number;
  timestamp: string;
};

/** Every check name the endpoint reports. */
const CHECK_NAMES = ["storage", "fx", "notifications", "admin", "database"];

function stubFxOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ amount: 1, base: "EUR", date: "2026-07-24", rates: { USD: 1.09 } }),
      text: async () => "",
      headers: new Headers(),
    })),
  );
}

beforeAll(async () => {
  await fs.mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  await fs.rm(TMP_DIR, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("GET /api/health — response shape", () => {
  it("reports 200 and ok when every dependency is working", async () => {
    stubFxOk();
    const res = await GET();
    const body = (await res.json()) as HealthBody;

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
  });

  it("exposes exactly two booleans per check and nothing else", async () => {
    stubFxOk();
    const body = (await (await GET()).json()) as HealthBody;

    expect(Object.keys(body.checks).sort()).toEqual([...CHECK_NAMES].sort());

    for (const [name, check] of Object.entries(body.checks)) {
      expect(Object.keys(check).sort(), `check "${name}"`).toEqual(["configured", "ok"]);
      expect(typeof check.ok, `check "${name}".ok`).toBe("boolean");
      expect(typeof check.configured, `check "${name}".configured`).toBe("boolean");
    }
  });

  it("never includes free-text detail, the provider name or the durability flag", async () => {
    stubFxOk();
    const body = (await (await GET()).json()) as HealthBody;

    for (const check of Object.values(body.checks)) {
      expect(check).not.toHaveProperty("detail");
      expect(check).not.toHaveProperty("provider");
      expect(check).not.toHaveProperty("durable");
    }
  });

  it("sets no-store so a monitor is never served a stale verdict", async () => {
    stubFxOk();
    const res = await GET();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("GET /api/health — failure disclosure", () => {
  it("returns 503 when a dependency is failing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED 203.0.113.9:443");
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET();
    const body = (await res.json()) as HealthBody;

    expect(res.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.fx.ok).toBe(false);
  });

  it("does not leak the upstream failure reason into the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED 203.0.113.9:443");
      }),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const raw = await (await GET()).text();

    expect(raw).not.toContain("ECONNREFUSED");
    expect(raw).not.toContain("203.0.113.9");
  });

  it("does not leak the server filesystem path in any state", async () => {
    stubFxOk();
    const raw = await (await GET()).text();

    // The absolute DATA_DIR path was previously returned verbatim as
    // `writing to ${DATA_DIR}`.
    expect(raw).not.toContain(TMP_DIR);
    expect(raw.toLowerCase()).not.toContain(os.tmpdir().toLowerCase());
  });

  it("reports the real reason server-side so an operator can still diagnose it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED 203.0.113.9:443");
      }),
    );

    // Asserted at the observability seam rather than at `console.error`: the
    // point of S2 is that the reason is *removed from the response, not
    // discarded*, and the seam is where "not discarded" now means something.
    const captured: CapturedEvent[] = [];
    const restore = setReporter((event) => captured.push(event));
    try {
      await GET();
    } finally {
      setReporter(restore);
    }

    const fx = captured.find((e) => e.event === "health.fx");
    expect(fx, "no health.fx event was captured").toBeDefined();
    expect(fx!.message).toContain("ECONNREFUSED");
  });
});
