import { NextResponse } from "next/server";
import { getStore, type SubmissionStore } from "@/lib/storage";
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
  const startedAt = Date.now();

  // getStore() now throws in production when no database is configured. That
  // is precisely the condition this endpoint exists to report, so catch it and
  // answer 503 with the reason rather than letting the probe 500.
  let store: SubmissionStore | null = null;
  let storeError: string | null = null;
  try {
    store = getStore();
  } catch (err) {
    storeError =
      err instanceof Error ? err.message : "submission storage is not configured";
  }

  const [storage, fx] = await Promise.all([
    store ? store.health() : Promise.resolve({ ok: false, detail: storeError ?? undefined }),
    getLatestRate("EUR", "USD").then(
      (r) => ({ ok: true, detail: `ECB rates as of ${r.date}` }),
      (err: unknown) => ({
        ok: false,
        detail: err instanceof Error ? err.message : "FX provider unreachable",
      }),
    ),
  ]);

  const checks = {
    storage: {
      ...storage,
      provider: store?.provider ?? "none",
      durable: store?.durable ?? false,
    },
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
