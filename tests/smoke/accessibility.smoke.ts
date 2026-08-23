import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Browser, BrowserContext, Page } from "puppeteer-core";
import { startApp, type AppServer } from "./harness/server";
import { startPostgrestStub, makeRow, type PostgrestStub } from "./harness/postgrest-stub";
import {
  launchBrowser,
  newPage,
  settleAnimations,
  visit,
  waitForHydration,
} from "./harness/browser";
import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-session";

/**
 * axe-core over every public route at two widths, plus the states a page load
 * never reaches and the operator dashboard behind its password.
 *
 * ── Why this replaced a script ────────────────────────────────────────────
 * This ran for months as an untracked `.qa-axe.tmp.mjs` at the repository
 * root. Two things were wrong with that, and only one of them was tidiness.
 *
 * The listing's FAQ says the repository is public "including the scripts that
 * produce its measurements", and offers zero axe violations as a checkable
 * number. The script producing that number was gitignored, so the one claim
 * that invited verification was the one a reader could not verify. It also
 * carried an absolute path to one machine's home directory, so it would not
 * have run from a clean clone even if it had been committed.
 *
 * The second: its last recorded run **crashed**. It drove `/admin/login` with
 * `waitForSelector("main #admin-password")` and timed out after 60s. The field
 * was in the document the whole time — `/admin/login` is `force-dynamic`, so
 * Next.js streams it and parks the segment in a hidden node at the end of
 * `<body>` until an inline script moves it under `main`. The selector was
 * right and the wait was racing the reconciliation. The evidence file for an
 * accessibility claim was a stack trace.
 *
 * Both go away by reusing the harness the browser suite already has: it starts
 * a real production server against a PostgREST stub, it resolves Chrome the
 * same way, and it signs the operator in with the same signed cookie the login
 * route would have issued — so the admin scans no longer depend on typing into
 * a streamed form at all.
 *
 * ── What a green run does and does not mean ───────────────────────────────
 * Automated rules catch a minority of WCAG. Zero violations here means no
 * machine-detectable failure on the states listed below, not a certified
 * audit. That is why the interactive states are enumerated by hand: a crawl
 * that only loads pages never opens a menu, never expands an accordion and
 * never sees a validation error, which is where these rules earn their keep.
 */

const AXE = readFileSync(
  path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const ADMIN_PASSWORD = "a11y-operator-password";
const ADMIN_SESSION_SECRET = "0123456789abcdef0123456789abcdef";

/** Every route a signed-out visitor can reach. */
const ROUTES = [
  "/",
  "/demo",
  "/pricing",
  "/get-started",
  "/contact",
  "/faq",
  "/blog",
  "/blog/why-non-eu-companies-struggle-with-european-payments",
  "/business/eu-business-account",
  "/business/multi-currency-iban",
  "/business/how-it-works",
  "/business/e-commerce-sellers",
  "/personal/multi-currency-iban",
  "/personal/sepa-transfers",
  "/personal/how-it-works",
  "/solutions/import-export",
  "/solutions/agencies-freelancers",
  "/solutions/company-formation",
  "/tools/currency-converter",
  "/tools/iban-checker",
  "/tools/fx-calculator",
  "/tools/sepa-vs-swift",
  "/company/about",
  "/company/compliance",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
  "/login",
  "/register",
  "/forgot-password",
  "/admin/login",
  "/this-page-does-not-exist",
];

type Violation = { id: string; impact: string; nodes: number; help: string; target: string };

let app: AppServer;
let browser: Browser;
let stub: PostgrestStub;
const contexts: BrowserContext[] = [];

async function freshContext(): Promise<BrowserContext> {
  const context = await browser.createBrowserContext();
  contexts.push(context);
  return context;
}

beforeAll(async () => {
  stub = await startPostgrestStub();
  stub.seed(
    Array.from({ length: 8 }, (_, i) =>
      makeRow({
        id: `row-${String(i).padStart(3, "0")}`,
        kind: i % 3 === 0 ? "contact" : i % 3 === 1 ? "lead" : "subscribe",
        created_at: new Date(Date.UTC(2026, 0, 1 + i, 9, 30)).toISOString(),
        data: { name: `Person ${String(i).padStart(3, "0")}`, email: `p${i}@example.invalid` },
      }),
    ),
  );
  app = await startApp({
    env: {
      SUPABASE_URL: stub.url,
      SUPABASE_SERVICE_ROLE_KEY: "a11y-service-role-key",
      ADMIN_PASSWORD,
      ADMIN_SESSION_SECRET,
    },
  });
  browser = await launchBrowser();
}, 180_000);

afterAll(async () => {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close().catch(() => {});
  await app?.stop();
  await stub?.close();
});

/**
 * Run axe in the page and return only what failed.
 *
 * The settle is part of scanning, not a step a caller may forget: a scan taken
 * while the page is still revealing itself measures opacity mid-transition and
 * reports contrast failures that exist for a third of a second. See
 * `settleAnimations`.
 */
async function scan(page: Page): Promise<Violation[]> {
  await settleAnimations(page);
  await page.evaluate(AXE);
  const result = (await page.evaluate(
    async (tags: string[]) =>
      await (window as unknown as { axe: { run: (d: Document, o: unknown) => Promise<unknown> } }).axe.run(
        document,
        { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] },
      ),
    TAGS,
  )) as {
    violations: {
      id: string;
      impact: string;
      help: string;
      nodes: { target: string[] }[];
    }[];
  };

  return result.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.length,
    help: v.help,
    target: v.nodes[0]?.target?.join(" ") ?? "",
  }));
}

/** A readable failure message, so a red run names the element and the rule. */
function describeAll(violations: Violation[]): string {
  return violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} — ${v.nodes} node(s), first at ${v.target}`)
    .join("\n");
}

async function open(width: number): Promise<Page> {
  const { page } = await newPage(await freshContext(), width);
  return page;
}

/**
 * Signed in with the cookie the login route would have issued, rather than by
 * typing into a streamed form. Same secret, same `createSessionToken`, and no
 * race to lose.
 */
async function signedInPage(width: number, route: string): Promise<Page> {
  const context = await freshContext();
  const { token } = await createSessionToken(ADMIN_SESSION_SECRET);
  await context.setCookie({
    name: ADMIN_COOKIE,
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
  });
  const { page } = await newPage(context, width);
  await visit(page, `${app.origin}${route}`);
  // Anchored under `main`: during streaming the segment is parked in a hidden
  // node at the end of `<body>`, so "the element exists" is not "the page is
  // ready to be judged".
  await page.waitForSelector("main h1", { timeout: 30_000 });
  return page;
}

describe("axe-core finds no violation on any public route", () => {
  for (const route of ROUTES) {
    for (const width of [390, 1280]) {
      it(`${route} @${width}`, async () => {
        const page = await open(width);
        await visit(page, `${app.origin}${route}`);
        const violations = await scan(page);
        expect(violations, describeAll(violations)).toEqual([]);
        await page.close();
      });
    }
  }
});

describe("axe-core finds no violation in states a page load never reaches", () => {
  it("the mobile menu, open", async () => {
    const page = await open(390);
    await visit(page, `${app.origin}/pricing`);
    await waitForHydration(page);
    await page.click('button[aria-label="Open menu"]');
    await page.waitForSelector('button[aria-label="Close menu"]', { timeout: 10_000 });
    const violations = await scan(page);
    expect(violations, describeAll(violations)).toEqual([]);
    await page.close();
  });

  it("the concept disclosure, open", async () => {
    const page = await open(1280);
    await visit(page, `${app.origin}/`);
    await waitForHydration(page);
    await page.click("[data-disclosure]");
    await page.waitForSelector('[data-disclosure][aria-expanded="true"]', { timeout: 10_000 });
    const violations = await scan(page);
    expect(violations, describeAll(violations)).toEqual([]);
    await page.close();
  });

  it("a navbar dropdown, open", async () => {
    const page = await open(1280);
    await visit(page, `${app.origin}/`);
    await waitForHydration(page);
    await page.click("header nav ul li button");
    await page.waitForSelector('header nav ul li button[aria-expanded="true"]', {
      timeout: 10_000,
    });
    const violations = await scan(page);
    expect(violations, describeAll(violations)).toEqual([]);
    await page.close();
  });

  it("the FAQ accordion, expanded", async () => {
    const page = await open(1280);
    await visit(page, `${app.origin}/faq`);
    await waitForHydration(page);
    await page.click("main button[aria-expanded]");
    await page.waitForSelector('main button[aria-expanded="true"]', { timeout: 10_000 });
    const violations = await scan(page);
    expect(violations, describeAll(violations)).toEqual([]);
    await page.close();
  });

  it("a form showing its validation errors", async () => {
    const page = await open(1280);
    await visit(page, `${app.origin}/contact`);
    await waitForHydration(page);
    await page.click('main form button[type="submit"]');
    // The condition, not a sleep: an error is on screen when a field is marked
    // invalid, which is also the thing being scanned.
    await page.waitForSelector('main [aria-invalid="true"]', { timeout: 10_000 });
    const violations = await scan(page);
    expect(violations, describeAll(violations)).toEqual([]);
    await page.close();
  });

  it("the demo, at its final step", async () => {
    const page = await open(1280);
    await visit(page, `${app.origin}/demo`);
    await waitForHydration(page);

    // Drive to the end by condition. Each iteration waits for *some* live
    // forward control and clicks it; the identity step's Continue is disabled
    // until its simulated check finishes, so polling is what makes this
    // deterministic rather than a guessed delay.
    for (let i = 0; i < 20; i++) {
      const atEnd = await page.evaluate(
        () => document.querySelector('[aria-current="step"]')?.textContent?.trim() === "Done",
      );
      if (atEnd) break;
      const advanced = await page
        .waitForFunction(
          () => {
            const live = Array.from(document.querySelectorAll("button")).filter((b) => {
              const cs = getComputedStyle(b);
              return cs.display !== "none" && cs.visibility !== "hidden" && !b.disabled;
            });
            const label = (b: Element) => (b.textContent ?? "").trim();
            const action = live.find((b) => /^(Receive|Convert|Send)\b/.test(label(b)));
            if (action) {
              (action as HTMLButtonElement).click();
              return true;
            }
            const forward = live.find((b) => /^(Start the demo|Continue)$/.test(label(b)));
            if (forward) {
              (forward as HTMLButtonElement).click();
              return true;
            }
            return false;
          },
          { timeout: 20_000, polling: 100 },
        )
        .then(() => true)
        .catch(() => false);
      if (!advanced) break;
    }

    const reachedEnd = await page.evaluate(
      () => document.querySelector('[aria-current="step"]')?.textContent?.trim() === "Done",
    );
    expect(reachedEnd, "the demo did not reach its final step").toBe(true);

    const violations = await scan(page);
    expect(violations, describeAll(violations)).toEqual([]);
    await page.close();
  });
});

describe("axe-core finds no violation in the operator dashboard", () => {
  for (const width of [390, 1280]) {
    it(`/admin, signed in @${width}`, async () => {
      const page = await signedInPage(width, "/admin");
      await page.waitForSelector("main table", { timeout: 30_000 });
      const violations = await scan(page);
      expect(violations, describeAll(violations)).toEqual([]);
      await page.close();
    });

    it(`/admin/funnel, signed in @${width}`, async () => {
      const page = await signedInPage(width, "/admin/funnel");
      const violations = await scan(page);
      expect(violations, describeAll(violations)).toEqual([]);
      await page.close();
    });
  }
});
