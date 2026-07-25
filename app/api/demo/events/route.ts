import { NextResponse } from "next/server";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { getAnalyticsStore, isFunnelStep } from "@/lib/analytics";

export const runtime = "nodejs";

/**
 * Records one anonymous /demo funnel event: `{ sessionId, step }`.
 *
 * First-party only. No cookies, no PII — the sessionId is a random id the
 * client mints per visit. Best-effort: any failure still returns 204 so the
 * demo never sees an error from telemetry.
 */
export async function POST(request: Request) {
  const rl = rateLimit(clientKey(request.headers, "demo-events"), { limit: 40, windowMs: 60_000 });
  if (!rl.ok) return new NextResponse(null, { status: 204 });

  try {
    const body = (await request.json()) as { sessionId?: unknown; step?: unknown };
    const step = body?.step;
    const sessionId = body?.sessionId;

    if (
      isFunnelStep(step) &&
      typeof sessionId === "string" &&
      sessionId.length > 0 &&
      sessionId.length <= 64
    ) {
      await getAnalyticsStore().record({
        sessionId,
        step,
        at: new Date().toISOString(),
      });
    }
  } catch {
    // ignore — telemetry is never allowed to fail the request
  }

  return new NextResponse(null, { status: 204 });
}
