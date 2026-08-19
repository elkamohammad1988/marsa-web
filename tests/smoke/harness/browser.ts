import { existsSync } from "node:fs";
import puppeteer, { type Browser, type Page, type HTTPResponse } from "puppeteer-core";

/**
 * Browser plumbing for the smoke suite.
 *
 * Two rules run through everything here, and both exist because the previous
 * attempt to drive this site produced false failures rather than findings:
 *
 * **Never sleep.** Every wait is for a condition — a selector, a response, a
 * predicate — with a budget. `setTimeout` as a synchronisation primitive is
 * what makes a browser suite flaky on a loaded CI runner, and a suite that goes
 * red when the machine is busy teaches everyone to re-run it until green, which
 * is worse than not having it.
 *
 * **Never a development server.** `next dev` compiles a route on first request;
 * on this project that is seconds per page, which is slower than a client
 * component takes to hydrate under any reasonable wait. Against `next dev` the
 * FX calculator appeared to make no API call at all and forms appeared to
 * submit natively. Every one of those was the page not having hydrated. The
 * harness starts `next start` against a real production build for that reason.
 */

/** Where a Chrome or Chromium binary lives, by platform. */
const CANDIDATES = [
  // Linux — GitHub's ubuntu runners ship Google Chrome stable.
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
  // macOS
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  // Windows
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
];

/**
 * The browser binary to drive.
 *
 * Throws rather than skipping. A smoke suite that quietly reports success
 * because it could not find a browser is the exact failure mode this whole
 * exercise exists to remove — the previous pass shipped green gates over a
 * keyboard-inaccessible control and a page that crashed for its only user.
 * `CHROME_PATH` is the escape hatch for an unusual install.
 */
export function chromePath(): string {
  const configured = process.env.CHROME_PATH?.trim();
  if (configured) {
    if (!existsSync(configured)) {
      throw new Error(`CHROME_PATH is set to ${configured}, which does not exist.`);
    }
    return configured;
  }

  const found = CANDIDATES.find((p) => existsSync(p));
  if (found) return found;

  throw new Error(
    "No Chrome or Chromium binary found for the smoke suite. Install Google " +
      "Chrome, or set CHROME_PATH to the executable. Looked in:\n  " +
      CANDIDATES.join("\n  "),
  );
}

export async function launchBrowser(): Promise<Browser> {
  return puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    // `--no-sandbox` is required in most CI containers and is safe here: the
    // browser only ever loads pages this suite serves from localhost.
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
  });
}

/** Everything a page did wrong, collected from the moment it was created. */
export type PageProblems = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
};

export type Instrumented = { page: Page; problems: PageProblems };

/**
 * A page that records its own failures.
 *
 * Listeners are attached *before* any navigation, which was a real defect in
 * the ad-hoc scripts this replaces: attaching afterwards misses every fetch a
 * component makes on mount, and the resulting "makes no API call" reading sent
 * an earlier pass chasing a bug that did not exist.
 */
export async function newPage(browser: Browser, width = 1280, height = 900): Promise<Instrumented> {
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  const problems: PageProblems = { consoleErrors: [], pageErrors: [], failedRequests: [] };

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    // A 404 route legitimately logs a failed load for its own document; that is
    // the page under test behaving correctly, not a defect in it.
    if (/status of 404/.test(text)) return;
    problems.consoleErrors.push(text.slice(0, 300));
  });

  page.on("pageerror", (error) => problems.pageErrors.push(String(error).slice(0, 300)));

  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown";
    // Next.js cancels in-flight RSC prefetches on navigation as a matter of
    // course, and Chrome reports the cancellation as a failed request. Counting
    // those would make every page with a `<Link>` permanently red.
    if (reason === "net::ERR_ABORTED") return;
    problems.failedRequests.push(`${reason} ${request.url()}`);
  });

  return { page, problems };
}

/** Assertable summary: empty means the page did nothing wrong. */
export function faults(problems: PageProblems): string[] {
  return [
    ...problems.pageErrors.map((e) => `pageerror: ${e}`),
    ...problems.consoleErrors.map((e) => `console: ${e}`),
    ...problems.failedRequests.map((e) => `request: ${e}`),
  ];
}

/**
 * Navigate and wait for the page to be *interactive*, not merely parsed.
 *
 * `domcontentloaded` returns before React has hydrated, and a click dispatched
 * then lands on markup with no handler attached — which looks exactly like a
 * dead button. `networkidle0` is the opposite problem: it never settles on a
 * page that polls. So this waits for the document, then for hydration to have
 * actually happened, observed rather than assumed.
 */
export async function visit(page: Page, url: string): Promise<HTTPResponse> {
  const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  if (!response) throw new Error(`No response for ${url}`);
  await waitForHydration(page);
  return response;
}

/**
 * Resolve once React has taken over the document.
 *
 * Waits for `<html data-hydrated="true">`, which `components/layout/
 * HydrationSignal.tsx` sets from an effect in the root layout. The attribute
 * appears exactly when the client bundle has run and handlers are attached,
 * which is the property every interaction test below depends on.
 *
 * ── Why an attribute the application sets, and not a React internal ────────
 * The previous implementation read React's private `__reactContainer$…` key
 * off `document.body`. That was wrong in two ways at once, and it made the
 * whole suite useless rather than flaky: Next.js App Router hydrates the
 * **document**, so React puts `__reactContainer$…` on `document` and leaves
 * only `__reactFiber$…`/`__reactProps$…` on the body. The predicate could
 * never become true, so all fifty tests spent thirty seconds each timing out
 * and the run reported forty-odd failures that said nothing about the site.
 *
 * Guessing at a private key *and* at which node owns it is two bets on an
 * implementation detail. An attribute the application publishes is neither: it
 * is ours, it means one thing, and it survives React changing its internals.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.documentElement.dataset.hydrated === "true",
    { timeout: 30_000, polling: 50 },
  );
}

/**
 * Click, then wait for the navigation it causes to finish.
 *
 * The pair is started together and awaited together: starting the wait after
 * the click loses the race on a fast local server, which is the classic
 * intermittent failure in a browser suite.
 */
export async function clickAndNavigate(page: Page, selector: string): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }),
    page.click(selector),
  ]);
  await waitForHydration(page);
}

/**
 * Poll a condition held in *this* process, the way `page.waitForFunction`
 * polls one held in the page.
 *
 * Some facts a browser test needs are only knowable outside the page — what
 * Chrome actually put on the wire, for instance, which the page cannot see
 * once a response comes from a cache. Those need the same treatment as every
 * other wait here: a condition and a budget, never a sleep. The failure
 * message is required rather than optional because a timeout whose only text
 * is "waitFor timed out" is the sentence this harness exists to stop printing.
 */
export async function waitFor(
  condition: () => boolean,
  message: string,
  { timeout = 20_000, polling = 50 }: { timeout?: number; polling?: number } = {},
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, polling));
  }
  throw new Error(`${message} (waited ${timeout}ms)`);
}

/** Text of the whole page, whitespace-collapsed, for readable assertions. */
export async function pageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, " ").trim());
}
