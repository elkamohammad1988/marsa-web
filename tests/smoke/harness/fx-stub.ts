import { createServer, type Server } from "node:http";

/**
 * A Frankfurter stand-in, in-process, for the smoke suite.
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * The harness already blanks every real credential so a developer's
 * `.env.local` can never reach a test run, and `postgrest-stub.ts` gives the
 * database a deterministic local stand-in for the same reason. **FX was the one
 * external dependency left live.** `lib/fx.ts` falls back to
 * `https://api.frankfurter.dev/v1` when `FX_API_BASE` is unset, so the browser
 * gate was reaching across the public internet to a free, key-less,
 * rate-limited third party on every run.
 *
 * That is not hypothetical. Two CI runs went red on commits whose entire diff
 * was Markdown, and the failures have a signature: a healthy `Browser smoke`
 * step takes 136-144s, and both red ones took 264-273s. The ~125s delta is one
 * test burning `testTimeout: 120_000`, and the only two tests in the suite
 * carrying a 120s budget are the two that wait on a rate arriving —
 * *"the calculator requests a rate on mount and again when the pair changes"*
 * and *"the converter loads history and renders a converted amount"*. One of
 * them explicitly asserts `rateCalls.every(c => c.startsWith("200"))`, which a
 * 429 from a busy upstream fails outright.
 *
 * A gate that goes red because somebody else's API was busy is a gate that
 * teaches people to re-run it, and a gate people re-run by reflex has stopped
 * being a gate.
 *
 * ── What this does not weaken ─────────────────────────────────────────────
 * Every assertion those tests make is about **this application**: that the
 * calculator asks for a rate on mount, asks again when the pair changes, that
 * each call succeeds, and that the converter renders a converted amount and a
 * history series. None of them is an assertion about the ECB's numbers or
 * Frankfurter's uptime, and none of them loses anything by being answered
 * locally — `lib/fx.ts` still runs in full, over a real `fetch`, parsing a real
 * response body, exactly as `postgrest-stub` keeps `lib/postgrest.ts` honest.
 *
 * Live rates are still verified where the claim is actually made: against the
 * deployed origin, by hand, before publishing. See `docs/DEPLOYMENT.md`.
 *
 * ── What it is not ────────────────────────────────────────────────────────
 * Not a source of truth for arithmetic. The rates below are plausible and
 * fixed; `tests/fx.test.ts` is what asserts the conversion maths, from the
 * module itself.
 */

export type FxStub = {
  /** Origin to hand the application as `FX_API_BASE`. */
  url: string;
  /** Every upstream path requested, in order — the assertion surface. */
  calls(): string[];
  close(): Promise<void>;
};

/**
 * Fixed reference rates against EUR, for the currencies the smoke tests touch.
 * Any base is derived by triangulating through EUR, which is what the real
 * endpoint does and what keeps a `base=USD` request coherent with a `base=EUR`
 * one.
 */
const PER_EUR: Record<string, number> = {
  EUR: 1, USD: 1.1662, GBP: 0.8555, JPY: 171.42, CHF: 0.9361, AUD: 1.7724,
  CAD: 1.6083, CNY: 8.3105, BRL: 6.2841, CZK: 24.518, DKK: 7.4602,
  HKD: 9.0847, HUF: 391.27, IDR: 18_942, ILS: 4.2216, INR: 101.84,
  ISK: 142.6, KRW: 1_589.3, MXN: 21.734, MYR: 4.9182, NOK: 11.742,
  NZD: 1.9318, PHP: 66.417, PLN: 4.3055, RON: 5.0742, SEK: 11.067,
  SGD: 1.4982, THB: 37.641, TRY: 47.812, ZAR: 20.594,
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

/** `to` per one `from`, via EUR — the triangulation the upstream performs. */
function rate(from: string, to: string): number | null {
  const f = PER_EUR[from];
  const t = PER_EUR[to];
  if (typeof f !== "number" || typeof t !== "number") return null;
  return round(t / f);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Every date from `start` to `end` inclusive, as the upstream returns them. */
function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  // Bounded so a malformed range can never spin: five years of daily points is
  // past the longest range the UI offers.
  for (let i = 0; cursor <= last && i < 2000; i++) {
    out.push(iso(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * A deterministic wobble, so a history series is a line rather than a flat rule
 * — the chart has to have something to draw — while staying reproducible run to
 * run. Seeded off the date string, not off a clock or a random source.
 */
function wobble(date: string): number {
  let h = 0;
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 1 + (h / 997 - 0.5) * 0.02; // ±1%
}

export async function startFxStub(): Promise<FxStub> {
  const calls: string[] = [];

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    calls.push(`${req.method} ${req.url}`);

    const base = (url.searchParams.get("base") ?? "EUR").toUpperCase();
    const symbols = (url.searchParams.get("symbols") ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const send = (status: number, body: unknown) => {
      const payload = JSON.stringify(body);
      res.writeHead(status, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
      });
      res.end(payload);
    };

    // `/latest?base=&symbols=`
    if (url.pathname === "/latest") {
      const rates: Record<string, number> = {};
      for (const s of symbols) {
        const r = rate(base, s);
        if (r !== null) rates[s] = r;
      }
      return send(200, { amount: 1, base, date: iso(new Date()), rates });
    }

    // `/{start}..{end}?base=&symbols=` — the history series.
    const range = url.pathname.slice(1).split("..");
    if (range.length === 2 && /^\d{4}-\d{2}-\d{2}$/.test(range[0])) {
      const [start, end] = range;
      const rates: Record<string, Record<string, number>> = {};
      for (const day of daysBetween(start, end || iso(new Date()))) {
        const point: Record<string, number> = {};
        for (const s of symbols) {
          const r = rate(base, s);
          if (r !== null) point[s] = round(r * wobble(day));
        }
        if (Object.keys(point).length) rates[day] = point;
      }
      return send(200, { amount: 1, base, start_date: start, end_date: end, rates });
    }

    return send(404, { message: "not found" });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "string" || address === null) {
    throw new Error("the FX stub could not acquire a port");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    calls: () => [...calls],
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
