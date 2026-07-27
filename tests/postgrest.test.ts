import { describe, it, expect, vi, afterEach } from "vitest";
import {
  getPostgrestConfig,
  insertRow,
  selectRows,
  countRows,
  rpc,
  escapeLike,
  PostgrestError,
} from "@/lib/postgrest";

/**
 * `lib/postgrest.ts` is the single path between the app and the database, and
 * audit finding P5 recorded that it had no tests. The behaviours pinned here
 * are the ones other modules depend on: pagination totals read from
 * Content-Range, and failures arriving as a typed error carrying a status
 * rather than as an undefined value that reads as "no rows".
 */

const CFG = { endpoint: "https://project.supabase.co/rest/v1", key: "service-key" };

function response(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => [],
    text: async () => "",
    headers: new Headers(),
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPostgrestConfig", () => {
  it("builds the REST endpoint from the project URL", () => {
    const cfg = getPostgrestConfig({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    expect(cfg).toEqual({ endpoint: "https://project.supabase.co/rest/v1", key: "service-key" });
  });

  it("tolerates a trailing slash on the project URL", () => {
    const cfg = getPostgrestConfig({
      SUPABASE_URL: "https://project.supabase.co///",
      SUPABASE_SERVICE_ROLE_KEY: "service-key",
    });
    expect(cfg?.endpoint).toBe("https://project.supabase.co/rest/v1");
  });

  it("returns null unless BOTH variables are present", () => {
    expect(getPostgrestConfig({})).toBeNull();
    expect(getPostgrestConfig({ SUPABASE_URL: "https://project.supabase.co" })).toBeNull();
    expect(getPostgrestConfig({ SUPABASE_SERVICE_ROLE_KEY: "service-key" })).toBeNull();
    expect(
      getPostgrestConfig({ SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "service-key" }),
    ).toBeNull();
  });
});

describe("request headers", () => {
  it("sends the key as both apikey and bearer token, and asks for JSON", async () => {
    const fetchMock = vi.fn(async () => response({ json: async () => [{ id: "1" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await insertRow(CFG, "submissions", { id: "1" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(init.headers.apikey).toBe("service-key");
    expect(init.headers.Authorization).toBe("Bearer service-key");
    expect(init.headers["content-type"]).toBe("application/json");
  });

  it("never serves a cached response", async () => {
    const fetchMock = vi.fn(async () => response({ json: async () => [{ id: "1" }] }));
    vi.stubGlobal("fetch", fetchMock);

    await insertRow(CFG, "submissions", { id: "1" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.cache).toBe("no-store");
  });
});

describe("insertRow", () => {
  it("posts the row and returns the stored representation", async () => {
    const fetchMock = vi.fn(async () =>
      response({ status: 201, json: async () => [{ id: "abc", kind: "lead" }] }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const stored = await insertRow<{ id: string; kind: string }>(CFG, "submissions", {
      id: "abc",
      kind: "lead",
    });

    expect(stored).toEqual({ id: "abc", kind: "lead" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe("https://project.supabase.co/rest/v1/submissions");
    expect(init.method).toBe("POST");
    // Without this the response body is empty and the return value is undefined.
    expect(init.headers.Prefer).toBe("return=representation");
    expect(JSON.parse(String(init.body))).toEqual({ id: "abc", kind: "lead" });
  });
});

describe("selectRows — pagination totals", () => {
  async function totalFor(contentRange: string | null) {
    const headers = contentRange ? new Headers({ "content-range": contentRange }) : new Headers();
    vi.stubGlobal("fetch", vi.fn(async () => response({ json: async () => [], headers })));
    const { total } = await selectRows(CFG, "submissions", "select=*");
    return total;
  }

  it("reads the total from the Content-Range header", async () => {
    expect(await totalFor("0-24/1337")).toBe(1337);
  });

  it("reads a total of zero", async () => {
    expect(await totalFor("*/0")).toBe(0);
  });

  it("falls back to zero when the header is missing", async () => {
    expect(await totalFor(null)).toBe(0);
  });

  it("falls back to zero when the total is unknown or unparseable", async () => {
    expect(await totalFor("0-24/*")).toBe(0);
    expect(await totalFor("garbage")).toBe(0);
  });

  it("asks for an exact count and returns the rows", async () => {
    const fetchMock = vi.fn(async () =>
      response({
        json: async () => [{ id: "1" }, { id: "2" }],
        headers: new Headers({ "content-range": "0-1/2" }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { rows, total } = await selectRows<{ id: string }>(
      CFG,
      "submissions",
      "kind=eq.lead&limit=2",
    );

    expect(rows).toHaveLength(2);
    expect(total).toBe(2);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toBe("https://project.supabase.co/rest/v1/submissions?kind=eq.lead&limit=2");
    expect(init.headers.Prefer).toBe("count=exact");
  });
});

describe("countRows", () => {
  it("counts without transferring rows", async () => {
    const fetchMock = vi.fn(async () =>
      response({ headers: new Headers({ "content-range": "0-0/17" }) }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const total = await countRows(CFG, "submissions", "kind=eq.lead");

    expect(total).toBe(17);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    // HEAD plus a single-row Range: the body is never sent over the wire.
    expect(init.method).toBe("HEAD");
    expect(init.headers.Range).toBe("0-0");
    expect(init.headers.Prefer).toBe("count=exact");
    expect(url).toBe("https://project.supabase.co/rest/v1/submissions?select=id&kind=eq.lead");
  });

  it("omits the filter separator when there is no filter", async () => {
    const fetchMock = vi.fn(async () =>
      response({ headers: new Headers({ "content-range": "0-0/3" }) }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await countRows(CFG, "submissions");

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://project.supabase.co/rest/v1/submissions?select=id");
  });
});

describe("rpc", () => {
  it("posts the arguments and parses the returned value", async () => {
    const fetchMock = vi.fn(async () => response({ text: async () => "4" }));
    vi.stubGlobal("fetch", fetchMock);

    const remaining = await rpc<number>(CFG, "check_rate_limit", {
      p_key: "leads:203.0.113.7",
      p_limit: 5,
      p_window_seconds: 60,
    });

    expect(remaining).toBe(4);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/rpc/check_rate_limit");
    expect(init.method).toBe("POST");
  });

  it("returns null for an empty response body rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ text: async () => "" })));
    expect(await rpc(CFG, "noop", {})).toBeNull();
  });
});

describe("error handling", () => {
  it("wraps a non-2xx response in a PostgrestError carrying the status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ ok: false, status: 404, text: async () => "not found" })),
    );

    await expect(selectRows(CFG, "missing", "select=*")).rejects.toBeInstanceOf(PostgrestError);
    await expect(selectRows(CFG, "missing", "select=*")).rejects.toMatchObject({
      name: "PostgrestError",
      status: 404,
    });
  });

  it("names the status and path so a failure is diagnosable from the log", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ ok: false, status: 401, text: async () => "bad key" })),
    );

    await expect(rpc(CFG, "check_rate_limit", {})).rejects.toThrow(
      /PostgREST 401 on \/rpc\/check_rate_limit/,
    );
  });

  it("truncates a long upstream body instead of relaying all of it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ ok: false, status: 400, text: async () => "x".repeat(5_000) })),
    );

    const error = await selectRows(CFG, "submissions", "select=*").catch((e: Error) => e);
    expect(error).toBeInstanceOf(PostgrestError);
    // Prefix + 300 characters of body, not the full 5,000.
    expect((error as Error).message.length).toBeLessThan(400);
  });

  it("reports a network failure as a 502 rather than letting it escape untyped", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const error = await selectRows(CFG, "submissions", "select=*").catch((e: Error) => e);
    expect(error).toBeInstanceOf(PostgrestError);
    expect(error).toMatchObject({ status: 502 });
    expect((error as Error).message).toContain("ECONNREFUSED");
  });

  /**
   * Audit B9. The timeout used to be an `AbortController` cleared in a
   * `finally`, and `finally` runs when `fetch()` resolves — that is, when the
   * *headers* arrive. Every caller then reads the body outside that scope, so
   * a response that stalled mid-body had no ceiling at all.
   *
   * These drive the timeout by controlling the signal rather than by advancing
   * fake timers: `AbortSignal.timeout` is armed inside the runtime, not by a
   * JavaScript `setTimeout` that vitest can move.
   */
  describe("the 8-second budget", () => {
    /** Replaces the runtime timer with one the test can fire on demand. */
    function controllableTimeout() {
      const timer = new AbortController();
      const spy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timer.signal);
      const fire = () =>
        timer.abort(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
      return { fire, spy };
    }

    /**
     * Rejects the way undici does when a timeout signal fires — including when
     * the signal aborted *before* this was called, which is the ordering in
     * the body-read case: the timer fires while the response headers are still
     * being handed to the caller.
     */
    function abortedBy(signal: AbortSignal | null | undefined): Promise<never> {
      return new Promise((_resolve, reject) => {
        const fail = () =>
          reject(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
        if (signal?.aborted) fail();
        else signal?.addEventListener("abort", fail);
      });
    }

    it("gives up on a request that never responds, and says how long it waited", async () => {
      const { fire, spy } = controllableTimeout();
      vi.stubGlobal(
        "fetch",
        vi.fn((_url: string, init: RequestInit) => abortedBy(init.signal)),
      );

      const pending = selectRows(CFG, "submissions", "select=*").catch((e: Error) => e);
      fire();
      const error = await pending;

      expect(spy).toHaveBeenCalledWith(8000);
      expect(error).toBeInstanceOf(PostgrestError);
      expect(error).toMatchObject({ status: 502 });
      // The runtime's own message ("aborted due to timeout") never says what
      // the budget was, which is the first thing a reader of the log wants.
      expect((error as Error).message).toContain("8000ms");
    });

    it("is still armed while the response body is being read", async () => {
      // The exact case the old implementation left unbounded: headers arrive
      // promptly, the timer is cleared, and the body then never comes.
      const { fire } = controllableTimeout();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (_url: string, init: RequestInit) => ({
          ok: true,
          status: 200,
          headers: new Headers({ "content-range": "0-0/1" }),
          json: () => abortedBy(init.signal),
          text: () => abortedBy(init.signal),
        })),
      );

      const pending = selectRows(CFG, "submissions", "select=*").catch((e: Error) => e);
      fire();
      const error = await pending;

      expect(error).toBeInstanceOf(Error);
      expect((error as Error).name).toBe("TimeoutError");
    });
  });
});

describe("escapeLike", () => {
  it("passes an ordinary search term through untouched", () => {
    expect(escapeLike("acme")).toBe("acme");
    expect(escapeLike("jane@acme.com")).toBe("jane@acme.com");
  });

  it("neutralises SQL LIKE wildcards so a search stays literal", () => {
    expect(escapeLike("100%")).toBe("100");
    expect(escapeLike("a_b")).toBe("a b");
  });

  it("neutralises the PostgREST filter separators", () => {
    expect(escapeLike("a,b")).toBe("a b");
    expect(escapeLike("(a)")).toBe("a");
  });

  it("neutralises PostgREST's own `*` wildcard", () => {
    // PostgREST translates `*` into SQL's `%` for ilike filters, so an admin
    // searching `acme*corp` previously got a wildcard match rather than the
    // literal string they typed (audit S8).
    expect(escapeLike("acme*corp")).toBe("acme corp");
    expect(escapeLike("*")).toBe("");
    expect(escapeLike("*acme*")).toBe("acme");
  });

  it("trims the result so a fully-escaped term does not become whitespace", () => {
    expect(escapeLike("  acme  ")).toBe("acme");
    expect(escapeLike("%%%")).toBe("");
  });
});
