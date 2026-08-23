import { createServer, type Server } from "node:http";

/**
 * A PostgREST stand-in, in-process, for the smoke suite.
 *
 * ── Why a stub rather than a real database ─────────────────────────────────
 * The admin area is the half of this application with the most to go wrong —
 * listing, filtering, searching, paginating, exporting and erasing — and none
 * of it renders at all without a store. `createStore()` refuses to build the
 * file store when `NODE_ENV=production`, which `next start` sets, so a smoke
 * run against a credential-free server can only ever reach the "not
 * configured" state. That state is worth testing and is tested; it is not the
 * one customers use.
 *
 * The alternative — pointing CI at a real Supabase project — buys nothing this
 * does not, and costs a shared mutable database that every concurrent run
 * fights over, a credential in CI, and a suite that goes red when someone
 * else's migration lands. This speaks the same wire protocol over the same
 * `fetch`, so `lib/postgrest.ts` is genuinely exercised: the `Content-Range`
 * parsing, the `Prefer` headers, the `ilike` filter, the `id=eq.` delete and
 * its representation count are all real code paths here, not mocks of them.
 *
 * ── What it is not ────────────────────────────────────────────────────────
 * Not a Postgres. It does not enforce Row Level Security, constraints or
 * types, and it must never be read as evidence that the policies in
 * `db/migrations/` are correct — `tests/migrations.test.ts` is what asserts
 * those, from the SQL itself. This exists so the *application* can be driven
 * end to end, nothing more.
 */

export type StubRow = {
  id: string;
  kind: "lead" | "contact" | "subscribe";
  created_at: string;
  data: Record<string, unknown>;
  meta: Record<string, unknown> | null;
  search: string;
};

export type PostgrestStub = {
  /** Origin to hand the application as `SUPABASE_URL`. */
  url: string;
  /** Current rows, newest first — the assertion surface for a test. */
  rows(): StubRow[];
  /** Replace the whole dataset. Called between tests for isolation. */
  seed(rows: StubRow[]): void;
  /** Every request path the application has made, for asserting on traffic. */
  calls(): string[];
  /** Force the next `n` requests to fail with a 500, to drive the error path. */
  failNext(n: number): void;
  close(): Promise<void>;
};

/** `?a=b&c=d` → Map. PostgREST filters arrive as ordinary query parameters. */
function params(rawUrl: string): URLSearchParams {
  return new URL(rawUrl, "http://stub.invalid").searchParams;
}

/** `eq.abc` → `abc`; anything else → null. */
function eqValue(filter: string | null): string | null {
  return filter?.startsWith("eq.") ? filter.slice(3) : null;
}

/** `ilike.*needle*` → `needle`, lowercased. */
function ilikeValue(filter: string | null): string | null {
  if (!filter?.startsWith("ilike.")) return null;
  return decodeURIComponent(filter.slice(6)).replaceAll("*", "").toLowerCase();
}

export function makeRow(over: Partial<StubRow> & Pick<StubRow, "id">): StubRow {
  const data = over.data ?? { name: `Person ${over.id}`, email: `${over.id}@example.invalid` };
  return {
    kind: "lead",
    created_at: "2026-01-01T00:00:00.000Z",
    meta: null,
    ...over,
    data,
    search: Object.values(data).join(" ").toLowerCase(),
  };
}

export async function startPostgrestStub(): Promise<PostgrestStub> {
  let rows: StubRow[] = [];
  const calls: string[] = [];
  let failures = 0;

  const server: Server = createServer(async (req, res) => {
    const path = req.url ?? "/";
    calls.push(`${req.method} ${path}`);

    const send = (status: number, body: unknown, headers: Record<string, string> = {}) => {
      const text = body === undefined ? "" : JSON.stringify(body);
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        ...headers,
      });
      // A HEAD response carries the headers and no body, which is exactly what
      // `countRows` relies on — it reads the total from `Content-Range`.
      res.end(req.method === "HEAD" ? undefined : text);
    };

    if (failures > 0) {
      failures -= 1;
      return send(500, { message: "stubbed failure" });
    }

    // The service-role key is what the application must present. Checking it
    // means a route that forgets to send credentials fails here rather than
    // passing by accident.
    if (!req.headers.apikey) return send(401, { message: "no apikey" });

    /*
     * `getPostgrestConfig` builds its endpoint as `${SUPABASE_URL}/rest/v1`,
     * so every request arrives under that prefix. Matching bare `/submissions`
     * answered 404 to all of them — which nothing noticed, because until this
     * file had a caller the mismatch was unreachable. Stripping the prefix
     * here rather than mounting the routes under it keeps the route table
     * readable and keeps the assertion surface (`calls()`) showing the paths
     * the application really asked for.
     */
    const [route] = path.replace(/^\/rest\/v1/, "").split("?");

    /* ------------------------------------------------------------ RPCs -- */

    if (route === "/rpc/submission_stats") {
      const count = (k: string) => rows.filter((r) => r.kind === k).length;
      return send(200, [
        {
          lead: count("lead"),
          contact: count("contact"),
          subscribe: count("subscribe"),
          last_7_days: 0,
        },
      ]);
    }

    if (route === "/rpc/demo_funnel") {
      return send(200, []);
    }

    if (route === "/rpc/check_rate_limit") {
      // Always under the limit. Rate-limit *behaviour* is asserted by the unit
      // suite against the real algorithm; a smoke run that tripped a limiter
      // partway through would be the definition of a flaky test.
      return send(200, 1000);
    }

    /* ------------------------------------------------------ submissions -- */

    if (route === "/submissions") {
      const q = params(path);

      if (req.method === "POST") {
        let raw = "";
        for await (const chunk of req) raw += chunk;
        const row = JSON.parse(raw) as StubRow;
        rows = [row, ...rows];
        return send(201, [row]);
      }

      if (req.method === "DELETE") {
        const id = eqValue(q.get("id"));
        const removed = rows.filter((r) => r.id === id);
        rows = rows.filter((r) => r.id !== id);
        // `deleteRows` counts the representation, so returning the removed rows
        // is what makes "deleted" distinguishable from "matched nothing".
        return send(200, removed);
      }

      // GET / HEAD — filter, then order, then window.
      let matched = rows;
      const kind = eqValue(q.get("kind"));
      if (kind) matched = matched.filter((r) => r.kind === kind);
      const needle = ilikeValue(q.get("search"));
      if (needle) matched = matched.filter((r) => r.search.includes(needle));

      matched = [...matched].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

      const total = matched.length;
      const offset = Number(q.get("offset") ?? 0);
      const limit = Number(q.get("limit") ?? total);
      const window = matched.slice(offset, offset + limit);

      return send(200, window, {
        "content-range": `${offset}-${Math.max(offset, offset + window.length - 1)}/${total}`,
      });
    }

    return send(404, { message: `stub has no route for ${route}` });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "string" || address === null) throw new Error("stub did not bind a port");

  return {
    url: `http://127.0.0.1:${address.port}`,
    rows: () => [...rows],
    seed: (next) => {
      rows = [...next];
      calls.length = 0;
    },
    calls: () => [...calls],
    failNext: (n) => {
      failures = n;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
