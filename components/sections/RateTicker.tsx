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
    <section className="border-y border-line bg-canvas py-4" aria-label="Live exchange rates">
      <Container>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <p className="flex shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-ink-subtle">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-glow-pulse rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            ECB rates · {published}
          </p>

          <div className="group relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <ul className="flex w-max animate-marquee items-center gap-x-8 pr-8 group-hover:[animation-play-state:paused]">
              {[...items, ...items].map((q, i) => (
                <li
                  key={`${q.code}-${i}`}
                  className="flex items-center gap-2 whitespace-nowrap text-sm"
                  aria-hidden={i >= items.length}
                >
                  <span aria-hidden>{q.flag}</span>
                  <span className="font-medium text-ink-muted">EUR/{q.code}</span>
                  <span className="font-semibold tabular-nums text-ink">{formatRate(q.rate)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
