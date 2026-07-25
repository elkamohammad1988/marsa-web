/**
 * Live foreign-exchange data client.
 *
 * Rates come from the Frankfurter API (https://frankfurter.dev), which serves
 * European Central Bank reference rates — free, key-less, and updated on every
 * ECB working day. Responses are cached for an hour via the fetch cache since
 * the ECB publishes at most once per day (~16:00 CET).
 */

const FX_BASE = process.env.FX_API_BASE ?? "https://api.frankfurter.dev/v1";

export type Currency = { code: string; label: string; flag: string };

/** The 30 currencies the ECB / Frankfurter publishes, majors first. */
export const FX_CURRENCIES: Currency[] = [
  { code: "EUR", label: "Euro", flag: "🇪🇺" },
  { code: "USD", label: "US Dollar", flag: "🇺🇸" },
  { code: "GBP", label: "British Pound", flag: "🇬🇧" },
  { code: "JPY", label: "Japanese Yen", flag: "🇯🇵" },
  { code: "CHF", label: "Swiss Franc", flag: "🇨🇭" },
  { code: "AUD", label: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", label: "Canadian Dollar", flag: "🇨🇦" },
  { code: "CNY", label: "Chinese Yuan", flag: "🇨🇳" },
  { code: "BRL", label: "Brazilian Real", flag: "🇧🇷" },
  { code: "CZK", label: "Czech Koruna", flag: "🇨🇿" },
  { code: "DKK", label: "Danish Krone", flag: "🇩🇰" },
  { code: "HKD", label: "Hong Kong Dollar", flag: "🇭🇰" },
  { code: "HUF", label: "Hungarian Forint", flag: "🇭🇺" },
  { code: "IDR", label: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "ILS", label: "Israeli Shekel", flag: "🇮🇱" },
  { code: "INR", label: "Indian Rupee", flag: "🇮🇳" },
  { code: "ISK", label: "Icelandic Króna", flag: "🇮🇸" },
  { code: "KRW", label: "South Korean Won", flag: "🇰🇷" },
  { code: "MXN", label: "Mexican Peso", flag: "🇲🇽" },
  { code: "MYR", label: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "NOK", label: "Norwegian Krone", flag: "🇳🇴" },
  { code: "NZD", label: "New Zealand Dollar", flag: "🇳🇿" },
  { code: "PHP", label: "Philippine Peso", flag: "🇵🇭" },
  { code: "PLN", label: "Polish Złoty", flag: "🇵🇱" },
  { code: "RON", label: "Romanian Leu", flag: "🇷🇴" },
  { code: "SEK", label: "Swedish Krona", flag: "🇸🇪" },
  { code: "SGD", label: "Singapore Dollar", flag: "🇸🇬" },
  { code: "THB", label: "Thai Baht", flag: "🇹🇭" },
  { code: "TRY", label: "Turkish Lira", flag: "🇹🇷" },
  { code: "ZAR", label: "South African Rand", flag: "🇿🇦" },
];

const SUPPORTED = new Set(FX_CURRENCIES.map((c) => c.code));

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED.has(code.toUpperCase());
}

/**
 * Currencies conventionally shown without minor units. (ISO 4217 assigns HUF
 * and KRW two decimals, but they are almost always displayed as whole units.)
 */
export const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "HUF", "KRW"]);

export function currencyFractionDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/** Format a plain converted amount (no currency symbol), rounded per currency. */
export function formatAmount(value: number, currency: string): string {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** Format an amount with its currency symbol, rounded per currency. */
export function formatCurrency(value: number, currency: string): string {
  const digits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export type RangeId = "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export const FX_RANGES: { id: RangeId; label: string }[] = [
  { id: "1W", label: "1W" },
  { id: "1M", label: "1M" },
  { id: "3M", label: "3M" },
  { id: "6M", label: "6M" },
  { id: "1Y", label: "1Y" },
  { id: "5Y", label: "5Y" },
];

const RANGE_IDS = new Set(FX_RANGES.map((r) => r.id));
export function isRangeId(value: string): value is RangeId {
  return RANGE_IDS.has(value as RangeId);
}

export type FxPoint = { x: string; y: number };
export type FxSeries = {
  from: string;
  to: string;
  range: RangeId;
  rate: number;
  date: string;
  points: FxPoint[];
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeStart(range: RangeId, now: Date): Date {
  const d = new Date(now);
  switch (range) {
    case "1W":
      d.setDate(d.getDate() - 7);
      break;
    case "1M":
      d.setMonth(d.getMonth() - 1);
      break;
    case "3M":
      d.setMonth(d.getMonth() - 3);
      break;
    case "6M":
      d.setMonth(d.getMonth() - 6);
      break;
    case "1Y":
      d.setFullYear(d.getFullYear() - 1);
      break;
    case "5Y":
      d.setFullYear(d.getFullYear() - 5);
      break;
  }
  return d;
}

function labelFor(dateIso: string, range: RangeId): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const opts: Intl.DateTimeFormatOptions =
    range === "1W" || range === "1M"
      ? { day: "numeric", month: "short", timeZone: "UTC" }
      : { month: "short", year: "2-digit", timeZone: "UTC" };
  return new Intl.DateTimeFormat("en-GB", opts).format(d);
}

/** Evenly downsample a series to at most `max` points, always keeping the last. */
function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) return items;
  const step = (items.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(items[Math.round(i * step)]);
  out[out.length - 1] = items[items.length - 1];
  return out;
}

async function fxFetch(path: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(`${FX_BASE}${path}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      // Cache upstream responses for an hour (ECB updates at most daily).
      next: { revalidate: 3600 },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export class FxError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "FxError";
  }
}

export async function getLatestRate(from: string, to: string): Promise<{ rate: number; date: string }> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (!isSupportedCurrency(f) || !isSupportedCurrency(t))
    throw new FxError("Unsupported currency.", 400);

  const today = isoDate(new Date());
  if (f === t) return { rate: 1, date: today };

  const res = await fxFetch(`/latest?base=${f}&symbols=${t}`);
  if (!res.ok) throw new FxError(`FX provider returned ${res.status}`);
  const json = (await res.json()) as { date?: string; rates?: Record<string, number> };
  const rate = json.rates?.[t];
  if (typeof rate !== "number") throw new FxError("Rate unavailable for this pair.");
  return { rate, date: json.date ?? today };
}

export type RateQuote = { code: string; rate: number };

/**
 * Fetch several rates against one base in a single upstream call — used by the
 * homepage ticker, where one request per pair would be wasteful.
 *
 * Returns `null` instead of throwing: a decorative ticker must never be able
 * to take a page down. Callers render a fallback when they get null.
 */
export async function getRates(
  base: string,
  symbols: string[],
): Promise<{ date: string; quotes: RateQuote[] } | null> {
  const b = base.toUpperCase();
  const wanted = symbols.map((s) => s.toUpperCase()).filter((s) => s !== b && isSupportedCurrency(s));
  if (!isSupportedCurrency(b) || wanted.length === 0) return null;

  try {
    const res = await fxFetch(`/latest?base=${b}&symbols=${wanted.join(",")}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { date?: string; rates?: Record<string, number> };
    const rates = json.rates ?? {};
    const quotes = wanted
      .map((code) => ({ code, rate: rates[code] }))
      .filter((q): q is RateQuote => typeof q.rate === "number");
    if (!quotes.length) return null;
    return { date: json.date ?? isoDate(new Date()), quotes };
  } catch {
    return null;
  }
}

export async function getSeries(from: string, to: string, range: RangeId): Promise<FxSeries> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (!isSupportedCurrency(f) || !isSupportedCurrency(t))
    throw new FxError("Unsupported currency.", 400);
  if (!isRangeId(range)) throw new FxError("Unsupported range.", 400);

  const now = new Date();
  const today = isoDate(now);

  if (f === t) {
    const start = rangeStart(range, now);
    const points: FxPoint[] = [
      { x: labelFor(isoDate(start), range), y: 1 },
      { x: labelFor(today, range), y: 1 },
    ];
    return { from: f, to: t, range, rate: 1, date: today, points };
  }

  const start = isoDate(rangeStart(range, now));
  const res = await fxFetch(`/${start}..${today}?base=${f}&symbols=${t}`);
  if (!res.ok) throw new FxError(`FX provider returned ${res.status}`);
  const json = (await res.json()) as { rates?: Record<string, Record<string, number>> };
  const rates = json.rates ?? {};

  const rows = Object.keys(rates)
    .sort()
    .map((date) => ({ date, value: rates[date]?.[t] }))
    .filter((r): r is { date: string; value: number } => typeof r.value === "number");

  if (!rows.length) throw new FxError("No historical data for this pair.");

  const sampled = downsample(rows, 70);
  const points: FxPoint[] = sampled.map((r) => ({ x: labelFor(r.date, range), y: r.value }));
  const last = rows[rows.length - 1];

  return { from: f, to: t, range, rate: last.value, date: last.date, points };
}
