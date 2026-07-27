import { describe, it, expect, vi, afterEach } from "vitest";
import { NextResponse } from "next/server";
import {
  attachSession,
  decodeSession,
  detachSession,
  encodeSession,
  MAX_COOKIE_BYTES,
  needsRefresh,
  remainingSeconds,
  sessionFromGoTrue,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SessionTooLargeError,
  type UserSession,
} from "@/lib/auth-session";
import type { GoTrueSession } from "@/lib/gotrue";

/**
 * The session envelope is the whole authentication boundary in one value: if a
 * cookie can be forged, edited or outlived, every other control in this
 * milestone is decoration.
 *
 * Asserted at the boundary an attacker meets — what a cookie value produces —
 * rather than at the shape of the internals.
 */

const SECRET = "0123456789abcdef0123456789abcdef";
const OTHER_SECRET = "ffffffffffffffffffffffffffffffff";
const NOW = 1_800_000_000_000; // fixed, so no assertion depends on the clock

function session(overrides: Partial<UserSession> = {}): UserSession {
  const seconds = Math.floor(NOW / 1000);
  return {
    userId: "11111111-2222-3333-4444-555555555555",
    email: "person@example.com",
    role: "user",
    accessToken: "header.payload.signature",
    refreshToken: "refresh-token",
    accessExpiresAt: seconds + 3600,
    expiresAt: seconds + SESSION_TTL_SECONDS,
    ...overrides,
  };
}

function goTrue(overrides: Partial<GoTrueSession> = {}): GoTrueSession {
  return {
    access_token: "access",
    refresh_token: "refresh",
    expires_in: 3600,
    token_type: "bearer",
    user: { id: "user-id", email: "person@example.com" },
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a session survives a round trip and nothing else does", () => {
  it("decodes exactly what was encoded", async () => {
    const original = session();
    const decoded = await decodeSession(await encodeSession(original, SECRET), SECRET, NOW);
    expect(decoded).toEqual(original);
  });

  it("refuses a cookie signed with another secret", async () => {
    const cookie = await encodeSession(session(), OTHER_SECRET);
    expect(await decodeSession(cookie, SECRET, NOW)).toBeNull();
  });

  it("refuses an edited payload", async () => {
    // The attack the signature exists for: promote yourself by editing the
    // role in a cookie you already hold.
    const cookie = await encodeSession(session(), SECRET);
    const [payload, signature] = [
      cookie.slice(0, cookie.lastIndexOf(".")),
      cookie.slice(cookie.lastIndexOf(".") + 1),
    ];
    const forged = await encodeSession(session({ role: "admin" }), OTHER_SECRET);
    const forgedPayload = forged.slice(0, forged.lastIndexOf("."));

    expect(forgedPayload).not.toBe(payload);
    expect(await decodeSession(`${forgedPayload}.${signature}`, SECRET, NOW)).toBeNull();
  });

  it("refuses a cookie with no signature at all", async () => {
    const cookie = await encodeSession(session(), SECRET);
    const payload = cookie.slice(0, cookie.lastIndexOf("."));
    expect(await decodeSession(payload, SECRET, NOW)).toBeNull();
  });

  it("refuses missing, empty and malformed cookies", async () => {
    for (const value of [undefined, "", "nonsense", ".", "a.b.c"]) {
      expect(await decodeSession(value, SECRET, NOW), String(value)).toBeNull();
    }
  });

  it("refuses a correctly signed payload that is not a session", async () => {
    // Signed by us, so the signature checks out — and still not something the
    // rest of the application could use. `decodeSession` is the only place
    // that shape is verified, so it verifies it rather than trusting it.
    const { signPayload } = await import("@/lib/signed-cookie");
    const payload = btoa(JSON.stringify({ userId: 42 })).replace(/=+$/, "");
    expect(await decodeSession(await signPayload(payload, SECRET), SECRET, NOW)).toBeNull();
  });
});

describe("expiry", () => {
  it("refuses a session past its absolute lifetime", async () => {
    const expired = session({ expiresAt: Math.floor(NOW / 1000) - 1 });
    const cookie = await encodeSession(expired, SECRET);
    expect(await decodeSession(cookie, SECRET, NOW)).toBeNull();
  });

  it("accepts one that expires a second from now", async () => {
    const cookie = await encodeSession(session({ expiresAt: Math.floor(NOW / 1000) + 1 }), SECRET);
    expect(await decodeSession(cookie, SECRET, NOW)).not.toBeNull();
  });

  it("asks for a refresh only inside the threshold", () => {
    const seconds = Math.floor(NOW / 1000);
    expect(needsRefresh(session({ accessExpiresAt: seconds + 3600 }), NOW)).toBe(false);
    expect(needsRefresh(session({ accessExpiresAt: seconds + 61 }), NOW)).toBe(false);
    expect(needsRefresh(session({ accessExpiresAt: seconds + 60 }), NOW)).toBe(true);
    expect(needsRefresh(session({ accessExpiresAt: seconds - 1 }), NOW)).toBe(true);
  });

  it("reports the remaining lifetime, never a negative one", () => {
    const seconds = Math.floor(NOW / 1000);
    expect(remainingSeconds(session({ expiresAt: seconds + 100 }), NOW)).toBe(100);
    expect(remainingSeconds(session({ expiresAt: seconds - 100 }), NOW)).toBe(0);
  });
});

describe("a role is narrowed, never trusted", () => {
  it("reduces a role this build does not know to the least-privileged one", async () => {
    // Not reachable by editing the cookie — that breaks the signature — but
    // reachable by a downgrade, or by a database that grew a role this build
    // predates. Either way the answer is "user", not "whatever it said".
    const { signPayload } = await import("@/lib/signed-cookie");
    const payload = btoa(JSON.stringify({ ...session(), role: "superuser" })).replace(/=+$/, "");
    const decoded = await decodeSession(await signPayload(payload, SECRET), SECRET, NOW);
    expect(decoded?.role).toBe("user");
  });
});

describe("sessionFromGoTrue", () => {
  it("dates the access token from the expiry GoTrue reported", () => {
    const built = sessionFromGoTrue(goTrue({ expires_in: 900 }), "user", { now: NOW });
    expect(built.accessExpiresAt).toBe(Math.floor(NOW / 1000) + 900);
  });

  it("starts the absolute clock on a first sign-in", () => {
    const built = sessionFromGoTrue(goTrue(), "user", { now: NOW });
    expect(built.expiresAt).toBe(Math.floor(NOW / 1000) + SESSION_TTL_SECONDS);
  });

  it("keeps the original ceiling when a session is renewed", () => {
    // The property that makes the absolute lifetime mean anything: if a
    // refresh reset it, a session in daily use would never end, and a stolen
    // refresh token would be good forever.
    const original = session();
    const renewed = sessionFromGoTrue(goTrue(), "user", {
      now: NOW + 3_600_000,
      expiresAt: original.expiresAt,
    });
    expect(renewed.expiresAt).toBe(original.expiresAt);
    expect(renewed.accessExpiresAt).toBeGreaterThan(original.accessExpiresAt);
  });

  it("carries the role it was given rather than reading one from the token", () => {
    expect(sessionFromGoTrue(goTrue(), "admin", { now: NOW }).role).toBe("admin");
  });
});

describe("the cookie a browser is given", () => {
  it("is httpOnly, lax and scoped to the whole site", async () => {
    const response = NextResponse.json({});
    await attachSession(response, session(), SECRET, NOW);

    const cookie = response.cookies.get(SESSION_COOKIE);
    // httpOnly is what stops an XSS bug reading the session; lax is what stops
    // a cross-site POST carrying it.
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
  });

  it("requires TLS in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = NextResponse.json({});
    await attachSession(response, session(), SECRET, NOW);
    expect(response.cookies.get(SESSION_COOKIE)?.secure).toBe(true);
  });

  it("expires with the session rather than with the access token", async () => {
    const response = NextResponse.json({});
    const value = session({ expiresAt: Math.floor(NOW / 1000) + 1000 });
    await attachSession(response, value, SECRET, NOW);
    expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(1000);
  });

  it("is cleared with the same attributes it was set with", async () => {
    // A Set-Cookie only removes a cookie when path and domain match the one
    // that created it — a mismatch leaves the session in place while the
    // response claims to have ended it.
    const response = NextResponse.json({});
    detachSession(response);
    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
    expect(cookie?.path).toBe("/");
    expect(cookie?.httpOnly).toBe(true);
  });
});

describe("the 4 KB cookie ceiling", () => {
  it("refuses to issue a cookie a browser would silently drop", async () => {
    // The failure this exists to prevent looks like nothing: an oversized
    // cookie is discarded without an error, so the person appears to sign in
    // and lands back on the sign-in page, forever, with no log line anywhere.
    const oversized = session({ accessToken: "x".repeat(MAX_COOKIE_BYTES) });
    await expect(encodeSession(oversized, SECRET)).rejects.toBeInstanceOf(SessionTooLargeError);
  });

  it("leaves room for a realistic Supabase token", async () => {
    // A Supabase access token is a JWT of roughly this size; the envelope must
    // not be the thing that makes an ordinary session too big.
    const realistic = session({ accessToken: "x".repeat(1200), refreshToken: "y".repeat(64) });
    const cookie = await encodeSession(realistic, SECRET);
    expect(cookie.length).toBeLessThan(MAX_COOKIE_BYTES);
  });
});
