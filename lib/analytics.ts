import { promises as fs } from "node:fs";
import path from "node:path";
import {
  countRows,
  getPostgrestConfig,
  insertRow,
  rpc,
  selectRows,
  type PostgrestConfig,
} from "@/lib/postgrest";

/**
 * First-party funnel analytics for the /demo flow.
 *
 * No third-party trackers, no cookies, no new dependencies. The client posts an
 * anonymous, random per-session id plus the funnel step it reached; we store it
 * (Postgres when configured, else a JSONL file) and aggregate by UNIQUE session
 * per step. Duplicate posts for the same (session, step) are therefore
 * idempotent for the funnel maths.
 *
 * This mirrors lib/storage.ts on purpose — same provider-selection shape — but
 * keeps demo telemetry in its own table/file so it never mixes with real leads.
 */

export const FUNNEL_STEPS = ["start", "kyc", "iban", "payout", "convert", "done"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export const FUNNEL_LABELS: Record<FunnelStep, string> = {
  start: "Started",
  kyc: "Verified (KYC)",
  iban: "Got IBAN",
  payout: "Received payout",
  convert: "Converted FX",
  done: "Completed",
};

export function isFunnelStep(value: unknown): value is FunnelStep {
  return typeof value === "string" && (FUNNEL_STEPS as readonly string[]).includes(value);
}

export type DemoEvent = { sessionId: string; step: FunnelStep; at: string };

export type FunnelRow = {
  step: FunnelStep;
  label: string;
  sessions: number;
  /** Share of sessions that started (0–100). */
  pctOfStart: number;
  /** Drop-off from the previous step (0–100). */
  dropPct: number;
};

export type FunnelReport = {
  starts: number;
  completions: number;
  completionRate: number;
  biggestDrop: { from: FunnelStep; to: FunnelStep; pct: number } | null;
  rows: FunnelRow[];
};

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Aggregate raw events into a funnel, counting UNIQUE sessions per step.
 * Pure and deterministic — the unit-tested core.
 */
export function computeFunnel(events: DemoEvent[]): FunnelReport {
  const perStep = new Map<FunnelStep, Set<string>>();
  for (const step of FUNNEL_STEPS) perStep.set(step, new Set());
  for (const e of events) {
    const set = perStep.get(e.step);
    if (set && e.sessionId) set.add(e.sessionId);
  }

  return buildFunnelReport(FUNNEL_STEPS.map((s) => perStep.get(s)!.size));
}

/**
 * Build the report from per-step unique-session counts, positionally aligned to
 * `FUNNEL_STEPS`.
 *
 * Split out from `computeFunnel` so Postgres can supply the counts directly
 * (audit B3). Counting distinct sessions is the only part that needed the raw
 * rows; the percentages and drop-offs never did.
 */
export function buildFunnelReport(counts: number[]): FunnelReport {
  const starts = counts[0];
  const completions = counts[counts.length - 1];

  let biggestDrop: FunnelReport["biggestDrop"] = null;
  const rows: FunnelRow[] = FUNNEL_STEPS.map((step, i) => {
    const sessions = counts[i];
    const prev = i === 0 ? sessions : counts[i - 1];
    const dropPct = prev > 0 ? round(((prev - sessions) / prev) * 100) : 0;
    if (i > 0 && dropPct > 0 && (biggestDrop === null || dropPct > biggestDrop.pct)) {
      biggestDrop = { from: FUNNEL_STEPS[i - 1], to: step, pct: dropPct };
    }
    return {
      step,
      label: FUNNEL_LABELS[step],
      sessions,
      pctOfStart: starts > 0 ? round((sessions / starts) * 100) : 0,
      dropPct,
    };
  });

  return {
    starts,
    completions,
    completionRate: starts > 0 ? round((completions / starts) * 100) : 0,
    biggestDrop,
    rows,
  };
}

/* ------------------------------------------------------------------ store -- */

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "demo-events.jsonl");
const TABLE = "demo_events";
const MAX_FETCH = 20_000;

export interface DemoAnalyticsStore {
  readonly provider: string;
  record(event: DemoEvent): Promise<void>;
  funnel(): Promise<FunnelReport>;
}

class FileDemoAnalyticsStore implements DemoAnalyticsStore {
  readonly provider = "file";

  async record(event: DemoEvent): Promise<void> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.appendFile(FILE, `${JSON.stringify(event)}\n`, "utf8");
    } catch (err) {
      // Telemetry must never break the demo — log and move on.
      console.warn("[analytics] could not persist demo event:", err instanceof Error ? err.message : err);
    }
  }

  private async readAll(): Promise<DemoEvent[]> {
    try {
      const raw = await fs.readFile(FILE, "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as DemoEvent];
          } catch {
            return [];
          }
        });
    } catch {
      return [];
    }
  }

  async funnel(): Promise<FunnelReport> {
    return computeFunnel(await this.readAll());
  }
}

type EventRow = { session_id: string; step: FunnelStep; created_at: string };

class PostgresDemoAnalyticsStore implements DemoAnalyticsStore {
  readonly provider = "postgres";

  constructor(
    private readonly cfg: PostgrestConfig,
    private readonly fallback: DemoAnalyticsStore,
  ) {}

  async record(event: DemoEvent): Promise<void> {
    try {
      await insertRow<EventRow>(this.cfg, TABLE, {
        session_id: event.sessionId,
        step: event.step,
        created_at: event.at,
      });
    } catch (err) {
      console.warn("[analytics] db insert failed; using fallback:", err instanceof Error ? err.message : err);
      await this.fallback.record(event);
    }
  }

  /**
   * Aggregate in Postgres, one round trip, exact at any volume (audit B3).
   *
   * The previous implementation pulled up to 20,000 rows over HTTP on every
   * page view and counted them in Node. Past 20,000 events it kept the most
   * RECENT rows, dropping early sessions' 'start' events while keeping their
   * later steps — so `starts` undercounted and completionRate could exceed
   * 100%, silently.
   *
   * Falls back to that row scan when `demo_funnel()` is not present, so a
   * database that has not had migration 003 applied still renders rather than
   * erroring. The fallback is the old behaviour, truncation included; the log
   * line is what tells an operator to run the migration.
   */
  async funnel(): Promise<FunnelReport> {
    try {
      const rows = await rpc<{ step: FunnelStep; sessions: number }[]>(
        this.cfg,
        "demo_funnel",
        {},
      );
      if (Array.isArray(rows)) {
        const bySt = new Map(rows.map((r) => [r.step, Number(r.sessions) || 0]));
        return buildFunnelReport(FUNNEL_STEPS.map((s) => bySt.get(s) ?? 0));
      }
    } catch (err) {
      console.warn(
        "[analytics] demo_funnel() unavailable; falling back to the row scan. " +
          "Apply db/migrations/003_aggregate_functions.sql.",
        err instanceof Error ? err.message : err,
      );
    }

    const { rows } = await selectRows<EventRow>(
      this.cfg,
      TABLE,
      `select=session_id,step,created_at&order=created_at.desc&limit=${MAX_FETCH}`,
    );
    return computeFunnel(
      rows.map((r) => ({ sessionId: r.session_id, step: r.step, at: r.created_at })),
    );
  }

  /** Cheap reachability probe (kept for parity / future health wiring). */
  async count(): Promise<number> {
    return countRows(this.cfg, TABLE);
  }
}

export function createAnalyticsStore(
  env: Record<string, string | undefined> = process.env,
): DemoAnalyticsStore {
  const file = new FileDemoAnalyticsStore();
  const cfg = getPostgrestConfig(env);
  return cfg ? new PostgresDemoAnalyticsStore(cfg, file) : file;
}

let store: DemoAnalyticsStore | null = null;
export function getAnalyticsStore(): DemoAnalyticsStore {
  if (!store) store = createAnalyticsStore();
  return store;
}
