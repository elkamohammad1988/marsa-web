import { describe, it, expect, vi, afterEach } from "vitest";
import { GET as getRates } from "@/app/api/rates/route";
import { GET as getHistory } from "@/app/api/rates/history/route";
import { RATES_RATE_LIMIT, retryAfterSeconds } from "@/lib/api-rate-limit";

/**
 * Audit finding S6: neither FX proxy had any limiter, so an anonymous caller
 * could enumerate 5,400 distinct cache keys, each forcing a fresh request to a
 * key-less fair-use upstream from our egress IP. Getting throttled there
 * degrades the homepage ticker, the converter and the demo at once.
 *
 * Asserted at the boundary a caller experiences: the status code, the
 * Retry-After header, and whether the rejection can be cached.
 */

/** A distinct client per test — the in-memory bucket map is module state. */
let ipCounter = 0;
function request(url: string): Request {
  ipCounter += 1;
  return new Request(url, { headers: { "x-forwarded-for": `198.51.100.${ipCounter % 250}` } });
}

/** Repeat one caller's IP so the limiter sees a single client. */
function requestFrom(ip: string, url: string): Request {
  return new Request(url, { headers: { "x-forwarded-for": ip } });
}

/**
 * Frankfurter returns two different shapes: `rates` is currency→number for a
 * single day, and date→currency→number for a range. The range request is the
 * one containing `..`.
 */
function stubFxOk() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () =>
        String(url).includes("..")
          ? {
              amount: 1,
              base: "EUR",
              start_date: "2026-06-24",
              end_date: "2026-07-24",
              rates: { "2026-06-24": { USD: 1.08 }, "2026-07-24": { USD: 1.09 } },
            }
          : { amount: 1, base: "EUR", date: "2026-07-24", rates: { USD: 1.09 } },
      text: async () => "",
      headers: new Headers(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/rates — abuse limit", () => {
  it("serves a normal request", async () => {
    stubFxOk();
    const res = await getRates(request("https://marsa.money/api/rates?from=EUR&to=USD"));
    expect(res.status).toBe(200);
  });

  it("rejects with 429 once the window is exhausted", async () => {
    stubFxOk();
    const ip = "198.51.100.201";
    const url = "https://marsa.money/api/rates?from=EUR&to=USD";

    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) {
      const ok = await getRates(requestFrom(ip, url));
      expect(ok.status).toBe(200);
    }

    const blocked = await getRates(requestFrom(ip, url));
    expect(blocked.status).toBe(429);
  });

  it("tells the caller when to come back", async () => {
    stubFxOk();
    const ip = "198.51.100.202";
    const url = "https://marsa.money/api/rates";

    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) await getRates(requestFrom(ip, url));
    const blocked = await getRates(requestFrom(ip, url));

    const retryAfter = Number(blocked.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(RATES_RATE_LIMIT.windowMs / 1000);
  });

  it("marks the rejection uncacheable, so a CDN cannot serve it to everyone else", async () => {
    stubFxOk();
    const ip = "198.51.100.203";
    const url = "https://marsa.money/api/rates";

    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) await getRates(requestFrom(ip, url));
    const blocked = await getRates(requestFrom(ip, url));

    // The success path sets `public, s-maxage=3600`. Reusing that on a 429
    // would turn one caller's rate limit into an outage for the whole edge.
    expect(blocked.headers.get("cache-control")).toBe("no-store");
  });

  it("does not spend the upstream request budget on a rejected call", async () => {
    stubFxOk();
    const ip = "198.51.100.204";
    const url = "https://marsa.money/api/rates";

    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) await getRates(requestFrom(ip, url));
    const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    await getRates(requestFrom(ip, url));

    // The whole point of the limit is that the upstream is never called.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps separate budgets per caller", async () => {
    stubFxOk();
    const url = "https://marsa.money/api/rates";
    const exhausted = "198.51.100.205";

    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) await getRates(requestFrom(exhausted, url));
    expect((await getRates(requestFrom(exhausted, url))).status).toBe(429);

    // A different visitor is unaffected.
    expect((await getRates(requestFrom("198.51.100.206", url))).status).toBe(200);
  });
});

describe("GET /api/rates/history — abuse limit", () => {
  it("serves a normal request", async () => {
    stubFxOk();
    const res = await getHistory(request("https://marsa.money/api/rates/history?range=1M"));
    expect(res.status).toBe(200);
  });

  it("rejects with 429 once the window is exhausted", async () => {
    stubFxOk();
    const ip = "198.51.100.210";
    const url = "https://marsa.money/api/rates/history?range=1M";

    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) await getHistory(requestFrom(ip, url));
    expect((await getHistory(requestFrom(ip, url))).status).toBe(429);
  });

  it("shares one budget with /api/rates rather than doubling the allowance", async () => {
    stubFxOk();
    const ip = "198.51.100.211";

    // Spend the whole budget on the history endpoint...
    for (let i = 0; i < RATES_RATE_LIMIT.limit; i++) {
      await getHistory(requestFrom(ip, "https://marsa.money/api/rates/history"));
    }

    // ...and the sibling endpoint is already exhausted. The upstream fair-use
    // budget is one budget; alternating endpoints must not buy more of it.
    expect((await getRates(requestFrom(ip, "https://marsa.money/api/rates"))).status).toBe(429);
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up so the header never says zero", () => {
    expect(retryAfterSeconds(Date.now() + 1)).toBe(1);
  });

  it("reports at least one second for a window that already elapsed", () => {
    expect(retryAfterSeconds(Date.now() - 10_000)).toBe(1);
  });

  it("reports the remaining whole seconds", () => {
    expect(retryAfterSeconds(Date.now() + 30_000)).toBeGreaterThanOrEqual(29);
    expect(retryAfterSeconds(Date.now() + 30_000)).toBeLessThanOrEqual(30);
  });
});
