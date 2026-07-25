import { NextResponse } from "next/server";
import { getSeries, isRangeId, FxError, type RangeId } from "@/lib/fx";
import { rateLimitShared, clientKey } from "@/lib/rate-limit";
import { RATES_RATE_LIMIT, tooManyRequests } from "@/lib/api-rate-limit";

export async function GET(request: Request) {
  // Six ranges multiply the enumerable key space to 5,400 (audit S6). Shares
  // the "rates" scope with /api/rates deliberately: the upstream fair-use
  // budget is one budget, so one caller should not get double the allowance by
  // alternating between the two endpoints.
  const limit = await rateLimitShared(clientKey(request.headers, "rates"), RATES_RATE_LIMIT);
  if (!limit.ok) return tooManyRequests(limit.resetAt, "Too many rate lookups. Try again shortly.");

  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "EUR").toUpperCase();
  const to = (searchParams.get("to") ?? "USD").toUpperCase();
  const rangeParam = searchParams.get("range") ?? "1M";
  const range: RangeId = isRangeId(rangeParam) ? rangeParam : "1M";

  try {
    const data = await getSeries(from, to, range);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    const status = err instanceof FxError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Could not load rate history.";
    return NextResponse.json({ error: message }, { status });
  }
}
