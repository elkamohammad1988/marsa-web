import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createSessionToken, ADMIN_COOKIE } from "@/lib/admin-session";
import { FileSubmissionStore, type StoredSubmission } from "@/lib/storage";
import { JsonlStore } from "@/lib/jsonl";

/**
 * Erasure — the answer to a GDPR Article 17 request (audit B10).
 *
 * Before this existed the only way to delete a stored submission was to open
 * the Supabase SQL editor and write the statement by hand, which made a routine
 * and legally time-bound task require database credentials and an unfiltered
 * `DELETE` typed from memory against production.
 *
 * Two things are asserted here and they are different in kind:
 *
 *   1. **The boundary.** Who may delete, from where, and how often. Asserted at
 *      the status code an attacker would see.
 *   2. **The outcome.** That the record is *gone*, and — the part that is easy
 *      to get wrong — that deleting one record does not take others with it.
 *
 * The second matters more than it looks. The file store reads a bounded window
 * of each file (audit B5), and rewriting the file from that window would have
 * silently discarded everything older than the window as a side effect of
 * deleting one row: an erasure request that quietly erases the archive. The
 * "keeps the records either side" tests are the ones that would catch that.
 */

const SECRET = "0123456789abcdef0123456789abcdef";
const ORIGIN = "https://marsa.money";

const state = vi.hoisted(() => ({ cookie: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === ADMIN_COOKIE && state.cookie ? { value: state.cookie } : undefined,
  }),
}));

const { POST: deleteSubmission } = await import("@/app/api/admin/submissions/delete/route");

function submission(id: string, kind: StoredSubmission["kind"] = "lead"): StoredSubmission {
  return {
    id,
    kind,
    createdAt: new Date(Date.parse("2026-01-01T00:00:00Z")).toISOString(),
    data: { name: `Person ${id}`, email: `${id}@example.com` },
  };
}

/** A POST as the admin form sends it: same-origin, form-encoded. */
function deleteRequest(id: string, init: { origin?: string | null; returnTo?: string } = {}) {
  const body = new URLSearchParams({ id });
  if (init.returnTo) body.set("returnTo", init.returnTo);

  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  const origin = init.origin === undefined ? ORIGIN : init.origin;
  if (origin !== null) {
    headers.origin = origin;
    headers["sec-fetch-site"] = origin === ORIGIN ? "same-origin" : "cross-site";
  }

  return new Request(`${ORIGIN}/api/admin/submissions/delete`, {
    method: "POST",
    headers,
    body: body.toString(),
  });
}

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "marsa-erasure-"));
  vi.stubEnv("DATA_DIR", dir);
  vi.stubEnv("ADMIN_PASSWORD", "correct-horse-16");
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
  // No SUPABASE_URL, so getStore() builds the file store.
  vi.stubEnv("SUPABASE_URL", "");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
  vi.stubEnv("NODE_ENV", "test");
  state.cookie = (await createSessionToken(SECRET)).token;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  state.cookie = undefined;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("the erasure endpoint is closed to everyone but the operator", () => {
  it("refuses an unauthenticated caller with 401", async () => {
    state.cookie = undefined;
    const res = await deleteSubmission(deleteRequest("anything"));
    expect(res.status).toBe(401);
  });

  it("refuses a caller holding a session signed with the wrong secret", async () => {
    state.cookie = (await createSessionToken("ffffffffffffffffffffffffffffffff")).token;
    const res = await deleteSubmission(deleteRequest("anything"));
    expect(res.status).toBe(401);
  });

  it("refuses a cross-site POST even with a valid session", async () => {
    // The cookie is SameSite=Lax and would not be sent at all, but this is the
    // endpoint that destroys data, so the check is made rather than assumed.
    const res = await deleteSubmission(deleteRequest("anything", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("is checked for origin before it is checked for authentication", async () => {
    // Order matters: answering 401 to a cross-site probe tells the attacker
    // their forged request reached the handler at all.
    state.cookie = undefined;
    const res = await deleteSubmission(deleteRequest("x", { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
  });
});

describe("the id is validated before it becomes a query", () => {
  it.each([
    ["a PostgREST wildcard", "*"],
    ["an injected operator", "neq.x"],
    ["a path traversal", "../../etc/passwd"],
    ["an empty id", ""],
    ["something far too long", "a".repeat(65)],
  ])("rejects %s with 400", async (_label, id) => {
    const res = await deleteSubmission(deleteRequest(id));
    expect(res.status).toBe(400);
  });
});

describe("deleting says honestly what it did", () => {
  it("answers 404 when the id matched no record", async () => {
    const res = await deleteSubmission(deleteRequest("no-such-submission"));
    expect(res.status).toBe(404);
  });

  it("removes the record and redirects back to the list", async () => {
    const store = new FileSubmissionStore();
    await store.save(submission("keep-before"));
    await store.save(submission("erase-me"));
    await store.save(submission("keep-after"));

    const res = await deleteSubmission(deleteRequest("erase-me"));
    expect(res.status).toBe(303);

    const { items } = await store.list();
    expect(items.map((s) => s.id).sort()).toEqual(["keep-after", "keep-before"]);
  });

  it("does not take the neighbouring records with it", async () => {
    // The failure this guards: rewriting the file from a bounded read window
    // would delete everything outside the window as a side effect.
    const store = new FileSubmissionStore();
    for (let i = 0; i < 50; i++) await store.save(submission(`row-${i}`));

    await deleteSubmission(deleteRequest("row-25"));

    const { items, total } = await store.list({ limit: 500 });
    expect(total).toBe(49);
    expect(items.some((s) => s.id === "row-25")).toBe(false);
    expect(items.some((s) => s.id === "row-0")).toBe(true);
    expect(items.some((s) => s.id === "row-49")).toBe(true);
  });

  it("finds the record whichever kind's file holds it", async () => {
    const store = new FileSubmissionStore();
    await store.save(submission("a-contact", "contact"));
    await store.save(submission("a-subscriber", "subscribe"));

    expect((await deleteSubmission(deleteRequest("a-subscriber"))).status).toBe(303);

    const { items } = await store.list();
    expect(items.map((s) => s.id)).toEqual(["a-contact"]);
  });

  it("is gone after a second delete, which then reports 404", async () => {
    const store = new FileSubmissionStore();
    await store.save(submission("once"));

    expect((await deleteSubmission(deleteRequest("once"))).status).toBe(303);
    // A refresh or a Back-then-resubmit lands here. It must not claim success.
    expect((await deleteSubmission(deleteRequest("once"))).status).toBe(404);
  });
});

/**
 * The `Location` is a **relative path**, and these assertions read it as one.
 *
 * They used to parse it with `new URL(...)` and compare against
 * `${ORIGIN}/admin`, which only worked because the route built an absolute URL
 * out of `new URL(request.url).origin`. That reconstruction is what broke the
 * button in a real browser: when the server's idea of its own origin differs
 * from the document's — a proxy, a host alias, `localhost` answering a request
 * made to `127.0.0.1` — the redirect is cross-origin, `form-action 'self'`
 * blocks the navigation, and the operator watches a Delete that erased the
 * record report nothing at all. `lib/same-origin.ts#seeOther` has the whole
 * account.
 *
 * A relative Location is *also* the stronger property to assert here. The old
 * expectation could have been satisfied by an absolute URL on a host the tests
 * happened to supply; this one says the response cannot name a host at all,
 * which is the actual defence against an open redirect.
 */
describe("the return path cannot be turned into an open redirect", () => {
  async function locationFor(returnTo: string): Promise<string> {
    const store = new FileSubmissionStore();
    const id = `r${Math.abs(returnTo.length)}`;
    await store.save(submission(id));
    const res = await deleteSubmission(deleteRequest(id, { returnTo }));
    const location = res.headers.get("location")!;

    // Same-origin by construction: a path, never a URL, and never one a
    // browser would resolve against a different host.
    expect(location.startsWith("/"), `"${location}" is not a site-relative path`).toBe(true);
    expect(location.startsWith("//"), `"${location}" is protocol-relative`).toBe(false);
    // Resolving it against any origin must land back on that same origin.
    expect(new URL(location, "https://elsewhere.example").origin).toBe("https://elsewhere.example");

    // The confirmation flag is the route's own, and is asserted separately
    // below; these cases are about the *return path* it is appended to.
    const url = new URL(location, "http://localhost");
    expect(url.searchParams.get("erased")).toBe("1");
    url.searchParams.delete("erased");
    const query = url.searchParams.toString();
    return query ? `${url.pathname}?${query}` : url.pathname;
  }

  it.each([
    ["an absolute URL elsewhere", "https://evil.example/steal"],
    ["a protocol-relative URL", "//evil.example"],
    ["a path outside the admin area", "/account"],
  ])("ignores %s and returns to /admin", async (_label, returnTo) => {
    expect(await locationFor(returnTo)).toBe("/admin");
  });

  it("keeps the filters the operator was actually looking at", async () => {
    expect(await locationFor("/admin?kind=contact&q=ada&page=3")).toBe(
      "/admin?kind=contact&q=ada&page=3",
    );
  });

  it("drops a filter value the admin page does not understand", async () => {
    expect(await locationFor("/admin?kind=not-a-kind&evil=1")).toBe("/admin");
  });

  /**
   * The confirmation the list renders is the route's own claim, not the
   * caller's. `returnTo` is rebuilt from a closed set of parameters, so a link
   * carrying `erased=1` cannot survive into the redirect and make the page
   * report a deletion that never happened.
   */
  it("adds its own confirmation flag and refuses to echo a forged one", async () => {
    const store = new FileSubmissionStore();
    await store.save(submission("real-one"));

    const res = await deleteSubmission(
      deleteRequest("real-one", { returnTo: "/admin?erased=1&kind=contact" }),
    );
    const location = res.headers.get("location")!;
    // Exactly one, and it is there because a row was actually removed.
    expect([...new URL(location, "http://localhost").searchParams.getAll("erased")]).toEqual(["1"]);
    expect(location).toBe("/admin?kind=contact&erased=1");
  });

  it("never claims a deletion when there was nothing to delete", async () => {
    const res = await deleteSubmission(deleteRequest("no-such-row", { returnTo: "/admin?erased=1" }));
    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
  });
});

describe("the JSONL rewrite is safe on its own terms", () => {
  it("preserves a line it cannot parse rather than destroying it", async () => {
    // read() skips a corrupt line so a partial write cannot take a page down.
    // removeWhere must not use that as licence to delete it.
    const file = path.join(dir, "corrupt.jsonl");
    await fs.writeFile(file, '{"id":"good"}\nthis is not json\n{"id":"gone"}\n', "utf8");

    const store = new JsonlStore<{ id: string }>("corrupt.jsonl");
    const removed = await store.removeWhere((r) => r.id !== "gone");

    expect(removed).toBe(1);
    expect(await fs.readFile(file, "utf8")).toBe('{"id":"good"}\nthis is not json\n');
  });

  it("leaves the file untouched when nothing matched", async () => {
    const file = path.join(dir, "untouched.jsonl");
    const before = '{"id":"a"}\n{"id":"b"}\n';
    await fs.writeFile(file, before, "utf8");

    const store = new JsonlStore<{ id: string }>("untouched.jsonl");
    expect(await store.removeWhere(() => true)).toBe(0);
    expect(await fs.readFile(file, "utf8")).toBe(before);
  });

  it("treats a missing file as nothing to remove, not as an error", async () => {
    const store = new JsonlStore<{ id: string }>("never-written.jsonl");
    await expect(store.removeWhere(() => false)).resolves.toBe(0);
  });

  it("leaves no temporary file behind", async () => {
    const file = "temp-check.jsonl";
    await fs.writeFile(path.join(dir, file), '{"id":"a"}\n{"id":"b"}\n', "utf8");

    const store = new JsonlStore<{ id: string }>(file);
    await store.removeWhere((r) => r.id !== "a");

    const left = (await fs.readdir(dir)).filter((n) => n.endsWith(".tmp"));
    expect(left).toEqual([]);
  });
});
