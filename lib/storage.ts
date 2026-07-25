import { promises as fs } from "node:fs";
import path from "node:path";
import {
  countRows,
  escapeLike,
  getPostgrestConfig,
  insertRow,
  selectRows,
  type PostgrestConfig,
} from "@/lib/postgrest";

/**
 * Submission storage.
 *
 * Two providers, chosen by the environment:
 *   • PostgreSQL (Supabase, or any PostgREST endpoint) when SUPABASE_URL and
 *     SUPABASE_SERVICE_ROLE_KEY are set — the production path: durable,
 *     queryable, and shared across serverless instances.
 *   • Newline-delimited JSON under DATA_DIR — the zero-config path for LOCAL
 *     DEVELOPMENT ONLY, so `npm run dev` works with no credentials at all.
 *
 * Both implement the same read side (`list`, `stats`), so the admin screens do
 * not care which one is live. Email notification is deliberately NOT a storage
 * provider: sending mail is a side effect (see lib/notify.ts), and a store that
 * only emails is a store that loses data.
 *
 * ── The storage contract ────────────────────────────────────────────────────
 * `save()` resolves ONLY when the submission is durably stored. Any other
 * outcome throws `StorageWriteError`. There is deliberately no "accepted but
 * not persisted" result: that value existed before, the API forwarded it
 * honestly, and the client ignored it — so visitors were shown "Application
 * received" for leads that only ever reached a log line.
 *
 * The two rules that follow from it:
 *   1. The database store does NOT fall back to disk. A fallback write on a
 *      serverless instance is either impossible (read-only filesystem) or
 *      worse than useless — a row on one container's ephemeral disk that
 *      /admin cannot see and a redeploy erases, reported as success.
 *   2. Production without a configured database is a configuration error, not
 *      a degraded mode. `createStore` refuses to build a non-durable store
 *      when NODE_ENV is production, naming the variables that are missing.
 */

export type SubmissionKind = "subscribe" | "lead" | "contact";

export const SUBMISSION_KINDS: SubmissionKind[] = ["lead", "contact", "subscribe"];

export function isSubmissionKind(value: string): value is SubmissionKind {
  return (SUBMISSION_KINDS as string[]).includes(value);
}

export type StoredSubmission = {
  id: string;
  kind: SubmissionKind;
  createdAt: string;
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

export type SubmissionQuery = {
  kind?: SubmissionKind;
  /** Free-text match across the submitted values. */
  q?: string;
  limit?: number;
  offset?: number;
};

export type SubmissionPage = { items: StoredSubmission[]; total: number };

export type SubmissionStats = {
  total: number;
  byKind: Record<SubmissionKind, number>;
  last7Days: number;
};

/**
 * Thrown when a submission could not be stored. The `message` is safe to log
 * but is NEVER sent to the browser: callers translate it into a fixed,
 * non-revealing string (see lib/api-forms.ts). `cause` carries the underlying
 * error — database body, filesystem errno — for server-side diagnosis only.
 */
export class StorageWriteError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "StorageWriteError";
  }
}

/** Thrown when the environment cannot produce a durable store in production. */
export class StorageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigError";
  }
}

export interface SubmissionStore {
  /** Provider name, surfaced by /api/health and the admin UI. */
  readonly provider: string;
  /** True when submissions survive a redeploy. */
  readonly durable: boolean;
  /**
   * Persist a submission. Resolves only once the record is durably stored;
   * throws `StorageWriteError` otherwise. Never resolves for a write that did
   * not happen.
   */
  save(submission: StoredSubmission): Promise<void>;
  list(query?: SubmissionQuery): Promise<SubmissionPage>;
  stats(): Promise<SubmissionStats>;
  /** Cheap reachability probe for the health endpoint. */
  health(): Promise<{ ok: boolean; detail?: string }>;
}

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const TABLE = "submissions";

/** Flatten a submission's values into one searchable string. */
export function searchText(submission: StoredSubmission): string {
  return Object.values(submission.data)
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v))
    .join(" ")
    .toLowerCase();
}

function withinLastDays(iso: string, days: number, now = Date.now()): boolean {
  const t = Date.parse(iso);
  return Number.isFinite(t) && now - t <= days * 86_400_000;
}

function emptyByKind(): Record<SubmissionKind, number> {
  return { lead: 0, contact: 0, subscribe: 0 };
}

/* ------------------------------------------------------------------ file -- */

export class FileSubmissionStore implements SubmissionStore {
  readonly provider = "file";
  readonly durable = false;

  async save(submission: StoredSubmission): Promise<void> {
    const line = `${JSON.stringify(submission)}\n`;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.appendFile(path.join(DATA_DIR, `${submission.kind}.jsonl`), line, "utf8");
    } catch (err) {
      // A read-only or unwritable DATA_DIR means the record does not exist
      // anywhere. Log it so it is recoverable from the platform logs, then
      // throw — the visitor must not be told this succeeded.
      console.error(
        `[storage] could not write ${submission.kind} submission ${submission.id} to ${DATA_DIR}.`,
        err instanceof Error ? err.message : err,
      );
      console.info(`[submission:${submission.kind}]`, line.trim());
      throw new StorageWriteError(
        `file store could not write ${submission.kind} submission ${submission.id}`,
        err,
      );
    }
  }

  private async readKind(kind: SubmissionKind): Promise<StoredSubmission[]> {
    try {
      const raw = await fs.readFile(path.join(DATA_DIR, `${kind}.jsonl`), "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .flatMap((line) => {
          try {
            return [JSON.parse(line) as StoredSubmission];
          } catch {
            return []; // skip a corrupted line rather than failing the page
          }
        });
    } catch {
      return [];
    }
  }

  private async readAll(kind?: SubmissionKind): Promise<StoredSubmission[]> {
    const kinds = kind ? [kind] : SUBMISSION_KINDS;
    const batches = await Promise.all(kinds.map((k) => this.readKind(k)));
    return batches
      .flat()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
  }

  async list(query: SubmissionQuery = {}): Promise<SubmissionPage> {
    const { kind, q, limit = 50, offset = 0 } = query;
    let items = await this.readAll(kind);
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((s) => searchText(s).includes(needle));
    }
    return { items: items.slice(offset, offset + limit), total: items.length };
  }

  async stats(): Promise<SubmissionStats> {
    const items = await this.readAll();
    const byKind = emptyByKind();
    let last7Days = 0;
    for (const item of items) {
      if (item.kind in byKind) byKind[item.kind] += 1;
      if (withinLastDays(item.createdAt, 7)) last7Days += 1;
    }
    return { total: items.length, byKind, last7Days };
  }

  async health(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      return { ok: true, detail: "file store writable" };
    } catch (err) {
      // The real reason embeds the absolute DATA_DIR path, which describes the
      // server's filesystem layout to anyone who can reach /api/health. Log it
      // where an operator can read it; return a fixed string (audit S2).
      console.error(
        "[storage] file store health check failed.",
        err instanceof Error ? err.message : err,
      );
      return { ok: false, detail: "file store not writable" };
    }
  }
}

/* -------------------------------------------------------------- postgres -- */

type SubmissionRow = {
  id: string;
  kind: SubmissionKind;
  created_at: string;
  data: Record<string, unknown>;
  meta: Record<string, unknown> | null;
};

function rowToSubmission(row: SubmissionRow): StoredSubmission {
  return {
    id: row.id,
    kind: row.kind,
    createdAt: row.created_at,
    data: row.data ?? {},
    meta: row.meta ?? undefined,
  };
}

export class PostgresSubmissionStore implements SubmissionStore {
  readonly provider = "postgres";
  readonly durable = true;

  constructor(private readonly cfg: PostgrestConfig) {}

  async save(submission: StoredSubmission): Promise<void> {
    try {
      await insertRow<SubmissionRow>(this.cfg, TABLE, {
        id: submission.id,
        kind: submission.kind,
        created_at: submission.createdAt,
        data: submission.data,
        meta: submission.meta ?? null,
        search: searchText(submission),
      });
    } catch (err) {
      // No fallback to disk. On a serverless instance that write either fails
      // outright or lands on an ephemeral container the admin cannot read and
      // a redeploy erases — reporting either as success is how leads went
      // missing. Log the real reason (table missing, RLS rejection, timeout)
      // and let the caller turn it into a visible error.
      //
      // The full error text can include the PostgREST response body, so it is
      // logged server-side only and never carried to the browser.
      console.error(
        `[storage] database insert failed for ${submission.kind} ${submission.id}.`,
        err instanceof Error ? err.message : err,
      );
      console.info(`[submission:${submission.kind}]`, JSON.stringify(submission));
      throw new StorageWriteError(
        `database insert failed for ${submission.kind} submission ${submission.id}`,
        err,
      );
    }
  }

  async list(query: SubmissionQuery = {}): Promise<SubmissionPage> {
    const { kind, q, limit = 50, offset = 0 } = query;
    const params = [
      "select=id,kind,created_at,data,meta",
      "order=created_at.desc",
      `limit=${Math.max(1, Math.min(limit, 500))}`,
      `offset=${Math.max(0, offset)}`,
    ];
    if (kind) params.push(`kind=eq.${kind}`);
    if (q) {
      const needle = escapeLike(q).toLowerCase();
      if (needle) params.push(`search=ilike.*${encodeURIComponent(needle)}*`);
    }
    const { rows, total } = await selectRows<SubmissionRow>(this.cfg, TABLE, params.join("&"));
    return { items: rows.map(rowToSubmission), total };
  }

  async stats(): Promise<SubmissionStats> {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [lead, contact, subscribe, last7Days] = await Promise.all([
      countRows(this.cfg, TABLE, "kind=eq.lead"),
      countRows(this.cfg, TABLE, "kind=eq.contact"),
      countRows(this.cfg, TABLE, "kind=eq.subscribe"),
      countRows(this.cfg, TABLE, `created_at=gte.${since}`),
    ]);
    return {
      total: lead + contact + subscribe,
      byKind: { lead, contact, subscribe },
      last7Days,
    };
  }

  async health(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await countRows(this.cfg, TABLE);
      return { ok: true, detail: "database reachable" };
    } catch (err) {
      // A PostgrestError message carries the HTTP status, the table name and up
      // to 300 characters of the upstream response body — which for Postgres
      // errors includes column names, constraint names and hints. That is free
      // schema reconnaissance, so it is logged and never returned (audit S2).
      console.error(
        "[storage] database health check failed.",
        err instanceof Error ? err.message : err,
      );
      return { ok: false, detail: "database unreachable" };
    }
  }
}

/* ------------------------------------------------------------- selection -- */

export const MISSING_DB_CONFIG_MESSAGE =
  "Submission storage is not configured. Set SUPABASE_URL and " +
  "SUPABASE_SERVICE_ROLE_KEY (both are required; neither may be prefixed with " +
  "NEXT_PUBLIC_) and apply db/schema.sql to the project. Refusing to start with " +
  "a non-durable store in production, because form submissions would be lost.";

/**
 * Build a store from an environment. Pure and injectable for testing.
 *
 * Throws `StorageConfigError` in production when no database is configured.
 * Silently degrading to the file store is the bug this replaces: on a
 * read-only serverless filesystem it accepts submissions and drops them.
 */
export function createStore(
  env: Record<string, string | undefined> = process.env,
): SubmissionStore {
  const cfg = getPostgrestConfig(env);
  if (cfg) return new PostgresSubmissionStore(cfg);

  if (env.NODE_ENV === "production") {
    throw new StorageConfigError(MISSING_DB_CONFIG_MESSAGE);
  }

  // Local development only: zero-config, writes JSONL under DATA_DIR.
  return new FileSubmissionStore();
}

let store: SubmissionStore | null = null;

export function getStore(): SubmissionStore {
  if (!store) store = createStore();
  return store;
}

/** Collision-resistant id without pulling in a uuid dependency. */
export function newId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand}`;
}
