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
 *   • Newline-delimited JSON under DATA_DIR otherwise — the zero-config local
 *     path, so `npm run dev` works with no credentials at all.
 *
 * Both implement the same read side (`list`, `stats`), so the admin screens do
 * not care which one is live. Email notification is deliberately NOT a storage
 * provider: sending mail is a side effect (see lib/notify.ts), and a store that
 * only emails is a store that loses data.
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

export interface SubmissionStore {
  /** Provider name, surfaced by /api/health and the admin UI. */
  readonly provider: string;
  /** True when submissions survive a redeploy. */
  readonly durable: boolean;
  save(submission: StoredSubmission): Promise<{ persisted: boolean }>;
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

  async save(submission: StoredSubmission): Promise<{ persisted: boolean }> {
    const line = `${JSON.stringify(submission)}\n`;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.appendFile(path.join(DATA_DIR, `${submission.kind}.jsonl`), line, "utf8");
      return { persisted: true };
    } catch (err) {
      // Read-only FS or permission issue — keep the record in the logs so it
      // is recoverable, and let the caller treat the submission as accepted.
      console.warn(
        `[storage] could not persist ${submission.kind} submission ${submission.id} to disk; logging instead.`,
        err instanceof Error ? err.message : err,
      );
      console.info(`[submission:${submission.kind}]`, line.trim());
      return { persisted: false };
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
      return { ok: true, detail: `writing to ${DATA_DIR}` };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "data dir not writable" };
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

  constructor(
    private readonly cfg: PostgrestConfig,
    private readonly fallback: SubmissionStore,
  ) {}

  async save(submission: StoredSubmission): Promise<{ persisted: boolean }> {
    try {
      await insertRow<SubmissionRow>(this.cfg, TABLE, {
        id: submission.id,
        kind: submission.kind,
        created_at: submission.createdAt,
        data: submission.data,
        meta: submission.meta ?? null,
        search: searchText(submission),
      });
      return { persisted: true };
    } catch (err) {
      // A database hiccup must never lose a lead: write it to disk/logs and
      // still report success to the visitor.
      console.error(
        `[storage] database insert failed for ${submission.kind} ${submission.id}; using fallback store.`,
        err instanceof Error ? err.message : err,
      );
      return this.fallback.save(submission);
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
      return { ok: true, detail: "postgres reachable" };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : "database unreachable" };
    }
  }
}

/* ------------------------------------------------------------- selection -- */

/** Build a store from an environment. Pure and injectable for testing. */
export function createStore(
  env: Record<string, string | undefined> = process.env,
): SubmissionStore {
  const file = new FileSubmissionStore();
  const cfg = getPostgrestConfig(env);
  return cfg ? new PostgresSubmissionStore(cfg, file) : file;
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
