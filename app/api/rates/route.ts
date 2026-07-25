import { NextResponse } from "next/server";
import { getLatestRate, FxError } from "@/lib/fx";

export async function GET(request: Request) {
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
