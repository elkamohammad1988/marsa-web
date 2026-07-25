import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  checkPassword,
  createSessionToken,
  getAdminConfig,
  sessionCookieOptions,
} from "@/lib/admin-auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Password login for the admin area.
 *
 * Rate-limited per IP (in-memory is the right tier here: it must keep working
 * even when the database is the thing that is broken) and deliberately vague in
 * its failure message — no distinction between "admin disabled" and "wrong
 * password" leaks to an attacker.
 */
export async function POST(request: Request) {
  const rl = rateLimit(clientKey(request.headers, "admin-login"), {
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: { "Retry-After": "60" } },
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
