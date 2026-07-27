import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware, config as middlewareConfig } from "@/middleware";
import {
  encodeSession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  type UserSession,
} from "@/lib/auth-session";
import { GOVERNED_PREFIXES } from "@/lib/auth-routes";
import type { Role } from "@/lib/auth-roles";

/**
 * The customer authentication boundary, asserted where an attacker meets it:
 * the status code, the redirect and the `Set-Cookie`, not the shape of the
 * internals.
 *
 * This is the counterpart to the admin half in `tests/admin-boundary.test.ts`,
 * which still passes unchanged — the two gates share a file and must not have
 * become entangled.
 */

const SECRET = "0123456789abcdef0123456789abcdef";
const ORIGIN = "https://marsa.money";

function configureAuth() {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("AUTH_SESSION_SECRET", SECRET);
}

async function cookieFor(
  overrides: Partial<UserSession> = {},
  now = Date.now(),
): Promise<string> {
  const seconds = Math.floor(now / 1000);
  return encodeSession(
    {
      userId: "11111111-2222-3333-4444-555555555555",
      email: "person@example.com",
      role: "user",
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessExpiresAt: seconds + 3600,
      expiresAt: seconds + SESSION_TTL_SECONDS,
      ...overrides,
    },
    SECRET,
  );
}

function request(pathname: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(pathname, ORIGIN), {
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });
}

/** Where a redirect response points, as a path plus query. */
function location(response: Response): string {
  const url = new URL(response.headers.get("location")!);
  return `${url.pathname}${url.search}`;
}

/** The Set-Cookie for our session cookie, if the response carries one. */
function setCookie(response: Response): string | null {
  const header = response.headers.get("set-cookie");
  return header && header.includes(`${SESSION_COOKIE}=`) ? header : null;
}

beforeEach(() => {
  configureAuth();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the account area is closed to anonymous visitors", () => {
  it("sends a visitor to sign in, remembering where they were going", async () => {
    const response = await middleware(request("/account"));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/login?next=%2Faccount");
  });

  it("protects a page under /account that does not exist yet", async () => {
    // The reason the policy is a prefix table rather than a per-page call: a
    // page added later is protected by existing, and forgetting the check is
    // harmless because the request never reaches the handler.
    const response = await middleware(request("/account/some-future-page"));
    expect(response.status).toBe(307);
    expect(location(response)).toMatch(/^\/login\?/);
  });

  it("keeps the query string of the page it interrupted", async () => {
    const response = await middleware(request("/account/admin?page=2"));
    expect(location(response)).toBe("/login?next=%2Faccount%2Fadmin%3Fpage%3D2");
  });

  it("answers 401 rather than redirecting an API call", async () => {
    // A fetch cannot follow a redirect into HTML and make anything of it.
    const response = await middleware(request("/api/account/profile"));
    expect(response.status).toBe(401);
  });

  it("lets a valid session through", async () => {
    const response = await middleware(request("/account", await cookieFor()));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});

describe("a cookie that is not a session", () => {
  it("rejects one signed with another secret", async () => {
    const forged = await encodeSession(
      {
        userId: "u",
        email: "e@x.co",
        role: "admin",
        accessToken: "a",
        refreshToken: "r",
        accessExpiresAt: Math.floor(Date.now() / 1000) + 3600,
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      },
      "ffffffffffffffffffffffffffffffff",
    );
    const response = await middleware(request("/account", forged));
    expect(response.status).toBe(307);
  });

  it("rejects a session past its absolute lifetime", async () => {
    const stale = await cookieFor({ expiresAt: Math.floor(Date.now() / 1000) - 1 });
    const response = await middleware(request("/account", stale));
    expect(response.status).toBe(307);
  });

  it("clears an undecodable cookie, so one redirect does not become a loop", async () => {
    // Left behind by a rotated secret or a truncated write. Without clearing
    // it, every request re-reads the same rubbish and bounces again.
    const response = await middleware(request("/account", "not-a-session"));
    expect(response.status).toBe(307);
    expect(setCookie(response)).toContain("Max-Age=0");
  });
});

describe("a signed-in visitor is not shown the sign-in pages", () => {
  it.each(["/login", "/register", "/forgot-password"])("bounces them off %s", async (path) => {
    const response = await middleware(request(path, await cookieFor()));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/account");
  });

  it("leaves those pages reachable without a session", async () => {
    for (const path of ["/login", "/register", "/forgot-password"]) {
      const response = await middleware(request(path));
      expect(response.status, path).toBe(200);
      expect(response.headers.get("location"), path).toBeNull();
    }
  });

  it("still lets a signed-in visitor set a new password", async () => {
    // `/reset-password` is authenticated rather than guest-only: it is where a
    // recovery link lands, and the link's whole purpose is to mint a session
    // first. Making it guest-only would bounce every recovery.
    const response = await middleware(request("/reset-password", await cookieFor()));
    expect(response.status).toBe(200);
  });
});

describe("role gating", () => {
  async function directoryAs(role: Role) {
    return middleware(request("/account/admin", await cookieFor({ role })));
  }

  it("admits an administrator", async () => {
    const response = await directoryAs("admin");
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("turns a member back to their own account", async () => {
    // Not a dead end: they are signed in, they simply may not use this. The
    // database enforces the same thing independently — see the note in
    // app/account/admin/page.tsx — so this decides what is offered, not what
    // could be read.
    const response = await directoryAs("user");
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/account");
  });

  it("does not let the shorter /account prefix weaken the gate", async () => {
    // If the prefix match were first-wins rather than longest-wins, the
    // permission check would silently become a mere session check.
    const response = await middleware(request("/account/admin/anything", await cookieFor()));
    expect(response.status).toBe(307);
    expect(location(response)).toBe("/account");
  });
});

describe("renewing an access token", () => {
  /** The subset of `Response` the two clients under test actually read. */
  type UpstreamResponse = {
    ok: boolean;
    status: number;
    headers?: Headers;
    json?: () => Promise<unknown>;
    text: () => Promise<string>;
  };

  /** GoTrue answers the refresh; PostgREST answers the profile read. */
  function stubUpstream(options: { role?: string; refreshFails?: boolean } = {}) {
    return vi.fn(async (url: string): Promise<UpstreamResponse> => {
      if (String(url).includes("/auth/v1/token")) {
        if (options.refreshFails) {
          return { ok: false, status: 400, text: async () => '{"msg":"invalid refresh token"}' };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              access_token: "renewed-access",
              refresh_token: "renewed-refresh",
              expires_in: 3600,
              token_type: "bearer",
              user: { id: "11111111-2222-3333-4444-555555555555", email: "person@example.com" },
            }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-range": "0-0/1" }),
        json: async () => [
          {
            id: "11111111-2222-3333-4444-555555555555",
            email: "person@example.com",
            full_name: null,
            avatar_url: null,
            role: options.role ?? "user",
            created_at: "2026-01-01T00:00:00Z",
            updated_at: "2026-01-01T00:00:00Z",
          },
        ],
        text: async () => "",
      };
    });
  }

  it("renews a session whose access token is about to expire", async () => {
    const fetchMock = stubUpstream();
    vi.stubGlobal("fetch", fetchMock);

    const nearlyExpired = await cookieFor({ accessExpiresAt: Math.floor(Date.now() / 1000) + 10 });
    const response = await middleware(request("/account", nearlyExpired));

    expect(response.status).toBe(200);
    // A new cookie went back, so the next request does not have to renew again.
    expect(setCookie(response)).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie(response)).not.toContain("Max-Age=0");
  });

  it("does not renew a session with plenty of time left", async () => {
    const fetchMock = stubUpstream();
    vi.stubGlobal("fetch", fetchMock);

    const response = await middleware(request("/account", await cookieFor()));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(setCookie(response)).toBeNull();
  });

  it("re-reads the role while renewing, so a change takes effect within the hour", async () => {
    // Without this a demotion would sit unnoticed in a cookie for the whole
    // thirty-day session. The database is still the authority; this keeps what
    // the UI offers close to it.
    vi.stubGlobal("fetch", stubUpstream({ role: "user" }));

    const staleAdmin = await cookieFor({
      role: "admin",
      accessExpiresAt: Math.floor(Date.now() / 1000) + 10,
    });
    const response = await middleware(request("/account/admin", staleAdmin));

    expect(response.status).toBe(307);
    expect(location(response)).toBe("/account");
  });

  it("promotes within the hour too", async () => {
    vi.stubGlobal("fetch", stubUpstream({ role: "admin" }));

    const staleMember = await cookieFor({
      role: "user",
      accessExpiresAt: Math.floor(Date.now() / 1000) + 10,
    });
    const response = await middleware(request("/account/admin", staleMember));

    expect(response.status).toBe(200);
  });

  it("clears the session and explains itself when renewal is refused", async () => {
    // A refresh token is spent, revoked or timed out — none of them
    // retryable. The visitor gets one message they can act on rather than a
    // silent bounce.
    vi.stubGlobal("fetch", stubUpstream({ refreshFails: true }));

    const nearlyExpired = await cookieFor({ accessExpiresAt: Math.floor(Date.now() / 1000) + 10 });
    const response = await middleware(request("/account", nearlyExpired));

    expect(response.status).toBe(307);
    expect(location(response)).toBe("/login?next=%2Faccount&error=session-expired");
    expect(setCookie(response)).toContain("Max-Age=0");
  });
});

describe("when authentication is not configured", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("AUTH_SESSION_SECRET", "");
  });

  it("keeps the account area closed", async () => {
    const response = await middleware(request("/account"));
    expect(response.status).toBe(307);
  });

  it("still renders the sign-in page, which is what explains the gap", async () => {
    const response = await middleware(request("/login"));
    expect(response.status).toBe(200);
  });

  it("answers 401 on the account API", async () => {
    const response = await middleware(request("/api/account/profile"));
    expect(response.status).toBe(401);
  });
});

describe("a weak signing secret disables authentication rather than weakening it", () => {
  it("refuses a secret below the floor", async () => {
    // Same posture as the admin config: the area closes instead of running
    // with a signature anybody could forge.
    vi.stubEnv("AUTH_SESSION_SECRET", "too-short");
    const response = await middleware(request("/account", await cookieFor()));
    expect(response.status).toBe(307);
  });
});

describe("the matcher and the policy table agree", () => {
  const patterns = middlewareConfig.matcher;

  /** Would this matcher pattern route the given path to middleware? */
  function covers(pattern: string, pathname: string): boolean {
    if (pattern === pathname) return true;
    const wildcard = "/:path*";
    if (!pattern.endsWith(wildcard)) return false;
    const base = pattern.slice(0, -wildcard.length);
    return pathname === base || pathname.startsWith(`${base}/`);
  }

  it("routes every governed prefix through middleware", () => {
    // Next.js requires the matcher to be a literal, so it cannot be derived
    // from the policy table. A prefix listed there and missing here is a page
    // whose only remaining guard is the check inside it.
    //
    // A parent wildcard counts: `/account/:path*` covers `/account/admin`.
    for (const prefix of GOVERNED_PREFIXES) {
      const covered = patterns.some((pattern) => covers(pattern, prefix));
      expect(covered, `${prefix} is not covered by the middleware matcher`).toBe(true);
    }
  });

  it("keeps matching the admin surface", () => {
    for (const pattern of ["/admin", "/admin/:path*", "/api/admin/:path*"]) {
      expect(patterns, pattern).toContain(pattern);
    }
  });
});
