import { describe, it, expect, vi, afterEach } from "vitest";
import {
  GoTrueError,
  isExistingAccountDecoy,
  isOtpType,
  refreshSession,
  requestPasswordRecovery,
  resendConfirmation,
  signInWithPassword,
  signOut,
  signUp,
  updatePassword,
  verifyOtp,
} from "@/lib/gotrue";
import type { AuthConfig } from "@/lib/auth-config";

/**
 * `lib/gotrue.ts` is the only path between this application and Supabase Auth,
 * and it is hand-written rather than an SDK — so the contract with an API we
 * do not control is pinned here rather than assumed.
 *
 * What is asserted is what the endpoint requires (method, path, grant type,
 * which credential goes in which header) and what a caller depends on
 * (failures arriving as a typed error carrying a status and a code, never as
 * an undefined value that reads like "no result").
 */

const CFG: AuthConfig = {
  authEndpoint: "https://project.supabase.co/auth/v1",
  restEndpoint: "https://project.supabase.co/rest/v1",
  anonKey: "anon-key",
  secret: "0123456789abcdef0123456789abcdef",
};

const SESSION_BODY = {
  access_token: "access",
  refresh_token: "refresh",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "user-id", email: "person@example.com" },
};

function ok(body: unknown = null) {
  return { ok: true, status: 200, text: async () => (body === null ? "" : JSON.stringify(body)) };
}

function fails(status: number, body: string) {
  return { ok: false, status, text: async () => body };
}

function stubFetch(response: unknown) {
  const mock = vi.fn(async () => response);
  vi.stubGlobal("fetch", mock);
  return mock;
}

/** The (url, init) of the one call that was made. */
function callOf(mock: ReturnType<typeof stubFetch>) {
  return mock.mock.calls[0] as unknown as [
    string,
    RequestInit & { headers: Record<string, string> },
  ];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("every request", () => {
  it("sends the anon key as the apikey and as the bearer token", async () => {
    const mock = stubFetch(ok(SESSION_BODY));
    await signInWithPassword(CFG, { email: "a@b.co", password: "x" });

    const [, init] = callOf(mock);
    expect(init.headers.apikey).toBe("anon-key");
    expect(init.headers.Authorization).toBe("Bearer anon-key");
    expect(init.headers["content-type"]).toBe("application/json");
  });

  it("swaps in the user's access token where the endpoint acts for them", async () => {
    // The apikey still identifies the project; only the bearer credential
    // changes. Sending the anon key as the bearer here would make `/logout` a
    // no-op and `PUT /user` a 401.
    const mock = stubFetch(ok(null));
    await signOut(CFG, "user-access-token");

    const [, init] = callOf(mock);
    expect(init.headers.apikey).toBe("anon-key");
    expect(init.headers.Authorization).toBe("Bearer user-access-token");
  });

  it("never serves a cached response", async () => {
    const mock = stubFetch(ok(SESSION_BODY));
    await signInWithPassword(CFG, { email: "a@b.co", password: "x" });
    expect(callOf(mock)[1].cache).toBe("no-store");
  });

  it("is bounded by the same 8-second budget as the database client", async () => {
    const spy = vi.spyOn(AbortSignal, "timeout");
    stubFetch(ok(SESSION_BODY));
    await signInWithPassword(CFG, { email: "a@b.co", password: "x" });
    expect(spy).toHaveBeenCalledWith(8000);
    spy.mockRestore();
  });
});

describe("signUp", () => {
  it("posts the credentials and puts the name in user metadata", async () => {
    const mock = stubFetch(ok({ id: "new-user", identities: [{ id: "i" }] }));
    await signUp(CFG, { email: "a@b.co", password: "secret", fullName: "Jordan Rivera" });

    const [url, init] = callOf(mock);
    expect(url).toBe("https://project.supabase.co/auth/v1/signup");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      email: "a@b.co",
      password: "secret",
      data: { full_name: "Jordan Rivera" },
    });
  });

  it("sends no metadata when no name was given", async () => {
    const mock = stubFetch(ok({ id: "new-user" }));
    await signUp(CFG, { email: "a@b.co", password: "secret" });
    expect(JSON.parse(String(callOf(mock)[1].body)).data).toEqual({});
  });

  it("carries the confirmation destination as a query parameter", async () => {
    const mock = stubFetch(ok({ id: "new-user" }));
    await signUp(CFG, {
      email: "a@b.co",
      password: "secret",
      redirectTo: "https://marsa.example/auth/confirm",
    });
    expect(callOf(mock)[0]).toBe(
      "https://project.supabase.co/auth/v1/signup?redirect_to=https%3A%2F%2Fmarsa.example%2Fauth%2Fconfirm",
    );
  });

  it("reports a bare user when the project requires email confirmation", async () => {
    stubFetch(ok({ id: "new-user", email: "a@b.co", identities: [{ id: "i" }] }));
    const result = await signUp(CFG, { email: "a@b.co", password: "secret" });
    expect(result.session).toBeNull();
    expect(result.user.id).toBe("new-user");
  });

  it("reports a session when confirmation is switched off", async () => {
    // Both outcomes are real and the setting lives in a dashboard, so a caller
    // that assumed one of them would break without a deploy.
    stubFetch(ok(SESSION_BODY));
    const result = await signUp(CFG, { email: "a@b.co", password: "secret" });
    expect(result.session?.access_token).toBe("access");
    expect(result.user.id).toBe("user-id");
  });
});

describe("token exchanges", () => {
  it("signs in with the password grant", async () => {
    const mock = stubFetch(ok(SESSION_BODY));
    await signInWithPassword(CFG, { email: "a@b.co", password: "secret" });

    const [url, init] = callOf(mock);
    expect(url).toBe("https://project.supabase.co/auth/v1/token?grant_type=password");
    expect(JSON.parse(String(init.body))).toEqual({ email: "a@b.co", password: "secret" });
  });

  it("renews with the refresh grant", async () => {
    const mock = stubFetch(ok(SESSION_BODY));
    await refreshSession(CFG, "the-refresh-token");

    const [url, init] = callOf(mock);
    expect(url).toBe("https://project.supabase.co/auth/v1/token?grant_type=refresh_token");
    expect(JSON.parse(String(init.body))).toEqual({ refresh_token: "the-refresh-token" });
  });

  it("verifies a one-time token by its hash, never by a fragment", async () => {
    // The whole reason the email templates are overridden: a fragment is not
    // sent to a server, so a hash is what makes a server-side exchange
    // possible at all.
    const mock = stubFetch(ok(SESSION_BODY));
    await verifyOtp(CFG, { tokenHash: "abc123", type: "recovery" });

    const [url, init] = callOf(mock);
    expect(url).toBe("https://project.supabase.co/auth/v1/verify");
    expect(JSON.parse(String(init.body))).toEqual({ type: "recovery", token_hash: "abc123" });
  });
});

describe("the endpoints that send email", () => {
  it("asks for recovery with the address and the return destination", async () => {
    const mock = stubFetch(ok(null));
    await requestPasswordRecovery(CFG, {
      email: "a@b.co",
      redirectTo: "https://marsa.example/auth/confirm?next=%2Freset-password",
    });

    const [url, init] = callOf(mock);
    expect(url).toContain("/recover?redirect_to=");
    expect(JSON.parse(String(init.body))).toEqual({ email: "a@b.co" });
  });

  it("re-sends a signup confirmation", async () => {
    const mock = stubFetch(ok(null));
    await resendConfirmation(CFG, { email: "a@b.co" });

    const [url, init] = callOf(mock);
    expect(url).toBe("https://project.supabase.co/auth/v1/resend");
    expect(JSON.parse(String(init.body))).toEqual({ type: "signup", email: "a@b.co" });
  });
});

describe("updatePassword", () => {
  it("puts the new password as the signed-in user", async () => {
    const mock = stubFetch(ok({ id: "user-id" }));
    await updatePassword(CFG, "user-access-token", "a-new-password");

    const [url, init] = callOf(mock);
    expect(url).toBe("https://project.supabase.co/auth/v1/user");
    expect(init.method).toBe("PUT");
    expect(init.headers.Authorization).toBe("Bearer user-access-token");
    expect(JSON.parse(String(init.body))).toEqual({ password: "a-new-password" });
  });
});

describe("failures arrive typed", () => {
  it("carries the status so a caller can branch without reading prose", async () => {
    stubFetch(fails(400, JSON.stringify({ msg: "Invalid login credentials" })));
    const error = await signInWithPassword(CFG, { email: "a@b.co", password: "x" }).catch(
      (e: Error) => e,
    );
    expect(error).toBeInstanceOf(GoTrueError);
    expect(error).toMatchObject({ status: 400 });
  });

  it("carries the machine-readable code, which is what callers branch on", async () => {
    stubFetch(fails(422, JSON.stringify({ error_code: "weak_password", msg: "too short" })));
    const error = await signUp(CFG, { email: "a@b.co", password: "x" }).catch((e: Error) => e);
    expect(error).toMatchObject({ status: 422, code: "weak_password" });
  });

  it.each([
    [JSON.stringify({ msg: "by msg" }), "by msg"],
    [JSON.stringify({ message: "by message" }), "by message"],
    [JSON.stringify({ error_description: "by description" }), "by description"],
    [JSON.stringify({ error: "by error" }), "by error"],
  ])("reads the message out of body shape %#", async (body, expected) => {
    // GoTrue has used three error shapes across versions. Guessing one would
    // turn a diagnosable failure into "GoTrue 400: {".
    stubFetch(fails(400, body));
    const error = await signInWithPassword(CFG, { email: "a@b.co", password: "x" }).catch(
      (e: Error) => e,
    );
    expect((error as Error).message).toContain(expected);
  });

  it("keeps a prefix of a non-JSON body rather than throwing on it", async () => {
    // An edge proxy error page, most likely. It must still reach a log.
    stubFetch(fails(502, "<html>Bad Gateway</html>"));
    const error = await signInWithPassword(CFG, { email: "a@b.co", password: "x" }).catch(
      (e: Error) => e,
    );
    expect((error as Error).message).toContain("Bad Gateway");
  });

  it("reports a network failure as a typed error rather than letting it escape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const error = await signInWithPassword(CFG, { email: "a@b.co", password: "x" }).catch(
      (e: Error) => e,
    );
    expect(error).toBeInstanceOf(GoTrueError);
    expect(error).toMatchObject({ status: 502 });
  });

  it("says how long it waited when a request times out", async () => {
    // The runtime's own message never states the budget, which is the first
    // thing anyone reading the log wants to know.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
      }),
    );
    const error = await signInWithPassword(CFG, { email: "a@b.co", password: "x" }).catch(
      (e: Error) => e,
    );
    expect((error as Error).message).toContain("8000ms");
  });
});

describe("account enumeration", () => {
  it("recognises the decoy GoTrue returns for an address that already exists", async () => {
    // Signing up with a known address succeeds and returns a user with no
    // identities, so the endpoint cannot be used to enumerate. This predicate
    // exists so the server can log it — never so the answer can be rendered.
    expect(isExistingAccountDecoy({ id: "u", identities: [] })).toBe(true);
    expect(isExistingAccountDecoy({ id: "u", identities: [{ provider: "email" }] })).toBe(false);
    expect(isExistingAccountDecoy({ id: "u" })).toBe(false);
  });
});

describe("isOtpType", () => {
  it("accepts the four link types this application issues", () => {
    for (const type of ["signup", "email", "recovery", "email_change"]) {
      expect(isOtpType(type), type).toBe(true);
    }
  });

  it("rejects anything else, so a query parameter cannot choose a flow", () => {
    for (const value of ["magiclink", "sms", "", null, undefined, 7]) {
      expect(isOtpType(value), String(value)).toBe(false);
    }
  });
});
