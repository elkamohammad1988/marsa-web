import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatAmount,
  formatCurrency,
  currencyFractionDigits,
  isSupportedCurrency,
  isRangeId,
  getLatestRate,
  getSeries,
  FxError,
} from "@/lib/fx";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(payload: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok, status, json: async () => payload })),
  );
}

describe("currency rounding helpers", () => {
  it("uses 0 or 2 fraction digits by currency (case-insensitive)", () => {
    expect(currencyFractionDigits("JPY")).toBe(0);
    expect(currencyFractionDigits("huf")).toBe(0);
    expect(currencyFractionDigits("KRW")).toBe(0);
    expect(currencyFractionDigits("USD")).toBe(2);
    expect(currencyFractionDigits("eur")).toBe(2);
  });

  it("formatAmount rounds and groups without a symbol", () => {
    expect(formatAmount(1234.5, "USD")).toBe("1,234.50");
    expect(formatAmount(1234.567, "EUR")).toBe("1,234.57");
    expect(formatAmount(1000, "JPY")).toBe("1,000");
    expect(formatAmount(0, "USD")).toBe("0.00");
  });

  it("formatCurrency includes a symbol and respects decimals", () => {
    expect(formatCurrency(1000, "USD")).toContain("1,000.00");
    const jpy = formatCurrency(1000, "JPY");
    expect(jpy).toContain("1,000");
    expect(jpy).not.toContain(".00");
    expect(formatCurrency(2500.5, "EUR")).toContain("2,500.50");
  });
});

describe("guards", () => {
  it("isSupportedCurrency and isRangeId", () => {
    expect(isSupportedCurrency("eur")).toBe(true);
    expect(isSupportedCurrency("ZZZ")).toBe(false);
    expect(isRangeId("1M")).toBe(true);
    expect(isRangeId("2D")).toBe(false);
  });
});

describe("getLatestRate", () => {
  it("returns 1 for the same currency without calling the network", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const r = await getLatestRate("USD", "usd");
    expect(r.rate).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it("rejects an unsupported currency with a 400 FxError before fetching", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const err = await getLatestRate("EUR", "ZZZ").catch((e) => e);
    expect(err).toBeInstanceOf(FxError);
    expect((err as FxError).status).toBe(400);
    expect(spy).not.toHaveBeenCalled();
  });

  it("throws when the provider omits the rate", async () => {
    stubFetch({ date: "2026-01-01", rates: {} });
    await expect(getLatestRate("EUR", "USD")).rejects.toBeInstanceOf(FxError);
  });

  it("throws when the provider responds non-OK", async () => {
    stubFetch({}, false, 503);
    await expect(getLatestRate("EUR", "USD")).rejects.toThrow(/503/);
  });

  it("returns the parsed rate on success", async () => {
    stubFetch({ date: "2026-02-02", rates: { USD: 1.2345 } });
    const r = await getLatestRate("EUR", "USD");
    expect(r).toEqual({ rate: 1.2345, date: "2026-02-02" });
  });
});

describe("getSeries", () => {
  it("returns a flat unit series for the same currency without fetching", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const s = await getSeries("EUR", "EUR", "1M");
    expect(s.rate).toBe(1);
    expect(s.points.length).toBeGreaterThanOrEqual(2);
    expect(s.points.every((p) => p.y === 1)).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("throws when there is no historical data", async () => {
    stubFetch({ rates: {} });
    await expect(getSeries("EUR", "USD", "1M")).rejects.toBeInstanceOf(FxError);
  });

  it("builds points and the last rate from provider data", async () => {
    stubFetch({
      rates: {
        "2026-01-02": { USD: 1.1 },
        "2026-01-03": { USD: 1.12 },
        "2026-01-04": { USD: 1.11 },
      },
    });
    const s = await getSeries("EUR", "USD", "1M");
    expect(s.points.length).toBe(3);
    expect(s.rate).toBe(1.11); // last chronological close
    expect(s.date).toBe("2026-01-04");
  });
});
