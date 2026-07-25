import { NextResponse } from "next/server";
import { getLatestRate, FxError } from "@/lib/fx";
import { rateLimitShared, clientKey } from "@/lib/rate-limit";
import { RATES_RATE_LIMIT, tooManyRequests } from "@/lib/api-rate-limit";

export async function GET(request: Request) {
  // 30 currencies squared is 900 distinct cache keys an anonymous caller can
  // enumerate, each one a fresh request to a key-less, fair-use upstream from
  // our egress IP. Getting throttled there degrades the ticker, the converter
  // and the demo at once (audit S6). 60/minute costs a real user nothing.
  const limit = await rateLimitShared(clientKey(request.headers, "rates"), RATES_RATE_LIMIT);
  if (!limit.ok) return tooManyRequests(limit.resetAt, "Too many rate lookups. Try again shortly.");

  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "EUR").toUpperCase();
  const to = (searchParams.get("to") ?? "USD").toUpperCase();

  try {
    const data = await getLatestRate(from, to);
    return NextResponse.json(
      { from, to, ...data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    const status = err instanceof FxError ? err.status : 502;
    const message = err instanceof Error ? err.message : "Could not load exchange rate.";
    return NextResponse.json({ error: message }, { status });
  }
}
