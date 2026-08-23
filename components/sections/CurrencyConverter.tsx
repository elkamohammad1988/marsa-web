"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Container } from "@/components/ui/Container";
import { Select } from "@/components/ui/Select";
import { IconExchange } from "@/components/icons";
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
  loading: () => <div className="skeleton h-full w-full rounded-card" />,
});

type CurrencyConverterProps = {
  /** Use "h1" on the dedicated tool page, "h2" when embedded under another heading. */
  headingLevel?: "h1" | "h2";
  title?: string;
  subtitle?: string;
};

export function CurrencyConverter({
  headingLevel = "h1",
  title = "Instant Currency Converter with Live Exchange Rates",
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
    <section className="relative isolate overflow-hidden bg-surface-alt pb-12 pt-10 md:pb-16 md:pt-14">
      <Container>
        {/*
          The panel column is now the wider of the two (was 1.05fr copy /
          1fr panel). The copy beside it is a headline and three lines of
          prose, both of which reflow happily; the panel is a fixed-shape
          control containing two currency pickers and two monetary figures,
          and at the old split each half resolved to 198px — too narrow to
          hold a 24px figure and a currency chip at once, so "1000" rendered
          as "100" with the last digit clipped. Width should go to the side
          that cannot give any up.
        */}
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[0.9fr_1.1fr] xl:items-center xl:gap-12">
          <div>
            <HeadingTag className="text-gradient-hero text-display font-bold tracking-tight">
              {title}
            </HeadingTag>
            <p className="mt-5 max-w-xl text-base text-ink-muted md:text-lg">{subtitle}</p>
            <ul className="mt-6 flex flex-wrap items-center gap-2">
              {["ECB reference rates", "30 currencies", "No account needed"].map((l) => (
                <li
                  key={l}
                  className="inline-flex items-center rounded-full bg-card px-3.5 py-1.5 text-xs font-medium shadow-card ring-1 ring-line transition-all duration-200 hover:-translate-y-px hover:ring-brand-strong/40"
                >
                  {l}
                </li>
              ))}
            </ul>
          </div>

          <div className="gradient-ring relative rounded-card-lg border border-line bg-card p-5 shadow-e2 md:p-7">
            {/*
              `minmax(0,1fr)`, not `1fr`.

              `1fr` is shorthand for `minmax(auto, 1fr)`, so a column never
              shrinks below its own min-content however much the `fr` share
              says it should. The "You Send" column contains a number input
              whose min-content includes the UA spinner, so it claimed its
              intrinsic width first and the remaining space went to "They Get":
              the two halves of a symmetrical control resolved to **419px and
              182px**. It reads as a misaligned layout because it is one — the
              two panels are supposed to be mirror images.

              Flooring the minimum at 0 lets both columns take an equal share
              and lets their contents shrink, which is also what stopped the
              currency chip overflowing the right-hand panel by 38px.
            */}
            <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <div className="rounded-card bg-surface-tint-2 p-4 ring-1 ring-line transition-shadow duration-200 focus-within:ring-brand-strong/50">
                <label htmlFor="fx-amount" className="text-xs font-medium text-ink-muted">
                  You send
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="fx-amount"
                    type="number"
                    min={0}
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
                    /*
                     * `flex-1 min-w-0`, not `w-full`.
                     *
                     * `w-full` is `width: 100%`, which as a flex item resolves
                     * against the row and then shrinks — and a number input's
                     * min-content width is its spinner, not its text. The
                     * amount collapsed to 20px next to the currency select, so
                     * "1000" rendered as a two-pixel sliver of a digit while
                     * the value, the colour and the 24px type were all
                     * perfectly correct. Nothing threw, and the converted
                     * figure beside it stayed right, which is why this
                     * survived: it is only visible to someone looking.
                     */
                    className="min-w-0 flex-1 bg-transparent text-xl font-semibold tabular-nums text-ink outline-none"
                  />
                  <label htmlFor="fx-from" className="sr-only">
                    From currency
                  </label>
                  <Select
                    variant="chip"
                    id="fx-from"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  >
                    {FX_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <button
                type="button"
                onClick={swap}
                aria-label={`Swap ${from} and ${to}`}
                className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-cta-gradient text-on-brand shadow-cta transition-transform duration-300 hover:rotate-180 hover:shadow-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2"
              >
                {/*
                  Was the text glyph "⇄" (U+21C4). A character, not an icon:
                  its weight, size and vertical centring came from whichever
                  font on the visitor's machine happened to cover that
                  codepoint, so the control looked different on every OS and
                  matched none of the site's other icons. This one inherits
                  stroke weight from the shared icon set.
                */}
                <IconExchange aria-hidden className="h-4 w-4" />
              </button>

              <div className="rounded-card bg-surface-tint-2 p-4 ring-1 ring-line transition-shadow duration-200 focus-within:ring-brand-strong/50">
                <span className="text-xs font-medium text-ink-muted">They get</span>
                <div className="mt-2 flex items-center gap-3">
                  <output
                    htmlFor="fx-amount fx-from fx-to"
                    /*
                     * `min-w-0 flex-1`, for the reason given on the amount
                     * input above — this is the same bug on the other side of
                     * the control, which the earlier fix did not reach.
                     * `w-full` resolves to 100% of the row and then refuses to
                     * shrink past its content, so the output plus the gap plus
                     * the currency chip exceeded the panel and pushed the chip
                     * out through the right-hand edge.
                     */
                    className="figure min-w-0 flex-1 text-xl font-semibold text-ink"
                  >
                    {status === "loading" && converted == null ? (
                      <span className="skeleton inline-block h-7 w-24 rounded" />
                    ) : status === "error" ? null : (
                      converted
                    )}
                  </output>
                  <label htmlFor="fx-to" className="sr-only">
                    To currency
                  </label>
                  <Select
                    variant="chip"
                    id="fx-to"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  >
                    {FX_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </Select>
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
                    <span className="figure font-semibold tabular-nums text-ink">
                      {rate.toFixed(4)}
                    </span>{" "}
                    {toCcy.code}
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
                <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card bg-surface-tint-2 text-center">
                  <p className="max-w-xs px-4 text-sm text-ink-muted">{errorMsg}</p>
                  <button
                    type="button"
                    onClick={load}
                    className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-on-brand hover:bg-brand-deep"
                  >
                    Try again
                  </button>
                </div>
              ) : points.length > 0 ? (
                <RateChart points={points} from={from} to={to} />
              ) : (
                <div className="skeleton h-full w-full rounded-card" />
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
                    range === r.id
                      ? "bg-cta-gradient text-on-brand"
                      : "text-ink-muted hover:bg-ink/5 hover:text-ink",
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
