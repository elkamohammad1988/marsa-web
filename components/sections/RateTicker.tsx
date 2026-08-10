import { Container } from "@/components/ui/Container";
import { getRates, FX_CURRENCIES } from "@/lib/fx";

const TICKER_SYMBOLS = [
  "USD",
  "GBP",
  "CHF",
  "PLN",
  "SEK",
  "CZK",
  "RON",
  "TRY",
  "CAD",
  "AUD",
  "JPY",
  "NOK",
];

const FLAGS = new Map(FX_CURRENCIES.map((c) => [c.code, c.flag]));

function formatRate(rate: number): string {
  const digits = rate >= 100 ? 2 : rate >= 10 ? 3 : 4;
  return rate.toFixed(digits);
}

/**
 * Live ECB reference rates, rendered server-side and revalidated hourly by the
 * fetch cache in `lib/fx`.
 *
 * The ECB publishes once per business day, so the strip is labelled with the
 * actual publication date rather than implying streaming prices. If the
 * provider is unreachable the section renders nothing at all — a broken
 * ticker is worse than no ticker.
 */
export async function RateTicker() {
  const data = await getRates("EUR", TICKER_SYMBOLS);
  if (!data) return null;

  const published = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${data.date}T00:00:00Z`));

  const items = data.quotes.map((q) => ({
    ...q,
    flag: FLAGS.get(q.code) ?? "",
  }));

  return (
    <section
      className="seam-top relative isolate border-b border-line bg-canvas py-5"
      aria-label="Live exchange rates"
    >
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <p className="flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            ECB rates · {published}
          </p>

          {/*
            Two things make a marquee edge read as a fade rather than as a bug,
            and this had neither.

            The ramp was 6% — about 68px against a ~140px pill — so an item
            arriving was still half-legible where it was meant to be gone: what
            rendered beside the label was a dangling "1515", the tail of EUR/USD
            1.1515, with a hard-cut "CZ" at the other end. The ramp is now sized
            in pixels rather than percent, because what it has to out-run is the
            width of a pill, and that does not scale with the container.

            The ramp alone was not enough. A half-dissolved pill sitting 24px
            from a static label of the same size reads as broken text, not as
            content entering — there was nothing to say the two belonged to
            different zones. The rule gives the strip an edge to arrive from, so
            the fade becomes an obvious consequence of it. Below `sm` the label
            stacks above the strip and the rule would be pointing the wrong way,
            so it starts at `sm` with the row.
          */}
          {/*
            The rule and the mask cannot live on the same element: a mask
            applies over the border box, so a `border-l` at x=0 sits exactly
            where the ramp's alpha is 0 and the rule erases itself. The outer
            div owns the edge, the inner one owns the fade.
          */}
          <div className="min-w-0 flex-1 sm:border-l sm:border-line sm:pl-6">
            <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent_0,#000_150px,#000_calc(100%_-_150px),transparent_100%)]">
              <ul className="flex w-max animate-marquee items-center gap-x-8 pr-8 group-hover:[animation-play-state:paused]">
                {[...items, ...items].map((q, i) => (
                  <li
                    key={`${q.code}-${i}`}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line/60 bg-surface-tint-2/70 px-3 py-1.5 text-sm transition-colors duration-200 hover:border-brand-strong/40"
                    aria-hidden={i >= items.length}
                  >
                    <span aria-hidden>{q.flag}</span>
                    <span className="font-medium text-ink-muted">EUR/{q.code}</span>
                    <span className="font-semibold tabular-nums text-ink">
                      {formatRate(q.rate)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
