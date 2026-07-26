import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, rateLimitShared, clientKey } from "@/lib/rate-limit";
import { setReporter, type CapturedEvent } from "@/lib/observability";

/**
 * `lib/rate-limit.ts` is the only thing standing between the public form
 * endpoints and unlimited submission volume, and audit finding P5 recorded that
 * it had no tests. Batches 2 and 3 change which limiter each route uses, so
 * these exist to prove the limiter itself is unchanged by those edits.
 *
 * The in-memory bucket map is module-level state shared by every test in this
 * file, so each test mints its own key rather than relying on isolation.
 */
let counter = 0;
const uniqueKey = () => `test-key-${process.pid}-${counter++}`;

const PG_ENV = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
};

describe("rateLimit — in-memory fixed window", () => {
  it("allows exactly `limit` requests inside one window, then rejects", () => {
    const key = uniqueKey();
    const opts = { limit: 3, windowMs: 60_000 };

    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(true);
    expect(rateLimit(key, opts).ok).toBe(false);
  });

  it("counts down the remaining allowance and floors it at zero", () => {
    const key = uniqueKey();
    const opts = { limit: 2, windowMs: 60_000 };

    expect(rateLimit(key, opts).remaining).toBe(1);
    expect(rateLimit(key, opts).remaining).toBe(0);
    // Over the limit: still zero, never negative.
    expect(rateLimit(key, opts).remaining).toBe(0);
    expect(rateLimit(key, opts).remaining).toBe(0);
  });

  it("keeps separate counters per key, so one caller cannot exhaust another", () => {
    const a = uniqueKey();
    const b = uniqueKey();
    const opts = { limit: 1, windowMs: 60_000 };

    expect(rateLimit(a, opts).ok).toBe(true);
    expect(rateLimit(a, opts).ok).toBe(false);
    // b is untouched by a's exhaustion.
    expect(rateLimit(b, opts).ok).toBe(true);
  });

  it("defaults to 5 requests per minute", () => {
    const key = uniqueKey();
    for (let i = 0; i < 5; i++) expect(rateLimit(key).ok).toBe(true);
    expect(rateLimit(key).ok).toBe(false);
  });

  it("reports a reset time in the future and holds it steady across the window", () => {
    const key = uniqueKey();
    const first = rateLimit(key, { limit: 3, windowMs: 60_000 });
    const second = rateLimit(key, { limit: 3, windowMs: 60_000 });

    expect(first.resetAt).toBeGreaterThan(Date.now());
    // The window is fixed, not sliding: a second request does not extend it.
    expect(second.resetAt).toBe(first.resetAt);
  });

  describe("window rollover", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("starts a fresh allowance once the window expires", () => {
      const key = uniqueKey();
      const opts = { limit: 1, windowMs: 1_000 };

      expect(rateLimit(key, opts).ok).toBe(true);
      expect(rateLimit(key, opts).ok).toBe(false);

      vi.advanceTimersByTime(1_001);

      expect(rateLimit(key, opts).ok).toBe(true);
    });

    it("does not reset early — the window is honoured to its edge", () => {
      const key = uniqueKey();
      const opts = { limit: 1, windowMs: 10_000 };

      expect(rateLimit(key, opts).ok).toBe(true);
      vi.advanceTimersByTime(9_999);
      expect(rateLimit(key, opts).ok).toBe(false);
    });
  });
});

describe("rateLimitShared — cross-instance limiter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the in-memory result when no database is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await rateLimitShared(uniqueKey(), { limit: 2, windowMs: 60_000 });

    expect(result.ok).toBe(true);
    // No database configured means no round trip at all.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits without calling the database once the local window is exhausted", async () => {
    const key = uniqueKey();
    const opts = { limit: 1, windowMs: 60_000 };
    vi.stubEnv("SUPABASE_URL", PG_ENV.SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", PG_ENV.SUPABASE_SERVICE_ROLE_KEY);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "5",
      headers: new Headers(),
    }));
    vi.stubGlobal("fetch", fetchMock);

    await rateLimitShared(key, opts); // consumes the single local allowance
    fetchMock.mockClear();

    const blocked = await rateLimitShared(key, opts);

    expect(blocked.ok).toBe(false);
    // Already over locally: the database is never asked.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the database verdict when it is reachable", async () => {
    vi.stubEnv("SUPABASE_URL", PG_ENV.SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", PG_ENV.SUPABASE_SERVICE_ROLE_KEY);

    // A negative remaining allowance means another instance already used the
    // budget, even though this instance's local window is untouched.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "-1",
        headers: new Headers(),
      })),
    );

    const result = await rateLimitShared(uniqueKey(), { limit: 5, windowMs: 60_000 });

    expect(result.ok).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("passes the key, limit and window to the database function", async () => {
    vi.stubEnv("SUPABASE_URL", PG_ENV.SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", PG_ENV.SUPABASE_SERVICE_ROLE_KEY);

    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "4",
      headers: new Headers(),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const key = uniqueKey();
    await rateLimitShared(key, { limit: 5, windowMs: 90_000 });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/rest/v1/rpc/check_rate_limit");
    expect(JSON.parse(String(init.body))).toEqual({
      p_key: key,
      p_limit: 5,
      // Milliseconds are converted to whole seconds, rounded up.
      p_window_seconds: 90,
    });
  });

  it("degrades to the in-memory result when the database is unreachable", async () => {
    vi.stubEnv("SUPABASE_URL", PG_ENV.SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", PG_ENV.SUPABASE_SERVICE_ROLE_KEY);
    const captured: CapturedEvent[] = [];
    const restore = setReporter((event) => captured.push(event));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    let result;
    try {
      result = await rateLimitShared(uniqueKey(), { limit: 5, windowMs: 60_000 });
    } finally {
      setReporter(restore);
    }

    // A broken database must not lock every real user out.
    expect(result.ok).toBe(true);

    // But it must not do so silently: the limit is now per-instance, which is
    // the exact weakness S1 was about, arriving without anyone being told.
    const degraded = captured.find((e) => e.event === "rateLimit.degraded");
    expect(degraded, "the degradation was not reported").toBeDefined();
    expect(degraded!.severity).toBe("warning");
  });

  it("still enforces the local window while the database is down", async () => {
    vi.stubEnv("SUPABASE_URL", PG_ENV.SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", PG_ENV.SUPABASE_SERVICE_ROLE_KEY);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const key = uniqueKey();
    const opts = { limit: 2, windowMs: 60_000 };

    expect((await rateLimitShared(key, opts)).ok).toBe(true);
    expect((await rateLimitShared(key, opts)).ok).toBe(true);
    // Degraded is not the same as disabled.
    expect((await rateLimitShared(key, opts)).ok).toBe(false);
  });

  it("falls back to the local result when the database returns a non-numeric answer", async () => {
    vi.stubEnv("SUPABASE_URL", PG_ENV.SUPABASE_URL);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", PG_ENV.SUPABASE_SERVICE_ROLE_KEY);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => "null",
        headers: new Headers(),
      })),
    );

    const result = await rateLimitShared(uniqueKey(), { limit: 5, windowMs: 60_000 });
    expect(result.ok).toBe(true);
  });
});

describe("clientKey", () => {
  it("uses the first address in x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" });
    expect(clientKey(headers, "leads")).toBe("leads:203.0.113.7");
  });

  it("trims whitespace around the address", () => {
    const headers = new Headers({ "x-forwarded-for": "  203.0.113.7  , 70.41.3.18" });
    expect(clientKey(headers, "leads")).toBe("leads:203.0.113.7");
  });

  it("handles a single address with no comma", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7" });
    expect(clientKey(headers, "contact")).toBe("contact:203.0.113.7");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.42" });
    expect(clientKey(headers, "rates")).toBe("rates:198.51.100.42");
  });

  it("falls back to x-real-ip when x-forwarded-for is empty or blank", () => {
    expect(clientKey(new Headers({ "x-forwarded-for": "", "x-real-ip": "198.51.100.42" }), "s")).toBe(
      "s:198.51.100.42",
    );
    // A leading empty entry must not produce an empty identifier.
    expect(
      clientKey(new Headers({ "x-forwarded-for": "  , 70.41.3.18", "x-real-ip": "198.51.100.42" }), "s"),
    ).toBe("s:198.51.100.42");
  });

  it("uses a constant identifier when no address header is present", () => {
    expect(clientKey(new Headers(), "subscribe")).toBe("subscribe:anonymous");
  });

  it("scopes the key so separate endpoints do not share one budget", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.7" });
    expect(clientKey(headers, "leads")).not.toBe(clientKey(headers, "contact"));
  });
});
