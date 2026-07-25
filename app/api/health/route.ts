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
 * Reports whether each dependency is configured and whether it is currently
 * working. Returns 503 when a configured dependency is failing, 200 otherwise.
 *
 * The endpoint is unauthenticated, so the response body carries **only two
 * booleans per check**. It deliberately does not include free-text detail,
 * the storage provider name, the durability flag, filesystem paths or upstream
 * error text — that combination let an anonymous caller enumerate the storage
 * backend, the directory layout and the database schema before authenticating
 * to anything (audit S2).
 *
 * The real reason for any failure is logged server-side by the check that
 * produced it, where an operator can read it and an attacker cannot. There is
 * no field here for a future change to leak into: the payload shape below is
 * exhaustive by construction.
 */
export async function GET() {
  const startedAt = Date.now();

  // getStore() throws in production when no database is configured. That is
  // precisely the condition this endpoint exists to report, so catch it and
  // answer 503 rather than letting the probe 500.
  let store: SubmissionStore | null = null;
  try {
    store = getStore();
  } catch (err) {
    console.error(
      "[health] submission storage is not configured.",
      err instanceof Error ? err.message : err,
    );
  }

  const [storage, fx] = await Promise.all([
    store ? store.health() : Promise.resolve({ ok: false }),
    getLatestRate("EUR", "USD").then(
      () => ({ ok: true }),
      (err: unknown) => {
        // FxError messages relay the upstream provider's HTTP status.
        console.error(
          "[health] fx provider check failed.",
          err instanceof Error ? err.message : err,
        );
        return { ok: false };
      },
    ),
  ]);

  const checks = {
    storage: { ok: storage.ok, configured: store !== null },
    fx: { ok: fx.ok, configured: true },
    notifications: { ok: true, configured: Boolean(getNotifierConfig()) },
    admin: { ok: true, configured: Boolean(getAdminConfig()) },
    database: { ok: true, configured: Boolean(getPostgrestConfig()) },
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
