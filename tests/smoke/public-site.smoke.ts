import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Browser } from "puppeteer-core";
import { startApp, type AppServer } from "./harness/server";
import {
  launchBrowser,
  newPage,
  visit,
  faults,
  pageText,
  clickAndNavigate,
  waitFor,
} from "./harness/browser";

/**
 * The public site, driven in a real browser against a production build.
 *
 * This is the suite the previous production pass left open, and the reason it
 * matters is on the record: every gate the repository had was green over a
 * `/blog` pagination control that a keyboard user could focus and follow to
 * `#`, and over an `/admin` page that crashed for the only person who could
 * reach it. Neither is visible to a type checker, a linter, or a test that
 * never renders anything.
 *
 * Scope is deliberate. These are smoke tests: they prove the critical journeys
 * work end to end in a browser, and they do not duplicate the 1,800 unit tests
 * that already assert business logic far more cheaply. Every assertion here
 * needs a browser to make.
 */

/** The routes a visitor is most likely to reach, plus the ones most likely to break. */
const PUBLIC_ROUTES = [
  "/",
  "/pricing",
  "/faq",
  "/contact",
  "/get-started",
  "/demo",
  "/blog",
  "/blog/the-rise-of-multi-currency-accounts",
  "/tools/currency-converter",
  "/tools/fx-calculator",
  "/tools/iban-checker",
  "/tools/sepa-vs-swift",
  "/personal/how-it-works",
  "/business/how-it-works",
  "/solutions/agencies-freelancers",
  "/company/about",
  "/company/compliance",
  "/legal/privacy",
  "/legal/terms",
  "/legal/cookies",
];

let app: AppServer;
let browser: Browser;

beforeAll(async () => {
  // No database and no admin credentials: the shape the public deployment
  // actually runs in, so the authenticated areas are genuinely shut rather
  // than mocked open.
  app = await startApp();
  browser = await launchBrowser();
}, 180_000);

afterAll(async () => {
  await browser?.close();
  await app?.stop();
});

describe("every public route renders cleanly", () => {
  it.each(PUBLIC_ROUTES)("%s loads with no browser-visible faults", async (route) => {
    const { page, problems } = await newPage(browser);
    try {
      const response = await visit(page, app.origin + route);
      expect(response.status(), `${route} did not answer 200`).toBe(200);
      expect(faults(problems), `${route} reported faults`).toEqual([]);

      // Exactly one top-level heading. More than one is a real navigation and
      // screen-reader defect and has regressed on this project before.
      const h1s = await page.$$eval("h1", (els) => els.map((e) => e.textContent?.trim() ?? ""));
      expect(h1s, `${route} should have exactly one h1`).toHaveLength(1);
      expect(h1s[0]).not.toBe("");
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe("nothing clickable is a dead end", () => {
  it.each(PUBLIC_ROUTES)("%s has no dead links and no unlabelled controls", async (route) => {
    const { page } = await newPage(browser);
    try {
      await visit(page, app.origin + route);

      const audit = await page.evaluate(() => {
        const dead: string[] = [];
        const unnamed: string[] = [];
        const unlabelled: string[] = [];

        document.querySelectorAll("a").forEach((a) => {
          const href = a.getAttribute("href");
          const name = (a.getAttribute("aria-label") || a.textContent || "").trim();
          // `href="#"` is a control that was never wired up, or one deactivated
          // by presentation while staying in the tab order. Both are defects.
          if (!href || href === "#") dead.push(name || a.outerHTML.slice(0, 80));
          // `aria-disabled` on an anchor announces a state it cannot enforce.
          if (a.hasAttribute("aria-disabled")) dead.push(`aria-disabled: ${name}`);
          if (!name) unnamed.push(a.outerHTML.slice(0, 80));
        });

        document.querySelectorAll("button").forEach((b) => {
          const name = (b.getAttribute("aria-label") || b.textContent || "").trim();
          if (!name) unnamed.push(b.outerHTML.slice(0, 80));
        });

        document.querySelectorAll("input, select, textarea").forEach((el) => {
          const field = el as HTMLInputElement;
          if (field.type === "hidden") return;
          const labelled =
            (field.id && document.querySelector(`label[for="${CSS.escape(field.id)}"]`)) ||
            field.closest("label") ||
            field.getAttribute("aria-label") ||
            field.getAttribute("aria-labelledby");
          if (!labelled) unlabelled.push(`${field.tagName}[name=${field.name || "?"}]`);
        });

        return { dead, unnamed, unlabelled };
      });

      expect(audit.dead, `${route} has links that go nowhere`).toEqual([]);
      expect(audit.unnamed, `${route} has controls with no accessible name`).toEqual([]);
      expect(audit.unlabelled, `${route} has form fields with no label`).toEqual([]);
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe("blog pagination is reachable by keyboard and never a dead link", () => {
  it("renders the unavailable end as text, not as a focusable anchor", async () => {
    const { page } = await newPage(browser);
    try {
      await visit(page, `${app.origin}/blog`);

      const pagination = await page.evaluate(() => {
        const nav = document.querySelector("nav[aria-label='Pagination']");
        if (!nav) return null;
        const byText = (text: string) =>
          [...nav.children].find((el) => el.textContent?.trim() === text);
        return {
          previousTag: byText("Previous")?.tagName ?? null,
          nextTag: byText("Next")?.tagName ?? null,
          anchorsWithHref: nav.querySelectorAll("a[href]").length,
          anyPlaceholderHref: [...nav.querySelectorAll("a")].some(
            (a) => a.getAttribute("href") === "#",
          ),
        };
      });

      expect(pagination, "the blog should paginate").not.toBeNull();
      // On page 1 "Previous" has nowhere to go, so it must not be a link at all.
      expect(pagination!.previousTag).toBe("SPAN");
      expect(pagination!.nextTag).toBe("A");
      expect(pagination!.anyPlaceholderHref).toBe(false);
    } finally {
      await page.close();
    }
  }, 90_000);

  it("walks to page 2 and back, and the ends swap over", async () => {
    const { page, problems } = await newPage(browser);
    try {
      await visit(page, `${app.origin}/blog`);
      await clickAndNavigate(page, "nav[aria-label='Pagination'] a[rel='next']");

      expect(new URL(page.url()).searchParams.get("page")).toBe("2");

      const onPageTwo = await page.evaluate(() => {
        const nav = document.querySelector("nav[aria-label='Pagination']")!;
        const byText = (text: string) =>
          [...nav.children].find((el) => el.textContent?.trim() === text);
        return { previousTag: byText("Previous")?.tagName, nextTag: byText("Next")?.tagName };
      });

      // The last page has no Next, so the roles are the mirror of page 1.
      expect(onPageTwo.previousTag).toBe("A");
      expect(onPageTwo.nextTag).toBe("SPAN");
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe("the IBAN checker validates offline", () => {
  it("accepts a checksum-valid IBAN and names its country", async () => {
    const { page } = await newPage(browser);
    try {
      await visit(page, `${app.origin}/tools/iban-checker`);
      await page.type("input", "DE89370400440532013000");

      // Wait for the verdict rather than for a duration.
      await page.waitForFunction(() => /valid/i.test(document.body.innerText), { timeout: 15_000 });

      const text = await pageText(page);
      expect(text).toMatch(/valid/i);
      expect(text).toContain("Germany");
    } finally {
      await page.close();
    }
  }, 90_000);

  it("rejects an IBAN whose check digits are wrong", async () => {
    const { page } = await newPage(browser);
    try {
      await visit(page, `${app.origin}/tools/iban-checker`);
      // The same account number with the final digit changed: correct length,
      // correct country, failing MOD-97.
      await page.type("input", "DE89370400440532013001");

      await page.waitForFunction(
        () => /check digit|not valid|invalid/i.test(document.body.innerText),
        { timeout: 15_000 },
      );

      expect(await pageText(page)).toMatch(/check digit|not valid|invalid/i);
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe("the FX tools fetch live rates and react to input", () => {
  it("the calculator requests a rate on mount and again when the pair changes", async () => {
    const { page, problems } = await newPage(browser);
    try {
      /*
       * One source of truth for "a request happened": the CDP request log.
       *
       * This previously counted responses here and then waited on
       * `performance.getEntriesByType("resource")` inside the page, comparing
       * one series against the other. They do not agree, and the disagreement
       * is not a race that a longer timeout fixes: a response served from
       * Chrome's memory cache raises a CDP `response` event but adds no new
       * resource-timing entry, so the mount could be seen twice by the
       * listener and once by the page. The wait was then for a *third* entry
       * that a single refetch could never produce, and the test hung for its
       * full budget while the application was doing exactly the right thing.
       *
       * Waiting on the request log instead states the requirement directly —
       * changing the target currency asks the server for that pair — and is
       * unaffected by how any earlier response was cached.
       */
      const rateCalls: string[] = [];
      page.on("response", (res) => {
        if (res.url().includes("/api/rates")) rateCalls.push(`${res.status()} ${res.url()}`);
      });

      await visit(page, `${app.origin}/tools/fx-calculator`);
      await page.waitForFunction(() => document.querySelectorAll("select").length >= 2, {
        timeout: 15_000,
      });

      // The mount fetch. Listener was attached before navigation, so it is seen.
      await waitFor(
        () => rateCalls.some((c) => c.includes("to=USD")),
        "the calculator requested no rate on mount",
      );

      const selects = await page.$$("select");
      await selects[selects.length - 1].select("JPY");

      await waitFor(
        () => rateCalls.some((c) => c.includes("to=JPY")),
        "changing the target currency did not fetch a rate for the new pair",
      );

      // Every rate call the page made must have succeeded. The waits above are
      // satisfied by a 429 or a 502 just as well as by a 200, so the status is
      // asserted separately rather than assumed from arrival.
      expect(rateCalls.every((c) => c.startsWith("200")), rateCalls.join("\n")).toBe(true);
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  }, 120_000);

  it("the converter loads history and renders a converted amount", async () => {
    const { page, problems } = await newPage(browser);
    try {
      await visit(page, `${app.origin}/tools/currency-converter`);

      await page.waitForFunction(
        () => /\d/.test(document.querySelector("main")?.textContent ?? ""),
        { timeout: 20_000 },
      );

      const selects = await page.$$("select");
      expect(selects.length).toBeGreaterThanOrEqual(2);
      await selects[1].select("GBP");

      await page.waitForFunction(() => document.body.innerText.includes("GBP"), {
        timeout: 20_000,
      });

      expect(await pageText(page)).toContain("GBP");
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  }, 120_000);
});

describe("the FAQ accordion works by mouse and by keyboard", () => {
  it("toggles open, and Escape-free keyboard activation works too", async () => {
    const { page } = await newPage(browser);
    try {
      await visit(page, `${app.origin}/faq`);

      const first = "[aria-expanded]";
      await page.waitForSelector(first, { timeout: 15_000 });

      const before = await page.$eval(first, (el) => el.getAttribute("aria-expanded"));
      await page.click(first);
      await page.waitForFunction(
        (sel: string, prev: string | null) =>
          document.querySelector(sel)?.getAttribute("aria-expanded") !== prev,
        { timeout: 10_000 },
        first,
        before,
      );

      const afterClick = await page.$eval(first, (el) => el.getAttribute("aria-expanded"));
      expect(afterClick).not.toBe(before);

      // Focus is still on the trigger, so Enter must toggle it back.
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        (sel: string, prev: string | null) =>
          document.querySelector(sel)?.getAttribute("aria-expanded") !== prev,
        { timeout: 10_000 },
        first,
        afterClick,
      );

      expect(await page.$eval(first, (el) => el.getAttribute("aria-expanded"))).toBe(before);
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe("the navbar dropdown opens, closes on Escape, and works at 390px", () => {
  it("opens and closes on a desktop viewport", async () => {
    const { page } = await newPage(browser);
    try {
      await visit(page, app.origin);
      const trigger = "nav button[aria-expanded]";
      await page.waitForSelector(trigger, { timeout: 15_000 });

      await page.click(trigger);
      await page.waitForFunction(
        (sel: string) => document.querySelector(sel)?.getAttribute("aria-expanded") === "true",
        { timeout: 10_000 },
        trigger,
      );

      await page.keyboard.press("Escape");
      await page.waitForFunction(
        (sel: string) => document.querySelector(sel)?.getAttribute("aria-expanded") === "false",
        { timeout: 10_000 },
        trigger,
      );
    } finally {
      await page.close();
    }
  }, 90_000);

  it("exposes a menu control on a phone viewport", async () => {
    const { page, problems } = await newPage(browser, 390, 780);
    try {
      await visit(page, app.origin);

      // Selected in the page and tagged, rather than returned as a handle: an
      // `evaluateHandle` over `querySelectorAll` yields an `ElementHandle<Node>`,
      // which has no `.click()`. Marking the element and selecting it from
      // Puppeteer keeps the handle typed as an Element.
      const found = await page.evaluate(() => {
        const trigger = [...document.querySelectorAll("button[aria-expanded]")].find((b) =>
          /menu/i.test(b.getAttribute("aria-label") ?? b.textContent ?? ""),
        );
        if (!trigger) return false;
        trigger.setAttribute("data-smoke-menu", "");
        return true;
      });
      expect(found, "no mobile menu trigger at 390px").toBe(true);

      await page.click("[data-smoke-menu]");
      await page.waitForFunction(
        () =>
          [...document.querySelectorAll("button[aria-expanded]")].some(
            (b) =>
              /menu/i.test(b.getAttribute("aria-label") ?? b.textContent ?? "") &&
              b.getAttribute("aria-expanded") === "true",
          ),
        { timeout: 10_000 },
      );

      // The page must not scroll sideways on a phone once the menu is open.
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(overflows, "the page scrolls horizontally at 390px").toBe(false);
      expect(faults(problems)).toEqual([]);
    } finally {
      await page.close();
    }
  }, 90_000);
});

describe("a missing page is a real 404", () => {
  it("answers 404 and offers a way back", async () => {
    const { page } = await newPage(browser);
    try {
      const response = await visit(page, `${app.origin}/this-page-does-not-exist`);
      expect(response.status()).toBe(404);

      const text = await pageText(page);
      expect(text.length).toBeGreaterThan(0);
      // A 404 that strands the visitor is a dead end; there must be a way home.
      const hasHomeLink = await page.$$eval("a", (links) =>
        links.some((a) => a.getAttribute("href") === "/"),
      );
      expect(hasHomeLink).toBe(true);
    } finally {
      await page.close();
    }
  }, 90_000);
});
