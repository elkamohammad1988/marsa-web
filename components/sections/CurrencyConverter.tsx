"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import {
  FX_CURRENCIES,
  FX_RANGES,
  formatAmount,
  type FxPoint,
  type RangeId,
} from "@/lib/fx";

const RateChart = dynamic(() => import("./RateChart"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-card bg-surface-blue-tint-2" />
  ),
});

type CurrencyConverterProps = {
  /** Use "h1" on the dedicated tool page, "h2" when embedded under another heading. */
  headingLevel?: "h1" | "h2";
  title?: string;
  subtitle?: string;
};

export function CurrencyConverter({
  headingLevel = "h1",
  title = "Instant Currency Converter — Live Exchange Rates",
  subtitle = "Check real mid-market reference rates across 30 currencies, published by the European Central Bank. Free, no account required.",
}: CurrencyConverterProps = {}) {
  const HeadingTag = headingLevel;
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("EUR");
  const [to, setTo] = useState("USD");
  const [range, setRange] = useState<RangeId>("1M");

  const [rate, setRate] = useState<number | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [points, setPoints] = useState<FxPoint[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(
        `/api/rates/history?from=${from}&to=${to}&range=${range}`,
        { signal: controller.signal },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to load exchange rates.");
      }
      const data: { rate: number; date: string; points: FxPoint[] } = await res.json();
      setRate(data.rate);
      setAsOf(data.date);
      setPoints(data.points);
      setStatus("ready");
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unable to load exchange rates.");
    }
  }, [from, to, range]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const fromCcy = FX_CURRENCIES.find((c) => c.code === from) ?? FX_CURRENCIES[0];
  const toCcy = FX_CURRENCIES.find((c) => c.code === to) ?? FX_CURRENCIES[1];

  const converted = useMemo(
    () => (rate != null ? formatAmount(amount * rate, to) : null),
    [amount, rate, to],
  );

  const asOfLabel = useMemo(() => {
    if (!asOf) return null;
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${asOf}T00:00:00Z`));
  }, [asOf]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <section className="bg-surface-cream pb-12 pt-10 md:pb-16 md:pt-14">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
          <div>
            <HeadingTag className="text-display font-bold tracking-tight text-ink">
              {title}
            </HeadingTag>
            <p className="mt-5 max-w-xl text-base text-ink-muted md:text-lg">{subtitle}</p>
            <ul className="mt-6 flex flex-wrap items-center gap-2">
              {["ECB reference rates", "30 currencies", "No account needed"].map((l) => (
                <li
                  key={l}
                  className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs font-medium ring-1 ring-line"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-blue" />
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card-lg bg-card p-5 shadow-card md:p-7">
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-card bg-surface-blue-tint-2 p-4">
                <label htmlFor="fx-amount" className="text-xs font-medium text-ink-muted">
                  You Send
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="fx-amount"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-transparent text-2xl font-semibold text-ink outline-none"
                  />
                  <label htmlFor="fx-from" className="sr-only">
                    From currency
                  </label>
                  <select
                    id="fx-from"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-full bg-card px-3 py-1.5 text-sm font-medium ring-1 ring-line"
                  >
                    {FX_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={swap}
                aria-label={`Swap ${from} and ${to}`}
                className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-on-brand transition-colors hover:bg-brand-blue-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2"
              >
                <span aria-hidden>⇄</span>
              </button>

              <div className="rounded-card bg-surface-blue-tint-2 p-4">
                <span className="text-xs font-medium text-ink-muted">They Get</span>
                <div className="mt-2 flex items-center gap-3">
                  <output
                    htmlFor="fx-amount fx-from fx-to"
                    className="w-full text-2xl font-semibold text-ink"
                  >
                    {status === "loading" && converted == null ? (
                      <span className="inline-block h-7 w-24 animate-pulse rounded bg-line" />
                    ) : status === "error" ? (
                      <span className="text-base font-medium text-ink-subtle">—</span>
                    ) : (
                      converted
                    )}
                  </output>
                  <label htmlFor="fx-to" className="sr-only">
                    To currency
                  </label>
                  <select
                    id="fx-to"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-full bg-card px-3 py-1.5 text-sm font-medium ring-1 ring-line"
                  >
                    {FX_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 text-sm">
              <div className="text-ink-muted" aria-live="polite">
                {status === "error" ? (
                  <span className="text-ink-subtle">Rate unavailable</span>
                ) : rate != null ? (
                  <>
                    1 {fromCcy.code} ={" "}
                    <span className="font-semibold text-ink">{rate.toFixed(4)}</span> {toCcy.code}
                  </>
                ) : (
                  <span className="text-ink-subtle">Loading rate…</span>
                )}
              </div>
              <div className="text-xs text-ink-subtle">
                {asOfLabel ? `ECB rate · ${asOfLabel}` : "European Central Bank"}
              </div>
            </div>

            <div className="mt-5 h-56">
              {status === "error" ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card bg-surface-blue-tint-2 text-center">
                  <p className="max-w-xs px-4 text-sm text-ink-muted">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={load}
                    className="rounded-full bg-brand-blue px-4 py-1.5 text-xs font-medium text-on-brand hover:bg-brand-blue-deep"
                  >
                    Try again
                  </button>
                </div>
              ) : points.length > 0 ? (
                <RateChart points={points} from={from} to={to} />
              ) : (
                <div className="h-full w-full animate-pulse rounded-card bg-surface-blue-tint-2" />
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-1" role="group" aria-label="Chart range">
              {FX_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  aria-pressed={range === r.id}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    range === r.id ? "bg-brand-blue text-on-brand" : "text-ink-muted hover:bg-ink/5",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
