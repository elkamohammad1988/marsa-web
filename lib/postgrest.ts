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
  /**
   * A signed-in user's access token, sent as the bearer credential instead of
   * `key` while `key` stays the `apikey` header.
   *
   * This is what makes Row Level Security apply. `key` is the service-role
   * key, which bypasses RLS — correct for the submissions pipeline, where
   * every row belongs to the operator and there is no user to act as. It is
   * exactly wrong for a customer's profile: with it, whether one customer can
   * read another's row would depend on a filter in a route handler rather than
   * on a policy in the database.
   *
   * When a token is set, `key` is the *anon* key (see `lib/auth-config.ts`),
   * so a request that somehow loses its token has no privilege to fall back on.
   */
  token?: string;
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

/**
 * `AbortSignal.timeout`, not a hand-rolled `AbortController` cleared in
 * `finally` (audit B9).
 *
 * `finally` runs when `fetch()` resolves — that is, when the *headers* arrive.
 * Every caller here then reads the body outside that scope (`res.json()`,
 * `res.text()`), so a response that stalled mid-body hung with no ceiling at
 * all: the timeout had already been cleared. `AbortSignal.timeout` stays armed
 * for the whole exchange, body included, which is the property the 8-second
 * budget was supposed to express.
 */
async function request(
  cfg: PostgrestConfig,
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  try {
    const res = await fetch(`${cfg.endpoint}${path}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.token ?? cfg.key}`,
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
    // A timeout arrives as a DOMException named TimeoutError rather than
    // AbortError, and its default message ("The operation was aborted due to
    // timeout") does not say how long was allowed — which is the first thing
    // anyone reading the log wants to know.
    const reason =
      err instanceof Error && err.name === "TimeoutError"
        ? `no response within ${TIMEOUT_MS}ms`
        : err instanceof Error
          ? err.message
          : String(err);
    throw new PostgrestError(`PostgREST request failed: ${reason}`);
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

/**
 * Patch the rows a filter selects. Returns the first stored row, or null.
 *
 * Null is a real answer rather than an error: under Row Level Security a row
 * the caller may not touch simply is not there to update, and PostgREST
 * reports that as an empty result with a 200. Callers must not read null as
 * "it worked".
 */
export async function updateRow<T>(
  cfg: PostgrestConfig,
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<T | null> {
  const res = await request(cfg, `/${table}?${query}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: { Prefer: "return=representation" },
  });
  const rows = (await res.json()) as T[];
  return rows[0] ?? null;
}

/**
 * Delete the rows a filter selects. Returns how many were actually removed.
 *
 * The count is the point, and it is why this asks for a representation it then
 * only measures. A `DELETE` matching nothing is a 200 with an empty body —
 * indistinguishable, without the count, from one that removed the row. The two
 * outcomes must not be conflated here: an erasure request answered "done" when
 * nothing was deleted is the failure mode that matters, and under Row Level
 * Security or a mistyped id it is the likely one.
 *
 * A `query` is required rather than defaulted. PostgREST executes an unfiltered
 * `DELETE /table` as "delete every row", so an optional filter would make a
 * forgotten argument silently mean the whole table. Callers pass a filter or do
 * not call this.
 */
export async function deleteRows(
  cfg: PostgrestConfig,
  table: string,
  query: string,
): Promise<number> {
  if (!query) throw new PostgrestError(`refusing an unfiltered DELETE on ${table}`);

  const res = await request(cfg, `/${table}?${query}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
  const rows = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(rows) ? rows.length : 0;
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

/**
 * PostgREST wildcard escaping for `ilike` filters.
 *
 * `*` is included because PostgREST translates it into SQL's `%` — without it,
 * an admin searching for `acme*corp` got a wildcard match instead of a literal
 * one (audit S8). There is no injection risk either way: `encodeURIComponent`
 * at the call site neutralises `&` and `=`, so no extra query parameter can be
 * smuggled in. This is about the search returning what was asked for.
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_,()*]/g, " ").trim();
}
