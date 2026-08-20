import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { middleware } from "@/middleware";
import { POST as adminLogin } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { createSessionToken, ADMIN_COOKIE } from "@/lib/admin-session";
import { ADMIN_LOGIN_TIERS, ADMIN_LOGIN_GLOBAL } from "@/lib/api-rate-limit";

/**
 * The admin boundary: S5 (deny-by-default), S1 (login abuse limits) and
 * S9 (cross-site forced logout).
 *
 * Asserted at the boundary an attacker meets — the status code and the
 * redirect — not at the shape of the internals.
 */

const SECRET = "0123456789abcdef0123456789abcdef";
const PASSWORD = "correct-horse-16";

/** A NextRequest-shaped object; middleware only uses these members. */
function pageRequest(pathname: string, cookie?: string) {
  const url = new URL(`https://marsa.money${pathname}`);
  return {
    nextUrl: Object.assign(url, { clone: () => new URL(url.toString()) }),
    cookies: { get: (n: string) => (n === ADMIN_COOKIE && cookie ? { value: cookie } : undefined) },
  } as unknown as Parameters<typeof middleware>[0];
}

beforeEach(() => {
  vi.stubEnv("ADMIN_PASSWORD", PASSWORD);
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("S5 — the admin surface is deny-by-default", () => {
  it("sends an unauthenticated visitor to the login screen", async () => {
    const res = await middleware(pageRequest("/admin"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("protects a route that does not exist yet", async () => {
    // The whole point of S5: a new page that forgets isAdminRequest() must not
    // be world-readable. Nothing in the type system or the linter would catch
    // that omission, so the boundary has to.
    const res = await middleware(pageRequest("/admin/some-future-page"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("answers 401 rather than redirecting for an admin API call", async () => {
    const res = await middleware(pageRequest("/api/admin/export"));
    expect(res.status).toBe(401);
  });

  it("lets a valid session through", async () => {
    const { token } = await createSessionToken(SECRET);
    const res = await middleware(pageRequest("/admin", token));
    // NextResponse.next() carries no redirect.
    expect(res.headers.get("location")).toBeNull();
    expect(res.status).toBe(200);
  });

  it("rejects a session signed with another secret", async () => {
    const { token } = await createSessionToken("ffffffffffffffffffffffffffffffff");
    const res = await middleware(pageRequest("/admin", token));
    expect(res.status).toBe(307);
  });

  it("rejects an expired session", async () => {
    const { token } = await createSessionToken(SECRET, Date.now() - 9 * 60 * 60 * 1000);
    const res = await middleware(pageRequest("/admin", token));
    expect(res.status).toBe(307);
  });

  it("keeps the login page and endpoint reachable without a session", async () => {
    // Getting this wrong locks the operator out permanently: the page that
    // issues a session cannot itself require one.
    for (const path of ["/admin/login", "/api/admin/login", "/api/admin/logout"]) {
      const res = await middleware(pageRequest(path));
      expect(res.headers.get("location"), path).toBeNull();
      expect(res.status, path).toBe(200);
    }
  });

  it("denies everything when no admin credentials are configured", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    const res = await middleware(pageRequest("/admin"));
    expect(res.status).toBe(307);
  });

  it("denies a session when the configured password is below the floor", async () => {
    // A sub-16 password disables getAdminConfig entirely, so no session can
    // verify — the admin area closes rather than running weakly.
    const { token } = await createSessionToken(SECRET);
    vi.stubEnv("ADMIN_PASSWORD", "tooshort");
    const res = await middleware(pageRequest("/admin", token));
    expect(res.status).toBe(307);
  });
});

describe("S1 — login abuse limits are tiered", () => {
  it("tightens the ceiling as an attack persists", () => {
    // Backoff expressed as overlapping fixed windows: a burst trips the short
    // tier, a grinder trips a longer one. Each tier must permit fewer attempts
    // per unit time than the one before it, or it adds nothing.
    const rates = ADMIN_LOGIN_TIERS.map((t) => t.limit / t.windowMs);
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i], `tier ${i} vs ${i - 1}`).toBeLessThan(rates[i - 1]);
    }
  });

  it("caps the shortest tier at 5 attempts per 15 minutes", () => {
    expect(ADMIN_LOGIN_TIERS[0]).toMatchObject({ limit: 5, windowMs: 15 * 60_000 });
  });

  it("keys each tier separately so they cannot share a bucket", () => {
    const scopes = ADMIN_LOGIN_TIERS.map((t) => t.scope);
    expect(new Set(scopes).size).toBe(scopes.length);
  });

  it("carries a global ceiling for attempts spread across many addresses", () => {
    expect(ADMIN_LOGIN_GLOBAL.limit).toBeGreaterThan(ADMIN_LOGIN_TIERS[0].limit);
    // Well above any legitimate volume — there is one operator.
    expect(ADMIN_LOGIN_GLOBAL.limit).toBeLessThanOrEqual(100);
  });
});

describe("the login endpoint cannot be driven from another site", () => {
  /**
   * The per-IP tiers above cannot see the attack this closes. A malicious page
   * makes every visitor it reaches a distinct source address, so a ceiling of
   * five attempts per address counts five separate attackers rather than one
   * campaign — leaving `ADMIN_LOGIN_GLOBAL` as the only thing standing in its
   * way, which is a lot of weight for one shared bucket to carry.
   *
   * The sibling endpoints — admin logout and all four customer authentication
   * routes — have always checked this. This one had not.
   */
  function loginRequest(headers: Record<string, string>) {
    return new Request("https://marsa.money/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({ password: PASSWORD }),
    });
  }

  it("rejects a cross-site request even with the correct password", async () => {
    const res = await adminLogin(loginRequest({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    // Nothing may be issued on a refusal, or the check is decorative.
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a request whose Origin is another site", async () => {
    const res = await adminLogin(loginRequest({ origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("refuses before spending a rate-limit allowance on the attempt", async () => {
    // A refusal that still consumed the operator's own ceiling would let any
    // page on the internet lock them out — the opposite of the intent.
    const res = await adminLogin(loginRequest({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    // The genuine form still works immediately afterwards.
    const ok = await adminLogin(loginRequest({ "sec-fetch-site": "same-origin" }));
    expect(ok.status).toBe(200);
  });

  it("allows the form's own same-origin request", async () => {
    const res = await adminLogin(loginRequest({ "sec-fetch-site": "same-origin" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toContain(`${ADMIN_COOKIE}=`);
  });

  it("allows a non-browser client that sends neither header", async () => {
    const res = await adminLogin(loginRequest({}));
    expect(res.status).toBe(200);
  });
});

describe("S9 — logout cannot be forced from another site", () => {
  function logoutRequest(headers: Record<string, string>) {
    return new Request("https://marsa.money/api/admin/logout", { method: "POST", headers });
  }

  it("rejects a cross-site request", async () => {
    const res = await logout(logoutRequest({ "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
  });

  it("rejects a request whose Origin is another site", async () => {
    const res = await logout(logoutRequest({ origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("allows a same-origin request", async () => {
    const res = await logout(logoutRequest({ "sec-fetch-site": "same-origin" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("set-cookie")).toContain(`${ADMIN_COOKIE}=`);
  });

  it("allows a same-site navigation", async () => {
    const res = await logout(logoutRequest({ "sec-fetch-site": "same-site" }));
    expect(res.status).toBe(303);
  });

  it("allows a matching Origin when Sec-Fetch-Site is absent", async () => {
    const res = await logout(logoutRequest({ origin: "https://marsa.money" }));
    expect(res.status).toBe(303);
  });

  it("allows a non-browser client that sends neither header", async () => {
    // Rejecting on absence would break curl and probes without stopping an
    // attacker, who controls neither header from a page.
    const res = await logout(logoutRequest({}));
    expect(res.status).toBe(303);
  });

  it("treats an unparseable Origin as hostile", async () => {
    const res = await logout(logoutRequest({ origin: "not a url" }));
    expect(res.status).toBe(403);
  });
});
