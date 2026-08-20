import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as getRates } from "@/app/api/rates/route";
import { GET as getHistory } from "@/app/api/rates/history/route";
import { RATES_RATE_LIMIT, retryAfterSeconds } from "@/lib/api-rate-limit";
import { FxError, fxFailure } from "@/lib/fx";
import { setReporter, type CapturedEvent, type Reporter } from "@/lib/observability";

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

/**
 * Both FX endpoints are unauthenticated, and the converter panel and the
 * calculator render `error` from the body straight into the page. So whatever
 * these routes put in that field is published to anyone who asks — which is
 * how `FX provider returned 429`, our fetch internals and, on a DNS failure,
 * the upstream's hostname were all reachable by an anonymous caller.
 *
 * `/api/health` already refuses to do this and puts the FX provider's status
 * in the captured event instead (audit S2). These two routes were the surface
 * that fix did not reach. Asserted the way a caller experiences it: the bytes
 * of the response body, checked against the things it must never contain.
 */
describe("a failed lookup does not describe our infrastructure to the caller", () => {
  /** Everything an anonymous caller must never be handed. */
  const FORBIDDEN = [
    "frankfurter",   // the upstream provider's identity
    "ENOTFOUND",     // resolver internals
    "getaddrinfo",
    "fetch failed",
    "aborted",       // AbortSignal.timeout's own wording
    "429",           // the upstream's status, distinct from ours
    "api.",          // any hostname fragment
  ];

  let captured: CapturedEvent[] = [];
  let previous: Reporter;

  beforeEach(() => {
    captured = [];
    previous = setReporter((event) => captured.push(event));
  });

  afterEach(() => {
    setReporter(previous);
  });

  /** The upstream answers, but with a failure status. */
  function stubFxStatus(status: number) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status, json: async () => ({}), text: async () => "" })),
    );
  }

  /** The upstream is not reachable at all — the shape of a real DNS failure. */
  function stubFxUnreachable() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed: getaddrinfo ENOTFOUND api.frankfurter.dev");
      }),
    );
  }

  /** What `AbortSignal.timeout` throws when the 8s ceiling is hit. */
  function stubFxTimeout() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        const err = new Error("The operation was aborted due to timeout");
        err.name = "TimeoutError";
        throw err;
      }),
    );
  }

  /** A well-formed answer that simply carries no rate for the pair. */
  function stubFxNoRates() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ amount: 1, base: "EUR", date: "2026-07-24", rates: {} }),
        text: async () => "",
      })),
    );
  }

  async function errorOf(res: Response) {
    return ((await res.json()) as { error?: string }).error;
  }

  function expectSaysNothingInternal(text: string) {
    for (const secret of FORBIDDEN) {
      expect(text.toLowerCase(), `leaked "${secret}"`).not.toContain(secret.toLowerCase());
    }
  }

  const upstreamFailures: Array<[string, () => void]> = [
    ["the provider throttles us", () => stubFxStatus(429)],
    ["the provider errors", () => stubFxStatus(503)],
    ["the provider cannot be resolved", stubFxUnreachable],
    ["the request times out", stubFxTimeout],
  ];

  describe.each(upstreamFailures)("/api/rates when %s", (_label, stub) => {
    it("answers 502 with a sentence written for a visitor", async () => {
      stub();
      const res = await getRates(request("https://marsa.money/api/rates?from=EUR&to=USD"));

      expect(res.status).toBe(502);
      expect(await errorOf(res)).toBe(
        "Could not load the exchange rate just now. Please try again shortly.",
      );
    });

    it("puts nothing internal anywhere in the response", async () => {
      stub();
      const res = await getRates(request("https://marsa.money/api/rates?from=EUR&to=USD"));
      expectSaysNothingInternal(await res.text());
    });

    it("still records the real reason where an operator can read it", async () => {
      stub();
      await getRates(request("https://marsa.money/api/rates?from=EUR&to=USD"));

      // Withholding it from the caller must not mean losing it. Before this,
      // these two routes logged nothing at all — the detail was published to
      // the internet and recorded nowhere.
      expect(captured).toHaveLength(1);
      expect(captured[0].event).toBe("rates.latest");
      expect(captured[0].severity).toBe("warning");
      expect(captured[0].message.length).toBeGreaterThan(0);
    });

    it("marks the failure uncacheable, so a CDN cannot serve it to everyone", async () => {
      stub();
      const res = await getRates(request("https://marsa.money/api/rates?from=EUR&to=USD"));
      expect(res.headers.get("cache-control")).toBe("no-store");
    });
  });

  describe.each(upstreamFailures)("/api/rates/history when %s", (_label, stub) => {
    it("answers 502 with a sentence written for a visitor", async () => {
      stub();
      const res = await getHistory(request("https://marsa.money/api/rates/history?range=1M"));

      expect(res.status).toBe(502);
      expect(await errorOf(res)).toBe(
        "Could not load the rate history just now. Please try again shortly.",
      );
    });

    it("puts nothing internal anywhere in the response", async () => {
      stub();
      const res = await getHistory(request("https://marsa.money/api/rates/history?range=1M"));
      expectSaysNothingInternal(await res.text());
    });

    it("records it against its own event name", async () => {
      stub();
      await getHistory(request("https://marsa.money/api/rates/history?range=1M"));
      expect(captured).toHaveLength(1);
      expect(captured[0].event).toBe("rates.history");
    });
  });

  /**
   * The other half of the rule, and the reason this is a flag on the error
   * rather than a blanket "return a generic message". A caller who asked for
   * something we do not support is describing *their own request*, and being
   * told "try again shortly" for a currency that will never be supported is
   * both useless and untrue.
   */
  describe("a fault in the request itself is still named", () => {
    it("tells the caller which part of their request was unsupported", async () => {
      stubFxOk();
      const res = await getRates(request("https://marsa.money/api/rates?from=XXX&to=USD"));

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe("Unsupported currency.");
    });

    it("does not log a visitor's typo as an infrastructure failure", async () => {
      stubFxOk();
      await getRates(request("https://marsa.money/api/rates?from=XXX&to=USD"));
      expect(captured).toEqual([]);
    });

    it("names an unsupported currency on the history endpoint too", async () => {
      stubFxOk();
      const res = await getHistory(
        request("https://marsa.money/api/rates/history?from=ZZZ&to=USD&range=1M"),
      );

      expect(res.status).toBe(400);
      expect(await errorOf(res)).toBe("Unsupported currency.");
    });

    it("says so when the pair is supported but has no rate", async () => {
      stubFxNoRates();
      const res = await getRates(request("https://marsa.money/api/rates?from=EUR&to=USD"));

      expect(res.status).toBe(502);
      expect(await errorOf(res)).toBe("Rate unavailable for this pair.");
    });

    it("says so when the pair has no history", async () => {
      stubFxNoRates();
      const res = await getHistory(
        request("https://marsa.money/api/rates/history?from=EUR&to=USD&range=1M"),
      );

      expect(res.status).toBe(502);
      expect(await errorOf(res)).toBe("No historical data for this pair.");
    });
  });
});

/**
 * The rule itself, asked directly. Both routes call this and nothing else
 * decides the question, so this is where the behaviour is pinned.
 */
describe("fxFailure", () => {
  const FALLBACK = "Could not load that just now.";

  it("relays a message that was written for the visitor", () => {
    const result = fxFailure(new FxError("Unsupported currency.", 400, true), FALLBACK);
    expect(result).toEqual({ status: 400, error: "Unsupported currency.", withheld: false });
  });

  it("withholds one that was not", () => {
    const result = fxFailure(new FxError("FX provider returned 429"), FALLBACK);
    expect(result).toEqual({ status: 502, error: FALLBACK, withheld: true });
  });

  it("defaults to withholding, so a message added later is private until decided", () => {
    // The constructor's third argument defaults to false on purpose: a new
    // `throw new FxError("…")` must not become publishable by omission.
    expect(fxFailure(new FxError("Some new internal detail."), FALLBACK).withheld).toBe(true);
  });

  it("withholds anything that is not an FxError at all", () => {
    expect(fxFailure(new TypeError("fetch failed"), FALLBACK)).toEqual({
      status: 502,
      error: FALLBACK,
      withheld: true,
    });
    expect(fxFailure("a thrown string", FALLBACK).withheld).toBe(true);
  });

  it("answers 502 for a withheld failure whatever status it carried", () => {
    // Passing the original status through would let a caller distinguish
    // failures they are deliberately not being told apart.
    expect(fxFailure(new FxError("Internal.", 429), FALLBACK).status).toBe(502);
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
