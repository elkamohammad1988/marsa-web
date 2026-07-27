import { describe, it, expect, vi, afterEach } from "vitest";
import { PostgresSubmissionStore } from "@/lib/storage";
import { createAnalyticsStore } from "@/lib/analytics";
import { setReporter, type CapturedEvent } from "@/lib/observability";

/**
 * Audit B3 and B4: aggregation moved out of Node and into Postgres.
 *
 * The behaviour that matters to a reader of /admin is that the numbers are
 * right and the page still renders against a database that has not had
 * migration 003 applied yet — so both the RPC path and the fallback are
 * asserted, along with the correctness bug the RPC exists to fix.
 */

const CFG = { endpoint: "https://project.supabase.co/rest/v1", key: "service-key" };
const PG_ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

/** Route fetches by URL so one mock can serve an RPC and a table read. */
function stubRoutes(handlers: Record<string, () => unknown>, missing: string[] = []) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const key = Object.keys(handlers).find((k) => String(url).includes(k));
      if (missing.some((m) => String(url).includes(m))) {
        return {
          ok: false,
          status: 404,
          text: async () =>
            '{"code":"PGRST202","message":"Could not find the function in the schema cache"}',
          json: async () => ({}),
          headers: new Headers(),
        };
      }
      const body = key ? handlers[key]() : [];
      return {
        ok: true,
        status: 200,
        json: async () => body,
        text: async () => JSON.stringify(body),
        headers: new Headers({ "content-range": "0-0/0" }),
      };
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("B4 — admin stats in one round trip", () => {
  it("reads all four numbers from submission_stats()", async () => {
    stubRoutes({
      "rpc/submission_stats": () => [{ lead: 7, contact: 3, subscribe: 11, last_7_days: 5 }],
    });

    const stats = await new PostgresSubmissionStore(CFG).stats();

    expect(stats).toEqual({
      total: 21,
      byKind: { lead: 7, contact: 3, subscribe: 11 },
      last7Days: 5,
    });
  });

  it("makes exactly one request where it used to make four", async () => {
    stubRoutes({
      "rpc/submission_stats": () => [{ lead: 1, contact: 1, subscribe: 1, last_7_days: 1 }],
    });

    await new PostgresSubmissionStore(CFG).stats();

    expect((globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("still renders against a database without migration 003", async () => {
    // The admin dashboard must not break because a migration has not been run.
    stubRoutes({}, ["rpc/submission_stats"]);

    const stats = await new PostgresSubmissionStore(CFG).stats();

    expect(stats.byKind).toEqual({ lead: 0, contact: 0, subscribe: 0 });
  });

  it("names the migration to run when it falls back", async () => {
    const captured: CapturedEvent[] = [];
    const restore = setReporter((event) => captured.push(event));
    stubRoutes({}, ["rpc/submission_stats"]);

    try {
      await new PostgresSubmissionStore(CFG).stats();
    } finally {
      setReporter(restore);
    }

    const degraded = captured.find((e) => e.event === "storage.stats.degraded");
    expect(degraded, "no degradation event was captured").toBeDefined();
    expect(degraded!.severity).toBe("warning");
    expect(String(degraded!.context.remedy)).toContain("003_aggregate_functions.sql");
  });
});

describe("B3 — funnel aggregation is exact at any volume", () => {
  it("builds the report from per-step session counts", async () => {
    stubRoutes({
      "rpc/demo_funnel": () => [
        { step: "start", sessions: 100 },
        { step: "kyc", sessions: 80 },
        { step: "iban", sessions: 60 },
        { step: "payout", sessions: 40 },
        { step: "convert", sessions: 30 },
        { step: "done", sessions: 25 },
      ],
    });

    const report = await createAnalyticsStore(PG_ENV).funnel();

    expect(report.starts).toBe(100);
    expect(report.completions).toBe(25);
    expect(report.completionRate).toBe(25);
    expect(report.rows).toHaveLength(6);
  });

  it("cannot report a completion rate above 100%", async () => {
    // The bug the RPC exists to fix: the old query kept the most RECENT 20,000
    // rows, dropping early sessions' 'start' events while retaining their later
    // steps — so starts undercounted and completions/starts could exceed 1.
    // Counting distinct sessions per step in Postgres cannot produce that.
    stubRoutes({
      "rpc/demo_funnel": () => [
        { step: "start", sessions: 500 },
        { step: "done", sessions: 500 },
      ],
    });

    const report = await createAnalyticsStore(PG_ENV).funnel();

    expect(report.completionRate).toBeLessThanOrEqual(100);
  });

  it("treats a step absent from the result as zero, not as missing", async () => {
    // Postgres omits a step nobody reached; the report still needs all six rows.
    stubRoutes({ "rpc/demo_funnel": () => [{ step: "start", sessions: 10 }] });

    const report = await createAnalyticsStore(PG_ENV).funnel();

    expect(report.rows).toHaveLength(6);
    expect(report.completions).toBe(0);
    expect(report.rows.map((r) => r.step)).toContain("done");
  });

  it("falls back to the row scan when demo_funnel() is absent", async () => {
    stubRoutes({ demo_events: () => [] }, ["rpc/demo_funnel"]);

    const report = await createAnalyticsStore(PG_ENV).funnel();

    expect(report.starts).toBe(0);
    expect(report.rows).toHaveLength(6);
  });
});
