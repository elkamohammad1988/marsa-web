import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionToken,
  getAdminConfig,
  sessionCookieOptions,
} from "@/lib/admin-auth";
import { clientKey } from "@/lib/rate-limit";
import {
  ADMIN_LOGIN_TIERS,
  ADMIN_LOGIN_GLOBAL,
  checkTiers,
  retryAfterSeconds,
} from "@/lib/api-rate-limit";

export const runtime = "nodejs";

/**
 * Password login for the admin area.
 *
 * Deliberately vague in its failure message — no distinction between "admin
 * disabled" and "wrong password" leaks to an attacker.
 *
 * The limiter is `rateLimitShared`, not `rateLimit` (audit S1). The previous
 * comment argued in-memory was correct here "because it must keep working even
 * when the database is the thing that is broken". That property is real, and
 * `rateLimitShared` already provides it: on any RPC failure it logs and returns
 * the in-memory result. What in-memory alone could not provide is a limit that
 * holds across instances — its buckets live in a module-level Map, so every
 * concurrent serverless instance enforced its own 5-per-minute window, and
 * concurrency is attacker-controllable. The effective ceiling was 5/min ×
 * instances, not 5/min.
 */
export async function POST(request: Request) {
  const ip = clientKey(request.headers, "");

  // Every tier on every attempt, plus a global ceiling for attempts spread
  // across many addresses. Checked together so the response can name the
  // longest wait rather than the first one that tripped. The loop that does it
  // moved to `checkTiers` when the customer sign-in route needed the same
  // shape; the tiers themselves are still this route's own.
  const limit = await checkTiers(ip, ADMIN_LOGIN_TIERS, ADMIN_LOGIN_GLOBAL);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: {
          "retry-after": String(retryAfterSeconds(limit.resetAt)),
          "cache-control": "no-store",
        },
      },
    );
  }

  const config = getAdminConfig();

  let password: unknown;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!config || !(await checkPassword(password, config))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const { token, maxAge } = await createSessionToken(config.secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(maxAge));
  return response;
}
