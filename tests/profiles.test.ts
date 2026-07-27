import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchRole, getProfile, listProfiles, PROFILE_PAGE_SIZE, updateProfile } from "@/lib/profiles";
import { setReporter, type CapturedEvent } from "@/lib/observability";
import type { AuthConfig } from "@/lib/auth-config";

/**
 * Profile access, and the one property that makes the rest of the
 * authorisation model trustworthy: **every request is made as the signed-in
 * user**, so Row Level Security — not a filter in a route handler — decides
 * which rows come back.
 *
 * That is why `listProfiles` is written as "select every profile" and tested
 * for the absence of a role filter. A filter here would be a second, weaker
 * copy of migration 004's policies, and the day the two disagreed the weaker
 * one would be the one running.
 */

const CFG: AuthConfig = {
  authEndpoint: "https://project.supabase.co/auth/v1",
  restEndpoint: "https://project.supabase.co/rest/v1",
  anonKey: "anon-key",
  secret: "0123456789abcdef0123456789abcdef",
};

const USER_ID = "11111111-2222-3333-4444-555555555555";
const TOKEN = "user-access-token";

const ROW = {
  id: USER_ID,
  email: "person@example.com",
  full_name: "Jordan Rivera",
  avatar_url: null,
  role: "user",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-02-01T00:00:00Z",
};

function stubRows(rows: unknown[], total = rows.length) {
  const mock = vi.fn(async () => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-range": `0-${Math.max(0, rows.length - 1)}/${total}` }),
    json: async () => rows,
    text: async () => JSON.stringify(rows),
  }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

function callOf(mock: ReturnType<typeof stubRows>) {
  return mock.mock.calls[0] as unknown as [
    string,
    RequestInit & { headers: Record<string, string> },
  ];
}

/** Collects captured events for the duration of one test. */
function recordEvents(): { events: CapturedEvent[]; restore: () => void } {
  const events: CapturedEvent[] = [];
  const previous = setReporter((event) => events.push(event));
  return { events, restore: () => setReporter(previous) };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("every read is made as the user, not as the service role", () => {
  it("sends the user's token as the bearer and the anon key as the apikey", async () => {
    const mock = stubRows([ROW]);
    await getProfile(CFG, TOKEN, USER_ID);

    const [, init] = callOf(mock);
    // If this were the service-role key, RLS would be bypassed and whether one
    // customer can read another's row would depend on the filter below rather
    // than on a policy in the database.
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(init.headers.apikey).toBe("anon-key");
  });

  it("asks the profiles table for the caller's own row", async () => {
    const mock = stubRows([ROW]);
    await getProfile(CFG, TOKEN, USER_ID);

    const [url] = callOf(mock);
    expect(url).toContain("/rest/v1/profiles?");
    expect(url).toContain(`id=eq.${USER_ID}`);
    expect(url).toContain("limit=1");
  });
});

describe("rows become profiles", () => {
  it("maps the database's names to the application's", async () => {
    stubRows([ROW]);
    expect(await getProfile(CFG, TOKEN, USER_ID)).toEqual({
      id: USER_ID,
      email: "person@example.com",
      fullName: "Jordan Rivera",
      avatarUrl: null,
      role: "user",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    });
  });

  it("returns null when there is no row rather than a half-built profile", async () => {
    stubRows([]);
    expect(await getProfile(CFG, TOKEN, USER_ID)).toBeNull();
  });

  it("narrows a role the application does not know to the least-privileged one", async () => {
    // A value the check constraint somehow accepted, or one left by a role
    // this build predates. Either way it must not arrive as authority.
    stubRows([{ ...ROW, role: "superuser" }]);
    expect((await getProfile(CFG, TOKEN, USER_ID))?.role).toBe("user");
  });

  it("reads an administrator's role as one", async () => {
    stubRows([{ ...ROW, role: "admin" }]);
    expect((await getProfile(CFG, TOKEN, USER_ID))?.role).toBe("admin");
  });
});

describe("fetchRole never throws, because middleware calls it", () => {
  it("returns the role on the profile", async () => {
    stubRows([{ ...ROW, role: "admin" }]);
    expect(await fetchRole(CFG, TOKEN, USER_ID)).toBe("admin");
  });

  it("degrades to the least-privileged role when the profile is missing", async () => {
    // A database blip during a renewal must not sign people out, and it must
    // certainly not promote them.
    const { events, restore } = recordEvents();
    stubRows([]);

    expect(await fetchRole(CFG, TOKEN, USER_ID)).toBe("user");

    const event = events.find((e) => e.event === "auth.profile.missing");
    expect(event?.severity).toBe("warning");
    // The likeliest cause by far, named where an operator will read it.
    expect(String(event?.context.remedy)).toContain("004");
    restore();
  });

  it("degrades and reports when the table cannot be read at all", async () => {
    const { events, restore } = recordEvents();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 404, text: async () => "PGRST205" })),
    );

    expect(await fetchRole(CFG, TOKEN, USER_ID)).toBe("user");
    expect(events.some((e) => e.event === "auth.profile.unreadable")).toBe(true);
    restore();
  });
});

describe("updateProfile", () => {
  it("patches only the caller's own row, and only the editable column", async () => {
    const mock = stubRows([{ ...ROW, full_name: "New Name" }]);
    await updateProfile(CFG, TOKEN, USER_ID, { fullName: "New Name" });

    const [url, init] = callOf(mock);
    expect(init.method).toBe("PATCH");
    expect(url).toContain(`id=eq.${USER_ID}`);
    // No role, ever. The database would refuse it — `authenticated` holds no
    // update privilege on that column — but it is never sent either.
    expect(JSON.parse(String(init.body))).toEqual({ full_name: "New Name" });
  });

  it("clears the name when given an empty one", async () => {
    const mock = stubRows([{ ...ROW, full_name: null }]);
    await updateProfile(CFG, TOKEN, USER_ID, { fullName: null });
    expect(JSON.parse(String(callOf(mock)[1].body))).toEqual({ full_name: null });
  });

  it("returns null when the database updated nothing", async () => {
    // Under RLS that is what "not yours" looks like: an empty result and a
    // 200. A caller reading null as success is a form that appears to save.
    stubRows([]);
    expect(await updateProfile(CFG, TOKEN, USER_ID, { fullName: "x" })).toBeNull();
  });
});

describe("listProfiles", () => {
  it("asks for every profile and lets the database decide which come back", async () => {
    const mock = stubRows([ROW], 1);
    await listProfiles(CFG, TOKEN);

    const [url] = callOf(mock);
    expect(url).toContain("order=created_at.desc");
    // No role filter, and no `id=eq.` — deliberately. An administrator gets
    // the directory and a member gets one row, because the policies say so.
    expect(url).not.toContain("role=eq");
    expect(url).not.toContain("id=eq");
  });

  it("reports the true total alongside the page it fetched", async () => {
    // A list that quietly shows the first page of a longer set is the shape
    // that made the demo funnel report over 100%.
    stubRows([ROW], 137);
    const page = await listProfiles(CFG, TOKEN);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(137);
  });

  it("caps the page size however large a caller asks for", async () => {
    const mock = stubRows([ROW]);
    await listProfiles(CFG, TOKEN, { limit: 10_000 });
    expect(callOf(mock)[0]).toContain(`limit=${PROFILE_PAGE_SIZE}`);
  });

  it("refuses a negative offset", async () => {
    const mock = stubRows([ROW]);
    await listProfiles(CFG, TOKEN, { offset: -50 });
    expect(callOf(mock)[0]).toContain("offset=0");
  });
});
