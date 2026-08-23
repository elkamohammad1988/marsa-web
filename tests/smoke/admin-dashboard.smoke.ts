import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type { Browser, BrowserContext, Page } from "puppeteer-core";
import { startApp, type AppServer } from "./harness/server";
import { startPostgrestStub, makeRow, type PostgrestStub } from "./harness/postgrest-stub";
import {
  launchBrowser,
  newPage,
  visit,
  faults,
  pageText,
  clickAndNavigate,
  type Instrumented,
} from "./harness/browser";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-session";

/**
 * The operator dashboard, driven in a real browser behind its real password.
 *
 * ── Why this suite exists ─────────────────────────────────────────────────
 * `/admin` is the half of this application with the most to go wrong — sign
 * in, list, filter, search, paginate, export, erase, sign out — and until now
 * it had no browser coverage at all. The unit suite asserts every one of those
 * behaviours at the function and the status code, and every one of those
 * assertions passed while two of the dashboard's buttons did nothing in a
 * browser:
 *
 *   The erasure and sign-out endpoints answered `303` with an **absolute**
 *   `Location` rebuilt from `new URL(request.url).origin`. When the server's
 *   idea of its own host differs from the document's — a proxy, an alias, a
 *   server bound to `localhost` answering `127.0.0.1` — that redirect is
 *   cross-origin, and every page here is served with `form-action 'self'`, so
 *   the browser blocks the navigation. The operator pressed Delete and watched
 *   the row stay on screen; the record had already been erased. They pressed
 *   Sign out and stayed signed in on screen; the session had already been
 *   destroyed. `lib/same-origin.ts#seeOther` is the fix, and the two
 *   `navigated` assertions below are what would have caught it.
 *
 * Nothing about that is visible to a type checker, a linter, a unit test, or a
 * smoke test that only loads pages. It needs a browser that presses the button
 * and then asks where it ended up.
 *
 * ── Why a stub rather than a database ─────────────────────────────────────
 * `tests/smoke/harness/postgrest-stub.ts` speaks the wire protocol over the
 * same `fetch`, so `lib/postgrest.ts` is genuinely exercised — the
 * `Content-Range` parsing, the `Prefer` headers, the `ilike` filter, the
 * `id=eq.` delete and its representation count are all real code paths. It is
 * not a Postgres and enforces no Row Level Security; `tests/migrations.test.ts`
 * is what asserts the policies, from the SQL itself.
 */

const ADMIN_PASSWORD = "smoke-operator-password";
const ADMIN_SESSION_SECRET = "0123456789abcdef0123456789abcdef";

/** 30 rows across the three kinds: two pages at a page size of 25. */
function seedRows() {
  return Array.from({ length: 30 }, (_, i) =>
    makeRow({
      id: `row-${String(i).padStart(3, "0")}`,
      kind: i % 3 === 0 ? "contact" : i % 3 === 1 ? "lead" : "subscribe",
      created_at: new Date(Date.UTC(2026, 0, 1 + i, 9, 30)).toISOString(),
      data: { name: `Person ${String(i).padStart(3, "0")}`, email: `p${i}@example.invalid` },
    }),
  );
}

let app: AppServer;
let browser: Browser;
let stub: PostgrestStub;

/**
 * Every test gets its own cookie jar.
 *
 * Pages opened straight from the `Browser` share one, so a test that signs an
 * operator in silently signs in every "unauthenticated visitor" test that runs
 * after it — and those are precisely the assertions that must not be able to
 * pass by accident. The contexts are closed in `afterEach` so a run leaks
 * nothing between files.
 */
const contexts: BrowserContext[] = [];

async function freshContext(): Promise<BrowserContext> {
  const context = await browser.createBrowserContext();
  contexts.push(context);
  return context;
}

beforeAll(async () => {
  stub = await startPostgrestStub();
  app = await startApp({
    env: {
      SUPABASE_URL: stub.url,
      SUPABASE_SERVICE_ROLE_KEY: "smoke-service-role-key",
      ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET,
    },
  });
  browser = await launchBrowser();
}, 180_000);

afterAll(async () => {
  await browser?.close();
  await app?.stop();
  await stub?.close();
});

beforeEach(() => {
  stub.seed(seedRows());
});

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close().catch(() => {})));
});

/**
 * A page holding a signed-in operator session, parked on `/admin`.
 *
 * The session cookie is **minted, not typed**, and that is a constraint the
 * application imposes rather than a shortcut. `ADMIN_LOGIN_TIERS` allows five
 * sign-in attempts per address per fifteen minutes, and `rateLimitShared`
 * treats its in-memory window as a hard floor — `if (!local.ok) return local`,
 * so a stubbed database cannot wave a sixth attempt through. Every test here
 * arrives from 127.0.0.1, so a suite that signed in through the form for each
 * one would spend its allowance by the sixth test and then fail the rest with
 * "Too many attempts" — a red suite reporting a working rate limiter.
 *
 * So the sign-in *journey* is asserted once, through the form, in
 * "opens the dashboard for the right password". Everything after it is about
 * what an operator can do once inside, and gets there by presenting the same
 * signed cookie the login route would have issued, produced by the same
 * `createSessionToken` with the same secret.
 */
async function signedIn(width = 1280): Promise<Instrumented> {
  const context = await freshContext();
  const { token } = await createSessionToken(ADMIN_SESSION_SECRET);
  await context.setCookie({
    name: ADMIN_COOKIE,
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
  });

  const instrumented = await newPage(context, width);
  await visit(instrumented.page, `${app.origin}/admin`);
  await settled(instrumented.page, "main table");
  return instrumented;
}

/**
 * Wait for streamed content to be *in the document*, not merely present.
 *
 * `/admin` and `/admin/login` are `force-dynamic`, so Next.js streams them:
 * the shell arrives first and each suspended segment follows, parked in a
 * hidden staging node at the end of `<body>` and moved into place by an inline
 * script. During that window `document.querySelector("#admin-password")`
 * already finds the sign-in field — while `main` is still empty and the first
 * `form button[type="submit"]` in document order is the newsletter's Subscribe
 * button in the footer.
 *
 * That is not hypothetical: it is what this suite did before this helper
 * existed. It typed the operator's password into a parked field, pressed
 * Subscribe, and reported "Email address is required." as the admin login
 * error. `waitForHydration` does not cover it — the client bundle has run; the
 * segment simply has not landed yet.
 *
 * So every selector here is anchored under `main`, and this is what waits for
 * it to be there.
 */
async function settled(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 30_000 });
}


/**
 * Click something, once the browser agrees it is actually there to be clicked.
 *
 * Two failures sit behind this, and both reported the same unhelpful sentence
 * — *"Node is either not clickable or not an Element"*.
 *
 * The first is the sticky navigation pill: Puppeteer scrolls a target into
 * view but stops the moment it is inside the viewport, which can leave it
 * underneath the bar. Centring it first is the fix, and it is the browser's
 * own scrolling rather than a coordinate this suite guesses at.
 *
 * The second is timing. `/admin` is `force-dynamic` and streams, so a
 * `waitForSelector` resolves when the element *exists*, which is not the same
 * moment it has a box the compositor will hit-test. So the wait here is for
 * the condition that actually matters: a non-zero rectangle inside the
 * viewport that hit-tests back to the element itself. Same rule as the rest of
 * the harness — a condition and a budget, never a sleep.
 */
async function readyToClick(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { timeout: 30_000 });
  await page.waitForFunction(
    (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: "center", behavior: "instant" });
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      if (rect.top < 0 || rect.bottom > window.innerHeight) return false;
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      return hit === el || el.contains(hit);
    },
    { timeout: 30_000, polling: 50 },
    selector,
  );
}

async function press(page: Page, selector: string): Promise<void> {
  await readyToClick(page, selector);
  await page.click(selector);
}

/**
 * `press`, then wait for the navigation it causes.
 *
 * `clickAndNavigate` starts the click and the wait together, which is what
 * stops the navigation finishing before anything is listening for it on a fast
 * local server — the classic intermittent failure in a browser suite.
 */
async function pressAndNavigate(page: Page, selector: string): Promise<void> {
  await readyToClick(page, selector);
  await clickAndNavigate(page, selector);
}

/** Every submission id currently rendered in the table. */
function renderedIds(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('main input[name="id"]')).map(
      (input) => (input as HTMLInputElement).value,
    ),
  );
}

describe("the operator area is closed until it is opened", () => {
  it("sends an unauthenticated visitor to the sign-in page", async () => {
    const { page, problems } = await newPage(await freshContext());
    try {
      await visit(page, `${app.origin}/admin`);
      expect(page.url()).toContain("/admin/login");
      // Not a redirect to a page that then leaks the list.
      expect(await pageText(page)).not.toContain("Export CSV");
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  });

  it("refuses a wrong password, says so, and does not sign anybody in", async () => {
    const { page } = await newPage(await freshContext());
    try {
      await visit(page, `${app.origin}/admin/login`);
      await settled(page, "main #admin-password");
      await page.type("main #admin-password", "not-the-password");
      await press(page, "main form button[type=\"submit\"]");
      // The form reports the failure in a live region rather than navigating.
      await page.waitForSelector('main [role="alert"]', { timeout: 20_000 });
      const alert = await page.evaluate(
        () => document.querySelector('main [role="alert"]')?.textContent ?? "",
      );
      expect(alert).toMatch(/incorrect password/i);
      expect(page.url()).toContain("/admin/login");

      // And the door is still shut.
      await visit(page, `${app.origin}/admin`);
      expect(page.url()).toContain("/admin/login");
    } finally {
      await page.close();
    }
  });

  it("opens the dashboard for the right password", async () => {
    // The one test that signs in the way an operator does. See `signedIn`
    // for why the others present the cookie instead.
    const { page, problems } = await newPage(await freshContext());
    try {
      await visit(page, `${app.origin}/admin/login`);
      await settled(page, "main #admin-password");
      await page.type("main #admin-password", ADMIN_PASSWORD);
      await press(page, "main form button[type=\"submit\"]");
      await settled(page, "main table");

      expect(page.url()).toBe(`${app.origin}/admin`);
      const text = await pageText(page);
      expect(text).toContain("Submissions");
      expect(text).toContain("Export CSV");
      // The KPI strip reads from the stats RPC, not from the page window.
      expect(text).toMatch(/TOTAL 30|Total 30/i);
      expect(await renderedIds(page)).toHaveLength(25);
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  });
});

describe("the list can be searched, filtered and paged", () => {
  it("narrows to one record on a search", async () => {
    const { page, problems } = await signedIn();
    try {
      await settled(page, 'main input[name="q"]');
      await page.type('main input[name="q"]', "Person 007");
      await pressAndNavigate(page, 'main form[action="/admin"] button[type="submit"]');
      await settled(page, "main table");

      expect(await renderedIds(page)).toEqual(["row-007"]);
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  });

  it("explains an empty result rather than showing an empty table", async () => {
    const { page } = await signedIn();
    try {
      await visit(page, `${app.origin}/admin?q=nobody-by-that-name`);
      // /admin is force-dynamic, so Next.js streams it and parks the segment
      // in a hidden node at the end of <body> until an inline script moves it
      // under <main>. Reading innerText before that lands returns the shell —
      // the skip link, the navbar, and app/admin/loading.tsx — and the
      // assertion fails on a page that is about to be correct. Every other
      // test here waits for "main table"; the empty case has no table, so it
      // waits for the heading, which the loading fallback does not render.
      await settled(page, "main h1");
      const text = await pageText(page);
      expect(text).toMatch(/No submissions/i);
      expect(text).toContain("nobody-by-that-name");
    } finally {
      await page.close();
    }
  });

  it("filters to a single kind", async () => {
    const { page } = await signedIn();
    try {
      await visit(page, `${app.origin}/admin?kind=lead`);
      await settled(page, "main table");
      const kinds = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main tbody tr td:nth-child(2)")).map((cell) =>
          (cell.textContent ?? "").trim(),
        ),
      );
      expect(kinds.length).toBeGreaterThan(0);
      expect([...new Set(kinds)]).toEqual(["lead"]);
    } finally {
      await page.close();
    }
  });

  it("walks to page two and back without repeating or losing a record", async () => {
    const { page, problems } = await signedIn();
    try {
      const firstPage = await renderedIds(page);
      expect(firstPage).toHaveLength(25);

      await pressAndNavigate(page, 'main nav[aria-label="Pagination"] a[href*="page=2"]');
      await settled(page, "main table");
      const secondPage = await renderedIds(page);

      // 30 records, 25 to a page.
      expect(secondPage).toHaveLength(5);
      expect(firstPage.filter((id) => secondPage.includes(id))).toEqual([]);
      expect(new Set([...firstPage, ...secondPage]).size).toBe(30);

      // Back again, and page one is unchanged. The "Previous" link carries
      // `page=1` rather than dropping the parameter, so it is matched by its
      // destination rather than by an exact href.
      await pressAndNavigate(page, 'main nav[aria-label="Pagination"] a[href*="page=1"]');
      await settled(page, "main table");
      expect(await renderedIds(page)).toEqual(firstPage);
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  });
});

describe("the CSV export is a real file with real rows in it", () => {
  it("answers text/csv with a header row and one line per record", async () => {
    const { page } = await signedIn();
    try {
      const csv = await page.evaluate(async (origin) => {
        const res = await fetch(`${origin}/api/admin/export`, { credentials: "include" });
        return { status: res.status, type: res.headers.get("content-type"), body: await res.text() };
      }, app.origin);

      expect(csv.status).toBe(200);
      expect(csv.type).toMatch(/text\/csv/);

      const lines = csv.body.trim().split(/\r?\n/);
      expect(lines[0]).toContain('"id"');
      expect(lines[0]).toContain('"kind"');
      // Every seeded record, not just the page on screen.
      expect(lines).toHaveLength(31);
      expect(csv.body).toContain("row-000");
      expect(csv.body).toContain("row-029");
    } finally {
      await page.close();
    }
  });

  it("is closed to a caller with no session", async () => {
    const { page } = await newPage(await freshContext());
    try {
      await visit(page, `${app.origin}/`);
      const status = await page.evaluate(async (origin) => {
        const res = await fetch(`${origin}/api/admin/export`, { credentials: "include" });
        return res.status;
      }, app.origin);
      expect(status).toBe(401);
    } finally {
      await page.close();
    }
  });
});

describe("erasing a record", () => {
  it("takes two deliberate actions, not one", async () => {
    const { page } = await signedIn();
    try {
      const before = stub.rows().length;

      // The control the operator meets first opens a disclosure. It must not
      // be a submit button, and pressing it must destroy nothing.
      await press(page, "main details[data-erase] > summary");
      await page.waitForFunction(
        () => document.querySelector("main details[data-erase][open]") !== null,
        { timeout: 10_000 },
      );
      expect(stub.rows()).toHaveLength(before);

      const panel = await pageText(page);
      expect(panel).toMatch(/cannot be undone/i);
      expect(panel).toMatch(/Erase permanently/i);
    } finally {
      await page.close();
    }
  });

  it("erases the record, navigates back to the list, and says so", async () => {
    const { page, problems } = await signedIn();
    try {
      const target = (await renderedIds(page))[0];
      const before = stub.rows().length;

      await press(page, "main details[data-erase] > summary");
      await page.waitForSelector("main details[data-erase][open] button[type=submit]", { timeout: 10_000 });

      /*
       * The assertion this whole file was written for: the browser must
       * actually *navigate*. With the old absolute redirect the POST went
       * through, the record was erased, and `form-action 'self'` then blocked
       * the 303 — leaving the operator looking at the row they had just
       * deleted, with no way to tell whether anything had happened.
       */
      await pressAndNavigate(page, "main details[data-erase][open] button[type=submit]");
      await settled(page, "main table");

      expect(page.url()).toContain("/admin");
      expect(stub.rows()).toHaveLength(before - 1);
      expect(stub.rows().some((row) => row.id === target)).toBe(false);
      expect(await renderedIds(page)).not.toContain(target);
      expect(await pageText(page)).toMatch(/Submission erased/i);
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  });

  it("keeps the operator's filter and page when it returns them", async () => {
    const { page } = await signedIn();
    try {
      await visit(page, `${app.origin}/admin?kind=lead`);
      await settled(page, "main table");
      await press(page, "main details[data-erase] > summary");
      await page.waitForSelector("main details[data-erase][open] button[type=submit]", { timeout: 10_000 });
      await pressAndNavigate(page, "main details[data-erase][open] button[type=submit]");
      await settled(page, "main table");

      expect(page.url()).toContain("kind=lead");
      const kinds = await page.evaluate(() =>
        Array.from(document.querySelectorAll("main tbody tr td:nth-child(2)")).map((cell) =>
          (cell.textContent ?? "").trim(),
        ),
      );
      expect([...new Set(kinds)]).toEqual(["lead"]);
    } finally {
      await page.close();
    }
  });
});

describe("signing out", () => {
  it("navigates away and closes the area behind it", async () => {
    const { page, problems } = await signedIn();
    try {
      // Same regression as the erasure above: the POST always worked, and the
      // redirect it answered with was what the browser refused.
      await pressAndNavigate(page, 'main form[action="/api/admin/logout"] button[type="submit"]');
      expect(page.url()).toContain("/admin/login");

      await visit(page, `${app.origin}/admin`);
      expect(page.url()).toContain("/admin/login");
      expect(await pageText(page)).not.toContain("Export CSV");
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  });
});

describe("the dashboard fits a phone", () => {
  it("does not scroll sideways at 320px", async () => {
    const { page } = await signedIn(320);
    try {
      const scrolled = await page.evaluate(async () => {
        window.scrollTo(0, 0);
        window.scrollBy(600, 0);
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const x = window.scrollX;
        window.scrollTo(0, 0);
        return x;
      });
      /*
       * The wide table is inside a `ScrollRegion` and scrolls within itself,
       * which is the intended design; what must not happen is the *page*
       * moving sideways. Three pill buttons on one unwrapped row used to make
       * it, at 353px against a 320px viewport.
       *
       * Not `toBe(0)`: Chrome reports a pixel or two of scroll on a document
       * that contains a horizontally scrollable region, on pages that are
       * demonstrably fixed. The threshold is what separates "a rounding
       * artefact" from "a reader can swipe the layout off the screen".
       */
      expect(scrolled).toBeLessThanOrEqual(2);
    } finally {
      await page.close();
    }
  });
});

describe("the demo funnel view", () => {
  it("renders behind the same password and is anonymous", async () => {
    const { page, problems } = await newPage(await freshContext());
    try {
      await visit(page, `${app.origin}/admin/funnel`);
      expect(page.url()).toContain("/admin/login");
    } finally {
      await page.close();
    }
    const { page: signedInPage, problems: signedInProblems } = await signedIn();
    try {
      await visit(signedInPage, `${app.origin}/admin/funnel`);
      const text = await pageText(signedInPage);
      expect(signedInPage.url()).toContain("/admin/funnel");
      // No personal data on this view, by construction.
      expect(text).not.toMatch(/@example\.invalid/);
      expect(faults(signedInProblems)).toEqual([]);
      expect(faults(problems)).toEqual([]);
    } finally {
      await signedInPage.close();
    }
  });
});
