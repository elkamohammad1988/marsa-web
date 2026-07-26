import { getPostgrestConfig, rpc } from "@/lib/postgrest";
import { captureException } from "@/lib/observability";

/**
 * Fixed-window rate limiting, in two tiers.
 *
 * `rateLimit` is an in-memory counter: dependency-free and instant, but each
 * serverless instance keeps its own map, so it is a speed bump rather than a
 * guarantee.
 *
 * `rateLimitShared` upgrades that to a cross-instance limit by calling the
 * `check_rate_limit` Postgres function (see db/migrations/) when a database is
 * configured. If the database is unreachable it degrades to the in-memory
 * result rather than locking everybody out — a form that rejects real users is
 * a worse outcome than one that lets a burst through.
 */

type Bucket = { count: number; resetAt: number };

const hits = new Map<string, Bucket>();

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetAt: number;
};

export function rateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const now = Date.now();
  const existing = hits.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    hits.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  existing.count += 1;
  const ok = existing.count <= limit;
  return { ok, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}

export async function rateLimitShared(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  const local = rateLimit(key, { limit, windowMs });
  if (!local.ok) return local; // already over the limit on this instance

  const cfg = getPostgrestConfig();
  if (!cfg) return local;

  try {
    const remaining = await rpc<number>(cfg, "check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });
    if (typeof remaining !== "number") return local;
    return { ok: remaining >= 0, remaining: Math.max(0, remaining), resetAt: local.resetAt };
  } catch (err) {
    // Degraded, not broken: the in-memory window still applies, but it is
    // per-instance, so the effective ceiling is now limit × instances. That is
    // the right runtime behaviour and the wrong thing to be unaware of — it is
    // exactly the weakness S1 was about, arriving silently.
    captureException(err, {
      event: "rateLimit.degraded",
      severity: "warning",
      scope: key.split(":")[0],
      fallback: "in-memory window, per instance",
    });
    return local;
  }
}

/** Extract a best-effort client identifier from request headers. */
export function clientKey(headers: Headers, scope: string): string {
  const forwarded = headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0]?.trim() : "") ||
    headers.get("x-real-ip") ||
    "anonymous";
  return `${scope}:${ip}`;
}

/**
 * Periodically drop expired buckets so the map does not grow unbounded on a
 * long-lived server. Guarded so it never keeps the process alive.
 */
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of hits) {
      if (bucket.resetAt <= now) hits.delete(key);
    }
  }, 5 * 60_000);
  // Node-only: don't block process exit on this housekeeping timer.
  (timer as unknown as { unref?: () => void }).unref?.();
}
