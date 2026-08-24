#!/usr/bin/env node
/**
 * Capture the Upwork Project Catalog image set, from the deployed site.
 *
 * This is a sibling of `scripts/capture.mjs`, not a replacement for it. That
 * one photographs the seven images the README embeds and is pointed at a local
 * production build, because two of its frames — the operator dashboard among
 * them — need credentials the published deployment deliberately does not have.
 * This one photographs a different set for a different audience, and it is
 * pointed at **https://marsa-web.vercel.app** by default: a listing image that
 * cannot be reproduced by visiting the URL in the listing is worth nothing, so
 * the origin is the deliverable rather than a convenience.
 *
 * Eight frames, each chosen because it answers a question a buyer is actually
 * asking:
 *
 *   01-hero               is the design any good
 *   02-interactive-demo   is it a real interface or a picture of one
 *   03-currency-converter does it handle live data
 *   04-iban-checker       does it handle correctness
 *   05-get-started        what happens when I press the button
 *   06-about-engineering  who built it and how do they work
 *   07-mobile             does it hold up at 390px
 *   08-contact            do they think about the honest edge cases
 *
 * Two guards run before any file is written, both borrowed from `capture.mjs`
 * for the same reasons it has them: `requireDisclosure` refuses to photograph a
 * page that is not carrying the concept-build marker, because a listing image
 * is the one place this product is ever seen with no site around it; and
 * `requireLiveRate` refuses to photograph a rate panel that has not got its
 * rate, because a spinner in a portfolio image reads as a broken build.
 *
 * Usage:
 *   npm run capture:catalog
 *   CATALOG_ORIGIN=http://localhost:3100 npm run capture:catalog   # to rehearse
 */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ORIGIN = process.env.CATALOG_ORIGIN ?? "https://marsa-web.vercel.app";
const OUT = resolve("upwork-catalog");

/**
 * 1440x900 at 1.5x gives 2160x1350. Upwork asks for at least 1280 wide and
 * renders the gallery far smaller than that, so this is captured natively
 * above the requirement rather than upscaled into it.
 */
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1.5 };

/**
 * 100px taller, for the two pages whose subject does not fit in 900.
 *
 * Measured rather than guessed. On `/demo` the composition a buyer needs to
 * see — sandbox banner, progress rail, account card, step panel — runs from
 * 446px to 998px, and the next section's display heading starts at 1197px. At
 * a 900px viewport there is **no** scroll position that shows all of the first
 * and none of the second, so every frame either hides the sandbox label behind
 * the navbar or ends on a headline sliced through its second line. At 1000px
 * the whole thing sits in one frame at scroll zero with the next section
 * entirely out of it. `/company/about` has the same shape: its figures band
 * ends at 993px.
 *
 * The alternative was to shorten a panel or move a section, which is a change
 * to the product to flatter a screenshot. A gallery is allowed mixed aspect
 * ratios; the application is not allowed to be edited for a photograph.
 */
const DESKTOP_TALL = { width: 1440, height: 1000, deviceScaleFactor: 1.5 };

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

/** The floating navbar's height plus its margin — nothing meaningful may sit under it. */
const NAV_BAND = 104;

/**
 * The demo's sandbox banner sits above the progress rail, so the rail is the
 * wrong anchor for the composition: framing on it puts *"sample data, no real
 * money"* half behind the navigation. Its height plus margin is ~74px.
 */
const DEMO_BANNER = 74;

/**
 * Where the sandbox banner sits below the top of the mobile frame.
 *
 * Measured on the deployed site at 390px: the hero paragraph above it ends at
 * 334px, the banner starts at 438px, and the navigation pill is 76px tall. So
 * the top edge has to land in the 334-362px gap — high enough that the banner
 * clears the navigation, low enough that the paragraph is out of frame rather
 * than sliced. 90px puts it at 348, near the middle of that window.
 */
const MOBILE_BANNER_GAP = 90;

/* ------------------------------------------------------------------ *
 * Page handling
 * ------------------------------------------------------------------ */

/** Fonts loaded, every reveal forced visible, scroll returned to the top. */
async function settle(page) {
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y <= total; y += window.innerHeight) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    for (const el of document.querySelectorAll(".reveal")) {
      el.classList.add("is-visible");
      el.style.transition = "none";
    }
    if (document.fonts?.ready) await document.fonts.ready;
  });

  // Nothing may still be moving when the shutter opens. Animations that loop
  // forever — the rate ticker, the demo's progress rail — are excluded by
  // their iteration count rather than by name, because a list of exemptions
  // goes stale the first time somebody adds an animation.
  await page
    .waitForFunction(
      () =>
        document.getAnimations().every((a) => {
          const t = a.effect?.getComputedTiming();
          if (t && t.iterations === Infinity) return true;
          return a.playState === "finished" || a.playState === "idle";
        }),
      { timeout: 15000, polling: 100 },
    )
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Refuse to photograph a page that is not carrying the concept-build marker.
 *
 * `[data-disclosure]` is an attribute that exists to be found, so this cannot
 * drift when the badge is restyled — which is exactly how the equivalent guard
 * in `capture.mjs` broke once, by matching on class names.
 */
async function requireDisclosure(page) {
  const found = await page.evaluate(() => {
    const el = document.querySelector("[data-disclosure]");
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    return { text, width: rect.width, height: rect.height, top: rect.top };
  });
  if (!found) throw new Error("no [data-disclosure] on the page — refusing to write an unmarked image");
  if (!/concept build/i.test(found.text)) {
    throw new Error(`[data-disclosure] reads "${found.text}", which does not say "concept build"`);
  }
  if (found.width < 40 || found.height < 10) {
    throw new Error(`[data-disclosure] measures ${found.width}x${found.height} — not legibly in frame`);
  }
}

/** Refuse to photograph a rate panel that has not got its rate. */
async function requireLiveRate(page, where, budgetMs = 45000) {
  const deadline = Date.now() + budgetMs;
  let seen = "no rate rendered";
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const text = (document.body.innerText || "").replace(/\s+/g, " ").trim();
      return {
        loading: /Loading (live )?rate/i.test(text),
        failed: /rate unavailable/i.test(text),
        rate: /1 [A-Z]{3} = \d+\.\d+ [A-Z]{3}/.test(text),
      };
    });
    if (state.failed) {
      throw new Error(
        `The live rate failed on ${where}: the panel reads "Rate unavailable". The upstream is ` +
          "key-less and fair-use, so this is usually transient — re-run rather than ship the error state.",
      );
    }
    if (state.rate && !state.loading) return;
    seen = state.loading ? "still loading" : "no rate rendered";
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`The live rate never arrived on ${where} within ${budgetMs}ms (${seen}).`);
}

async function goto(page, path, viewport = DESKTOP) {
  await page.setViewport(viewport);
  await page.goto(`${ORIGIN}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true", {
    timeout: 45000,
    polling: 50,
  });
  await requireDisclosure(page);
  await settle(page);
}

/**
 * Scroll so `selector` sits `offset` px below the top of the frame, then check
 * the frame does not cut a line of text at either edge or hide one under the
 * navbar — and say so when it does, rather than writing the image quietly.
 *
 * A weaker version of `capture.mjs`'s search: this set is eight frames that get
 * looked at one by one before publishing, so a report is worth more than an
 * optimiser. What it must not do is stay silent.
 */
async function frameOn(page, selector, offset = NAV_BAND) {
  const report = await page.evaluate(
    (sel, off, navBand) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const viewport = window.innerHeight;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
      const target = Math.min(
        maxScroll,
        Math.max(0, el.getBoundingClientRect().top + window.scrollY - off),
      );
      window.scrollTo({ top: target, behavior: "instant" });

      const cuts = [];
      const SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,label,button,a,input";
      for (const node of document.querySelectorAll(SELECTOR)) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const heading = /^H[1-6]$/.test(node.tagName);
        if (!heading && rect.height > 240) continue;
        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.opacity === "0") continue;
        // Anything that travels with the viewport is drawn at the same place
        // whatever the scroll, so it can neither be cut by an edge nor hidden
        // behind the bar it *is*.
        let floating = false;
        for (let n = node; n; n = n.parentElement) {
          const p = getComputedStyle(n).position;
          if (p === "fixed" || p === "sticky") { floating = true; break; }
        }
        if (floating) continue;
        const label = (node.textContent ?? "").trim().slice(0, 34) || node.tagName;
        if (rect.top < 0 && rect.bottom > 0) cuts.push(`top edge cuts "${label}"`);
        if (rect.top < viewport && rect.bottom > viewport) cuts.push(`bottom edge cuts "${label}"`);
        if (rect.top < navBand && rect.bottom > 0) cuts.push(`navbar covers "${label}"`);
      }
      return { scroll: Math.round(target), cuts: [...new Set(cuts)] };
    },
    selector,
    offset,
    NAV_BAND,
  );
  if (!report) throw new Error(`nothing matched ${selector}`);
  if (report.cuts.length) {
    console.log(`      framing notes @${report.scroll}px: ${report.cuts.slice(0, 4).join(" · ")}`);
  }
  await new Promise((r) => setTimeout(r, 450));
}

/** Frame a page at its own top — for the shots whose subject starts there. */
async function atTop(page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 400));
}

/** Drive the demo's primary forward control, waiting for it to become enabled. */
async function advance(page, times) {
  for (let i = 0; i < times; i += 1) {
    const deadline = Date.now() + 25000;
    let clicked = false;
    while (Date.now() < deadline && !clicked) {
      clicked = await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll("button")).find((b) =>
          /^(start the demo|continue)$/i.test((b.textContent ?? "").trim()),
        );
        if (!next || next.disabled) return false;
        next.click();
        return true;
      });
      if (!clicked) await new Promise((r) => setTimeout(r, 300));
    }
    if (!clicked) throw new Error(`demo: advance ${i + 1} never became available`);
    await new Promise((r) => setTimeout(r, 600));
  }
}

async function clickLabel(page, re, waitMs = 1600) {
  const deadline = Date.now() + 30000;
  let clicked = false;
  while (Date.now() < deadline && !clicked) {
    clicked = await page.evaluate((source) => {
      const rx = new RegExp(source, "i");
      const button = Array.from(document.querySelectorAll("button")).find(
        (b) => rx.test((b.textContent ?? "").trim()) && !b.disabled,
      );
      if (!button) return false;
      button.click();
      return true;
    }, re.source);
    if (!clicked) await new Promise((r) => setTimeout(r, 400));
  }
  if (!clicked) throw new Error(`no enabled button matching ${re}`);
  await new Promise((r) => setTimeout(r, waitMs));
}

/** Type into a field the way a person would, so React sees every keystroke. */
async function typeInto(page, selector, value) {
  await page.click(selector);
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, selector);
  await page.type(selector, value, { delay: 22 });
}

/**
 * Write the shot, then re-encode it losslessly.
 *
 * Chrome's PNG encoder optimises for speed and these frames are large smooth
 * gradients, which is its worst case. `sharp` gives identical pixels at roughly
 * two thirds of the bytes, and it is already a dependency.
 */
async function shot(page, name) {
  await requireDisclosure(page);
  const raw = await page.screenshot({ type: "png" });
  const out = resolve(OUT, `${name}.png`);
  const optimised = await sharp(raw).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const best = optimised.length < raw.length ? optimised : raw;
  writeFileSync(out, best);
  const meta = await sharp(best).metadata();
  console.log(
    `  ok  ${name}.png  ${meta.width}x${meta.height}  ${(best.length / 1048576).toFixed(2)} MB`,
  );
}

/* ------------------------------------------------------------------ *
 * The set
 * ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  console.log(`Capturing the catalog set from ${ORIGIN}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--force-color-profile=srgb", "--hide-scrollbars", "--font-render-hinting=none"],
  });
  const page = await browser.newPage();

  try {
    console.log("01 hero");
    await goto(page, "/");
    await shot(page, "01-hero");

    console.log("02 interactive demo");
    await goto(page, "/demo", DESKTOP_TALL);
    // welcome → profile → identity → account → receive, then take the payout
    // and convert it: the account card is only worth photographing once it has
    // money in it and an activity row to show for it.
    await advance(page, 4);
    await clickLabel(page, /receive \$/);
    await advance(page, 1);
    await clickLabel(page, /convert \$/, 2000);
    await settle(page);
    await atTop(page);
    await shot(page, "02-interactive-demo");

    console.log("03 currency converter");
    await goto(page, "/tools/currency-converter");
    await requireLiveRate(page, "/tools/currency-converter");
    await settle(page);
    await frameOn(page, "#fx-amount", 300);
    await shot(page, "03-currency-converter");

    console.log("04 IBAN checker");
    await goto(page, "/tools/iban-checker");
    await typeInto(page, "#iban-input", "DE89 3704 0044 0532 0130 00");
    await clickLabel(page, /check iban/, 1100);
    await settle(page);
    await shot(page, "04-iban-checker");

    console.log("05 get started");
    await goto(page, "/get-started");
    await shot(page, "05-get-started");

    console.log("06 about / engineering");
    await goto(page, "/company/about", DESKTOP_TALL);
    // The headline, the reasoning under it, and the four figures — each
    // computed from the module that implements it — with the caption saying
    // so. Scroll zero, because the band ends at 993px and the next heading
    // starts at 1153px: anything lower puts the display `<h1>` behind the
    // navbar, which is the one thing a still cannot explain away.
    await atTop(page);
    await shot(page, "06-about-engineering");

    console.log("07 mobile");
    await goto(page, "/demo", MOBILE);
    await advance(page, 4);
    await clickLabel(page, /receive \$/);
    await advance(page, 1);
    await clickLabel(page, /convert \$/, 2000);
    await settle(page);
    // `.glass-panel` is the sandbox banner and, on this route, is the only
    // element carrying that class — so it is a stable anchor for the *top of
    // the composition*, which the progress rail is not. Anchoring on the rail
    // is what put "Interactive sandbox" half behind the navigation, and a
    // frame that loses the sandbox label is the one frame this set must not
    // contain.
    await frameOn(page, ".glass-panel", MOBILE_BANNER_GAP);
    await shot(page, "07-mobile");

    console.log("08 contact");
    await goto(page, "/contact");
    await shot(page, "08-contact");

    console.log("\nDone.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
