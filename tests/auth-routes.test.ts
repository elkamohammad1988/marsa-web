import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, encodeSession } from "@/lib/auth-session";
import { INVALID_CREDENTIALS_MESSAGE } from "@/lib/api-auth";

/**
 * The authentication endpoints, at the boundary a caller meets.
 *
 * Three properties are worth more than the rest and are asserted hardest:
 *
 *   • **No endpoint reveals whether an address has an account.** Registration,
 *     recovery and re-send all answer identically either way, and sign-in gives
 *     one sentence for every kind of credential failure.
 *   • **No endpoint can be driven from another site.** Every state-changing
 *     route rejects a cross-site request outright.
 *   • **A session is only ever issued alongside a real exchange**, and the
 *     cookie that carries it is `httpOnly`.
 */

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "marsa_session" && state.cookie ? { value: state.cookie } : undefined,
  }),
}));

const SECRET = "0123456789abcdef0123456789abcdef";
const ORIGIN = "https://marsa.money";

const SESSION_BODY = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "11111111-2222-3333-4444-555555555555", email: "person@example.com" },
};

const PROFILE_ROW = {
  id: "11111111-2222-3333-4444-555555555555",
  email: "person@example.com",
  full_name: null,
  avatar_url: null,
  role: "user",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

/**
 * A distinct client address per request.
 *
 * The shared limiter keeps its in-memory buckets in a module-level map that
 * outlives a test, so reusing an address would make one test's allowance
 * depend on how many ran before it.
 */
let addressCounter = 0;
function freshAddress(): string {
  addressCounter += 1;
  return `203.0.113.${addressCounter % 250}`;
}

function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": freshAddress(),
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** GoTrue answers `/auth/v1/*`; PostgREST answers everything else. */
function stubUpstream(
  gotrue: (path: string) => unknown = () => ({ ok: true, status: 200, text: async () => JSON.stringify(SESSION_BODY) }),
  rows: unknown[] = [PROFILE_ROW],
) {
  const mock = vi.fn(async (url: string) => {
    const target = String(url);
    if (target.includes("/auth/v1/")) return gotrue(target);
    return {
      ok: true,
      status: 200,
      headers: new Headers({ "content-range": `0-0/${rows.length}` }),
      json: async () => rows,
      text: async () => JSON.stringify(rows),
    };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

function goTrueOk(body: unknown) {
  return () => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
}

function goTrueFails(status: number, body: Record<string, unknown>) {
  return () => ({ ok: false, status, text: async () => JSON.stringify(body) });
}

async function sessionCookie(role: "user" | "admin" = "user"): Promise<string> {
  const seconds = Math.floor(Date.now() / 1000);
  return encodeSession(
    {
      userId: PROFILE_ROW.id,
      email: PROFILE_ROW.email,
      role,
      accessToken: "access-token",
      refreshToken: "refresh-token",
      accessExpiresAt: seconds + 3600,
      expiresAt: seconds + SESSION_TTL_SECONDS,
    },
    SECRET,
  );
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon-key");
  vi.stubEnv("AUTH_SESSION_SECRET", SECRET);
  // Left unset so the shared limiter stays in memory and issues no request of
  // its own; the fetch stubs below then describe only the calls under test.
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  state.cookie = undefined;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------- register -- */

describe("POST /api/auth/register", () => {
  async function register(body: unknown, headers?: Record<string, string>) {
    const { POST } = await import("@/app/api/auth/register/route");
    return POST(post("/api/auth/register", body, headers));
  }

  const VALID = { email: "person@example.com", password: "a-long-enough-passphrase" };

  it("refuses a request driven from another site", async () => {
    stubUpstream();
    const response = await register(VALID, { "sec-fetch-site": "cross-site" });
    expect(response.status).toBe(403);
  });

  it("reports missing configuration rather than failing obscurely", async () => {
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    const response = await register(VALID);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("SUPABASE_ANON_KEY");
  });

  it("rejects a body that is not JSON", async () => {
    const response = await register("{ not json");
    expect(response.status).toBe(400);
  });

  it("returns field errors from the shared validator", async () => {
    stubUpstream();
    const response = await register({ email: "nope", password: "short" });
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.errors.email).toBeTruthy();
    expect(body.errors.password).toBeTruthy();
  });

  it("sends the reader to confirm their address when confirmation is required", async () => {
    stubUpstream(goTrueOk({ id: "new-user", email: VALID.email, identities: [{ id: "i" }] }));
    const response = await register(VALID);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.next).toBe("/verify-email?email=person%40example.com");
    // No session: the account is not usable until the address is confirmed.
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("answers identically for an address that already has an account", async () => {
    // GoTrue returns a decoy user with no identities rather than an error.
    // Relaying the difference would make this the account-enumeration
    // endpoint for the whole site.
    stubUpstream(goTrueOk({ id: "decoy", email: VALID.email, identities: [] }));
    const response = await register(VALID);

    expect(response.status).toBe(200);
    expect((await response.json()).next).toBe("/verify-email?email=person%40example.com");
  });

  it("signs the visitor in when the project does not require confirmation", async () => {
    // Both outcomes are real, and which one happens is a dashboard setting
    // that can change without a deploy.
    stubUpstream(goTrueOk(SESSION_BODY));
    const response = await register(VALID);

    expect((await response.json()).next).toBe("/account");
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBeTruthy();
    expect(response.cookies.get(SESSION_COOKIE)?.httpOnly).toBe(true);
  });

  it("reports a password Supabase itself rejects against the field", async () => {
    stubUpstream(goTrueFails(422, { error_code: "weak_password", msg: "too weak" }));
    const response = await register(VALID);
    expect(response.status).toBe(422);
    expect((await response.json()).errors.password).toBeTruthy();
  });

  it("gives a reference, and no upstream detail, for an unexpected failure", async () => {
    // GoTrue's message text is written for a developer reading a log, and some
    // of it distinguishes accounts that exist from accounts that do not.
    stubUpstream(goTrueFails(500, { msg: "user table locked by tenant 42" }));
    const response = await register(VALID);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.reference).toMatch(/^[2-9A-HJ-NP-Z]{8}$/);
    expect(body.error).not.toContain("tenant 42");
  });
});

/* ---------------------------------------------------------------- login -- */

describe("POST /api/auth/login", () => {
  async function login(body: unknown, headers?: Record<string, string>) {
    const { POST } = await import("@/app/api/auth/login/route");
    return POST(post("/api/auth/login", body, headers));
  }

  const VALID = { email: "person@example.com", password: "a-long-enough-passphrase" };

  it("refuses a request driven from another site", async () => {
    // Login CSRF: forcing a victim into an account the attacker controls, then
    // watching what they do in the belief it is their own.
    stubUpstream();
    const response = await login(VALID, { "sec-fetch-site": "cross-site" });
    expect(response.status).toBe(403);
  });

  it("issues an httpOnly session cookie on success", async () => {
    stubUpstream();
    const response = await login(VALID);

    expect(response.status).toBe(200);
    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("takes the role from the database rather than from the request", async () => {
    stubUpstream(undefined, [{ ...PROFILE_ROW, role: "admin" }]);
    const response = await login({ ...VALID, role: "admin" });

    const { decodeSession } = await import("@/lib/auth-session");
    const decoded = await decodeSession(response.cookies.get(SESSION_COOKIE)?.value, SECRET);
    expect(decoded?.role).toBe("admin");
  });

  it("ignores a role supplied in the request body", async () => {
    stubUpstream(undefined, [PROFILE_ROW]);
    const response = await login({ ...VALID, role: "admin" });

    const { decodeSession } = await import("@/lib/auth-session");
    const decoded = await decodeSession(response.cookies.get(SESSION_COOKIE)?.value, SECRET);
    expect(decoded?.role).toBe("user");
  });

  it("gives one sentence for every kind of credential failure", async () => {
    stubUpstream(goTrueFails(400, { msg: "Invalid login credentials" }));
    const wrongPassword = await login(VALID);

    stubUpstream(goTrueFails(400, { error_code: "email_not_confirmed", msg: "Email not confirmed" }));
    const unconfirmed = await login(VALID);

    expect(wrongPassword.status).toBe(401);
    expect(unconfirmed.status).toBe(401);
    // Identical, deliberately: telling them apart would say whether the
    // address is registered here.
    expect((await wrongPassword.json()).error).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect((await unconfirmed.json()).error).toBe(INVALID_CREDENTIALS_MESSAGE);
  });

  it("issues no cookie when the credentials are refused", async () => {
    stubUpstream(goTrueFails(400, { msg: "Invalid login credentials" }));
    const response = await login(VALID);
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("returns to where the visitor was going", async () => {
    stubUpstream();
    const response = await login({ ...VALID, next: "/account/admin" });
    expect((await response.json()).next).toBe("/account/admin");
  });

  it("refuses to hand the visitor to another site afterwards", async () => {
    // The open redirect: sign in on the real site, get sent to the attacker's
    // page carrying all the trust that transfer implies.
    stubUpstream();
    const response = await login({ ...VALID, next: "https://evil.example" });
    expect((await response.json()).next).toBe("/account");
  });

  it("rate-limits attempts against one account from many addresses", async () => {
    // The attack the per-address tiers cannot see: a password list run against
    // one known email from a rotating pool of addresses.
    stubUpstream(goTrueFails(400, { msg: "Invalid login credentials" }));
    const target = { email: "victim@example.com", password: "a-long-enough-passphrase" };

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      statuses.push((await login(target)).status);
    }
    expect(statuses).toContain(429);
  });
});

/* ------------------------------------------------- the email-sending pair -- */

describe("the endpoints that send email never say whether an account exists", () => {
  async function forgot(body: unknown, headers?: Record<string, string>) {
    const { POST } = await import("@/app/api/auth/forgot-password/route");
    return POST(post("/api/auth/forgot-password", body, headers));
  }
  async function resend(body: unknown) {
    const { POST } = await import("@/app/api/auth/resend-verification/route");
    return POST(post("/api/auth/resend-verification", body));
  }

  it("answers ok for an address GoTrue accepted", async () => {
    stubUpstream(goTrueOk(null));
    expect((await forgot({ email: "person@example.com" })).status).toBe(200);
  });

  it("answers ok even when the upstream call failed", async () => {
    // "We could not send that" for one address and success for another is the
    // same disclosure by another route. The failure is captured instead.
    stubUpstream(goTrueFails(500, { msg: "smtp down" }));
    const response = await forgot({ email: "person@example.com" });
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  it("still reports a malformed address, which discloses nothing", async () => {
    stubUpstream(goTrueOk(null));
    const response = await forgot({ email: "not-an-address" });
    expect(response.status).toBe(422);
  });

  it("refuses to be driven from another site", async () => {
    // Otherwise any page could use these to post mail to an address it chose.
    stubUpstream(goTrueOk(null));
    expect((await forgot({ email: "a@b.co" }, { "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("re-sends a confirmation the same way", async () => {
    stubUpstream(goTrueOk(null));
    expect((await resend({ email: "person@example.com" })).status).toBe(200);
  });

  it("caps how often one mailbox can be targeted", async () => {
    stubUpstream(goTrueOk(null));
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      statuses.push((await forgot({ email: "flooded@example.com" })).status);
    }
    expect(statuses).toContain(429);
  });
});

/* --------------------------------------------------------------- logout -- */

describe("POST /api/auth/logout", () => {
  async function logout(headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/auth/logout/route");
    return POST(
      new Request(`${ORIGIN}/api/auth/logout`, {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin", ...headers },
      }),
    );
  }

  it("refuses a cross-site request, so no page can end a session for someone", async () => {
    expect((await logout({ "sec-fetch-site": "cross-site" })).status).toBe(403);
  });

  it("clears the cookie and returns to the site", async () => {
    stubUpstream(goTrueOk(null));
    state.cookie = await sessionCookie();

    const response = await logout();
    expect(response.status).toBe(303);
    expect(response.cookies.get(SESSION_COOKIE)?.value).toBe("");
    expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("still signs the person out when revoking upstream fails", async () => {
    // A sign-out that failed because the network was down must still sign the
    // person out of this browser — they are usually leaving a shared machine.
    stubUpstream(goTrueFails(500, { msg: "gone" }));
    state.cookie = await sessionCookie();

    const response = await logout();
    expect(response.status).toBe(303);
    expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("works when there was no session to begin with", async () => {
    expect((await logout()).status).toBe(303);
  });
});

/* -------------------------------------------------------- email confirm -- */

describe("GET /auth/confirm", () => {
  async function confirm(query: string) {
    const { GET } = await import("@/app/auth/confirm/route");
    return GET(new Request(`${ORIGIN}/auth/confirm${query}`));
  }

  function target(response: Response): string {
    const url = new URL(response.headers.get("location")!);
    return `${url.pathname}${url.search}`;
  }

  it("exchanges a token hash for a session and sends the reader on", async () => {
    stubUpstream(goTrueOk(SESSION_BODY));
    const response = await confirm("?token_hash=abc123&type=signup");

    expect(response.status).toBe(303);
    expect(target(response)).toBe("/account");
    expect(response.cookies.get(SESSION_COOKIE)?.httpOnly).toBe(true);
  });

  it("honours the destination a recovery link carries", async () => {
    stubUpstream(goTrueOk(SESSION_BODY));
    const response = await confirm("?token_hash=abc123&type=recovery&next=%2Freset-password");
    expect(target(response)).toBe("/reset-password");
  });

  it("refuses to be redirected off the site by the link", async () => {
    stubUpstream(goTrueOk(SESSION_BODY));
    const response = await confirm("?token_hash=abc123&type=recovery&next=https%3A%2F%2Fevil.example");
    expect(target(response)).toBe("/account");
  });

  it("rejects a type it does not issue, so a link cannot choose a flow", async () => {
    stubUpstream(goTrueOk(SESSION_BODY));
    const response = await confirm("?token_hash=abc123&type=magiclink");
    expect(target(response)).toBe("/login?error=invalid-link");
  });

  it("rejects a link with no token", async () => {
    const response = await confirm("?type=signup");
    expect(target(response)).toBe("/login?error=invalid-link");
  });

  it("explains an expired or already-used link without a stack trace", async () => {
    stubUpstream(goTrueFails(403, { msg: "Token has expired or is invalid" }));
    const response = await confirm("?token_hash=stale&type=signup");

    expect(response.status).toBe(303);
    expect(target(response)).toBe("/login?error=invalid-link");
    expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });
});

/* -------------------------------------------------------------- account -- */

describe("PATCH /api/account/profile", () => {
  async function patch(body: unknown, headers: Record<string, string> = {}) {
    const { PATCH } = await import("@/app/api/account/profile/route");
    return PATCH(
      new Request(`${ORIGIN}/api/account/profile`, {
        method: "PATCH",
        headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
        body: JSON.stringify(body),
      }),
    );
  }

  it("refuses an anonymous caller", async () => {
    expect((await patch({ fullName: "Jordan" })).status).toBe(401);
  });

  it("refuses a cross-site caller", async () => {
    state.cookie = await sessionCookie();
    expect((await patch({ fullName: "Jordan" }, { "sec-fetch-site": "cross-site" })).status).toBe(
      403,
    );
  });

  it("saves a name for the signed-in account", async () => {
    stubUpstream(undefined, [{ ...PROFILE_ROW, full_name: "Jordan Rivera" }]);
    state.cookie = await sessionCookie();

    const response = await patch({ fullName: "Jordan Rivera" });
    expect(response.status).toBe(200);
    expect((await response.json()).profile.fullName).toBe("Jordan Rivera");
  });

  it("scopes the update to the caller's own row", async () => {
    const fetchMock = stubUpstream(undefined, [PROFILE_ROW]);
    state.cookie = await sessionCookie();
    await patch({ fullName: "Jordan" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toContain(`id=eq.${PROFILE_ROW.id}`);
    // The bearer credential is the user's token, not the anon key — which is
    // what makes Row Level Security the thing that decides.
    expect(init.headers.Authorization).toBe("Bearer access-token");
    expect(init.headers.apikey).toBe("anon-key");
  });

  it("never sends a role, whatever the request asked for", async () => {
    const fetchMock = stubUpstream(undefined, [PROFILE_ROW]);
    state.cookie = await sessionCookie();
    await patch({ fullName: "Jordan", role: "admin" });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ full_name: "Jordan" });
  });

  it("rejects a name that fails the shared rules", async () => {
    state.cookie = await sessionCookie();
    const response = await patch({ fullName: "x" });
    expect(response.status).toBe(422);
    expect((await response.json()).errors.fullName).toBeTruthy();
  });

  it("reports an update that matched no row rather than claiming success", async () => {
    // Under RLS, "not yours" looks like an empty result and a 200. Treating
    // that as success is a form that appears to save and does not.
    stubUpstream(undefined, []);
    state.cookie = await sessionCookie();
    expect((await patch({ fullName: "Jordan" })).status).toBe(404);
  });
});

describe("POST /api/account/password", () => {
  async function change(body: unknown, headers: Record<string, string> = {}) {
    const { POST } = await import("@/app/api/account/password/route");
    return POST(post("/api/account/password", body, headers));
  }

  it("refuses an anonymous caller", async () => {
    expect((await change({ password: "a-long-enough-passphrase" })).status).toBe(401);
  });

  it("refuses a cross-site caller", async () => {
    state.cookie = await sessionCookie();
    expect(
      (await change({ password: "a-long-enough-passphrase" }, { "sec-fetch-site": "cross-site" }))
        .status,
    ).toBe(403);
  });

  it("enforces the shared password rules", async () => {
    state.cookie = await sessionCookie();
    const response = await change({ password: "short" });
    expect(response.status).toBe(422);
    expect((await response.json()).errors.password).toBeTruthy();
  });

  it("refuses a password that is the account's own address", async () => {
    // The session supplies the address, so this is enforceable even though the
    // form never asked for one.
    state.cookie = await sessionCookie();
    const response = await change({ password: PROFILE_ROW.email.toUpperCase() });
    expect(response.status).toBe(422);
  });

  it("sets the new password as the signed-in user", async () => {
    const fetchMock = stubUpstream(goTrueOk({ id: PROFILE_ROW.id }));
    state.cookie = await sessionCookie();

    const response = await change({ password: "a-long-enough-passphrase" });
    expect(response.status).toBe(200);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { headers: Record<string, string> },
    ];
    expect(url).toContain("/auth/v1/user");
    expect(init.method).toBe("PUT");
    expect(init.headers.Authorization).toBe("Bearer access-token");
  });
});
