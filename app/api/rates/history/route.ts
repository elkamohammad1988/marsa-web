import { NextResponse } from "next/server";
import { getSeries, isRangeId, FxError, type RangeId } from "@/lib/fx";

export async function GET(request: Request) {
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
