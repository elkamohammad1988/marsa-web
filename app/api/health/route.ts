import { NextResponse } from "next/server";
import { getStore } from "@/lib/storage";
import { getNotifierConfig } from "@/lib/notify";
import { getAdminConfig } from "@/lib/admin-auth";
import { getPostgrestConfig } from "@/lib/postgrest";
import { getLatestRate } from "@/lib/fx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Operational health check for uptime monitors and deploy smoke tests.
 *
 * Reports which providers are actually wired up — the honest answer to "is
 * this deployment real or is it still running on defaults?". Returns 503 when
 * a configured dependency is failing, 200 otherwise. It never reveals
 * credentials, only whether each one is present.
 */
export async function GET() {
  const store = getStore();
  const startedAt = Date.now();

  const [storage, fx] = await Promise.all([
    store.health(),
    getLatestRate("EUR", "USD").then(
      (r) => ({ ok: true, detail: `ECB rates as of ${r.date}` }),
      (err: unknown) => ({
        ok: false,
        detail: err instanceof Error ? err.message : "FX provider unreachable",
      }),
    ),
  ]);

  const checks = {
    storage: { ...storage, provider: store.provider, durable: store.durable },
    fx,
    notifications: {
      ok: true,
      configured: Boolean(getNotifierConfig()),
      detail: getNotifierConfig() ? "resend configured" : "not configured (submissions still stored)",
    },
    admin: {
      ok: true,
      configured: Boolean(getAdminConfig()),
      detail: getAdminConfig() ? "admin enabled" : "admin disabled (no credentials set)",
    },
    database: {
      ok: true,
      configured: Boolean(getPostgrestConfig()),
      detail: getPostgrestConfig() ? "postgres configured" : "using the local file store",
    },
  };

  const healthy = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      tookMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "cache-control": "no-store" },
    },
  );
}
