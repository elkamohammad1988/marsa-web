/**
 * Minimal PostgREST client.
 *
 * The production database is plain PostgreSQL (Supabase, or any PostgREST
 * front end). Talking to it over HTTP rather than a TCP driver keeps the app
 * dependency-free and lets every route run on any runtime — at the cost of
 * having to spell out the query strings ourselves, which is what this module
 * is for.
 *
 * Nothing here throws on network failure silently: callers decide whether a
 * failure is fatal (admin screens) or should degrade to the file store
 * (public form posts).
 */

export type PostgrestConfig = {
  /** Base REST endpoint, e.g. https://xyz.supabase.co/rest/v1 */
  endpoint: string;
  /** Service role key — server-side only, never expose to the browser. */
  key: string;
};

const TIMEOUT_MS = 8000;

export function getPostgrestConfig(
  env: Record<string, string | undefined> = process.env,
): PostgrestConfig | null {
  const url = env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { endpoint: `${url}/rest/v1`, key };
}

export class PostgrestError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "PostgrestError";
  }
}

async function request(
  cfg: PostgrestConfig,
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.endpoint}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "content-type": "application/json",
        ...init.headers,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new PostgrestError(
        `PostgREST ${res.status} on ${path}${body ? `: ${body.slice(0, 300)}` : ""}`,
        res.status,
      );
    }
    return res;
  } catch (err) {
    if (err instanceof PostgrestError) throw err;
    const reason = err instanceof Error ? err.message : String(err);
    throw new PostgrestError(`PostgREST request failed: ${reason}`);
  } finally {
    clearTimeout(timeout);
  }
}

/** Insert one row. Returns the stored representation. */
export async function insertRow<T>(
  cfg: PostgrestConfig,
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  const res = await request(cfg, `/${table}`, {
    method: "POST",
    body: JSON.stringify(row),
    headers: { Prefer: "return=representation" },
  });
  const rows = (await res.json()) as T[];
  return rows[0];
}

/** `Content-Range: 0-24/1337` → 1337 */
function totalFromContentRange(header: string | null): number {
  const total = header?.split("/")[1];
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Select rows with an exact total count (for pagination). */
export async function selectRows<T>(
  cfg: PostgrestConfig,
  table: string,
  query: string,
): Promise<{ rows: T[]; total: number }> {
  const res = await request(cfg, `/${table}?${query}`, {
    headers: { Prefer: "count=exact" },
  });
  const rows = (await res.json()) as T[];
  return { rows, total: totalFromContentRange(res.headers.get("content-range")) };
}

/** Count rows matching a filter without transferring them. */
export async function countRows(
  cfg: PostgrestConfig,
  table: string,
  query = "",
): Promise<number> {
  const suffix = query ? `&${query}` : "";
  const res = await request(cfg, `/${table}?select=id${suffix}`, {
    method: "HEAD",
    headers: { Prefer: "count=exact", Range: "0-0" },
  });
  return totalFromContentRange(res.headers.get("content-range"));
}

/** Call a Postgres function. */
export async function rpc<T>(
  cfg: PostgrestConfig,
  fn: string,
  args: Record<string, unknown>,
): Promise<T> {
  const res = await request(cfg, `/rpc/${fn}`, {
    method: "POST",
    body: JSON.stringify(args),
  });
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** PostgREST wildcard escaping for `ilike` filters. */
export function escapeLike(value: string): string {
  return value.replace(/[%_,()]/g, " ").trim();
}
