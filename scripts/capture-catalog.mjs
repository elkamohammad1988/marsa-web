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
 * Nine frames, each chosen because it answers a question a buyer is actually
 * asking:
 *
 *   01-hero                is the design any good
 *   02-interactive-demo    is it a real interface or a picture of one
 *   03-currency-converter  does it handle live data
 *   04-iban-checker        does it handle correctness
 *   05-operator-dashboard  is there an application behind the marketing site
 *   06-get-started         what happens when I press the button
 *   07-about-engineering   who built it and how do they work
 *   08-mobile              does it hold up at 390px
 *   09-contact             do they think about the honest edge cases
 *
 * Frame 05 is the one that had to be added rather than chosen. The listing
 * sells authentication, a permission model and an operator dashboard as
 * headline deliverables, and the set without it showed a marketing site and a
 * sandbox — six of eight frames were public pages. A gallery is skimmed in ten
 * seconds and it was arguing for a different, smaller job than the one being
 * offered. It is photographed from `ADMIN_ORIGIN`, not from the deployment;
 * see that constant for why, and say so in the listing.
 *
 * `/admin` itself — the submissions table — is deliberately never captured, on
 * either origin. It renders whatever the contact form has collected, which on
 * any machine that has used it means a real name and a real email address in
 * an image intended for a public listing. The funnel view carries the same
 * evidence and is anonymous by construction.
 *
 * Three guards run before any file is written, the first two borrowed from
 * `capture.mjs` for the same reasons it has them: `requireDisclosure` refuses
 * to photograph a page that is not carrying the concept-build marker, because
 * a listing image is the one place this product is ever seen with no site
 * around it; `requireLiveRate` refuses to photograph a rate panel that has not
 * got its rate, because a spinner in a portfolio image reads as a broken
 * build; and `requireCoherentFunnel` refuses to photograph a funnel whose
 * steps climb, because scratch analytics data produces a `116.7%` row that is
 * arithmetically correct and reads as a broken dashboard.
 *
 * Usage:
 *   npm run capture:catalog
 *   CATALOG_ORIGIN=http://localhost:3100 npm run capture:catalog   # to rehearse
 */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ORIGIN = process.env.CATALOG_ORIGIN ?? "https://marsa-web.vercel.app";
const OUT = resolve("upwork-catalog");

/**
 * Where the one frame behind a password is photographed, and why it is not
 * `ORIGIN`.
 *
 * The deployed build holds no credentials at all — that is the deliberate
 * choice §0 of the listing describes — so `/admin` there is a closed door and
 * the operator dashboard cannot be photographed from it. Pointing the whole
 * set at a local build instead would be the other way to solve it, and it
 * would cost the thing the default origin exists to buy: eight frames a buyer
 * can reproduce by visiting the URL in the listing.
 *
 * So the split is explicit. Eight public frames come from the deployment; the
 * ninth comes from a local production build of the same commit, and the
 * listing says so rather than leaving it to be assumed. `capture.mjs` already
 * sets that precedent for `05-analytics.png` and for the same reason.
 *
 * Unreachable, or no password to hand, and the frame is skipped with the
 * reason named — never written as a picture of a login box.
 */
const ADMIN_ORIGIN = process.env.CATALOG_ADMIN_ORIGIN ?? "http://localhost:3100";

/** Read ADMIN_PASSWORD from the environment, falling back to .env.local. */
function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  try {
    const env = readFileSync(resolve(".env.local"), "utf8");
    const line = env.split(/\r?\n/).find((l) => l.startsWith("ADMIN_PASSWORD="));
    return line ? line.slice("ADMIN_PASSWORD=".length).trim() : null;
  } catch {
    return null;
  }
}

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

/**
 * 390px wide — the width is the claim being made, and it is a real one.
 *
 * The height is 1070 rather than a handset's 844 for the same measured reason
 * `DESKTOP_TALL` exists. In the state this frame photographs — the demo driven
 * to a funded, converted account — the sandbox banner runs 426-516px, the
 * account card 562-917px and the convert panel 941-1380px. The banner has to
 * be in frame, because a still of this product that loses *"sample data, no
 * real money"* is the one frame this set must not contain; that pins the top
 * edge at 336px. 336 + 844 lands at 1180px, which is the middle of the convert
 * panel, so a handset-height frame ends on a sliced button no matter where it
 * is scrolled. At 1070 the bottom edge lands at 1406px — past the panel, short
 * of the next section at 1460px — and nothing is cut at either edge.
 */
const MOBILE = { width: 390, height: 1070, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

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

/**
 * Refuse to photograph a funnel whose steps climb.
 *
 * A funnel is a monotonic claim: nobody reaches step four without passing step
 * three, so every row must be less than or equal to the row above it. Analytics
 * gathered from scratch runs break that — a session whose `start` beacon never
 * arrived while its later steps did produces `Verified (KYC) · 116.7%`. The
 * arithmetic is right and the input is legitimately skewed, which is exactly
 * why the dashboard is allowed to render it: the bar is clamped and the label
 * still prints the true figure, so an operator sees that the data is odd.
 *
 * A listing image is not an operator. It has no context, no next page and no
 * way to ask, so the same honest row reads as a product that cannot count.
 * Capture against a database with coherent traffic instead — never by editing
 * the data until it flatters the picture.
 */
async function requireCoherentFunnel(page) {
  const rows = await page.evaluate(() =>
    (document.body.innerText || "")
      .split("\n")
      .map((line) => line.match(/(\d+)\s*·\s*(\d+(?:\.\d+)?)%/))
      .filter(Boolean)
      .map((m) => ({ line: m[0], count: Number(m[1]), pct: Number(m[2]) })),
  );
  if (rows.length < 2) throw new Error("no funnel rows found — refusing to write the frame");

  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].pct > rows[i - 1].pct + 0.05) {
      throw new Error(
        `funnel step "${rows[i].line}" is above the step before it (${rows[i - 1].line}). ` +
          "That is scratch data, not a defect — capture against a database with coherent " +
          "demo traffic rather than hand-editing the store.",
      );
    }
  }
  console.log(`      funnel coherent: ${rows.length} steps, ${rows[0].count} → ${rows[rows.length - 1].count}`);
}

/**
 * Sign an operator in on `ADMIN_ORIGIN` and land on the funnel view.
 *
 * Returns null — with the reason logged — rather than throwing, for every way
 * this can legitimately be unavailable: no password to hand, the origin not
 * running, or the origin running without credentials so the login form is not
 * even rendered. None of those is a defect in the build, and none of them may
 * produce a photograph of a login box captioned "operator dashboard".
 */
async function signInToAdmin(page, password) {
  await page.setViewport(DESKTOP);
  try {
    await page.goto(`${ADMIN_ORIGIN}/admin/login`, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
  } catch {
    return `${ADMIN_ORIGIN} is not answering — start a production build there first`;
  }

  const hasForm = await page.$("input[name='password']");
  if (!hasForm) return `${ADMIN_ORIGIN} runs without ADMIN_PASSWORD, so the operator area is closed there`;

  // Hydration first, and this is not belt-and-braces. The form is a client
  // component that posts and then routes; typing into it before React has
  // attached puts the characters in the DOM node and not in the state the
  // submit handler reads, so the request goes out empty and the run reports a
  // rejected password that was never actually sent. `domcontentloaded` above
  // is deliberate — waiting for hydration is what makes it safe.
  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true", {
    timeout: 30000,
    polling: 50,
  });

  /*
   * Watch the sign-in response, because the two ways this fails need different
   * sentences and the URL cannot tell them apart.
   *
   * `/api/admin/login` is rate limited to five attempts per minute, shared
   * across instances (see the note in `app/api/admin/login/route.ts`). A run
   * that follows a few manual sign-ins therefore gets a **429**, lands back on
   * `/admin/login` exactly as a wrong password would, and this function used to
   * report "the password was rejected" — which sends the next reader to check a
   * credential that was never wrong. Naming the real cause costs one listener.
   */
  let loginStatus = null;
  const watchLogin = (response) => {
    if (response.url().includes("/api/admin/login")) loginStatus = response.status();
  };
  page.on("response", watchLogin);

  await page.type("input[name='password']", password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
    page.click("button[type='submit']"),
  ]);
  await new Promise((r) => setTimeout(r, 1200));

  await page.goto(`${ADMIN_ORIGIN}/admin/funnel`, {
    waitUntil: "networkidle2",
    timeout: 30000,
  });
  page.off("response", watchLogin);

  if (page.url().includes("/admin/login")) {
    if (loginStatus === 429) {
      return "sign-in was rate limited (5/min) — wait a minute and re-run; the password is fine";
    }
    return loginStatus === null
      ? "the sign-in request never completed"
      : `the password was rejected (HTTP ${loginStatus})`;
  }

  await page.waitForFunction(() => document.documentElement.dataset.hydrated === "true", {
    timeout: 30000,
    polling: 50,
  });
  await settle(page);
  return null;
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
    (sel, off, fallbackBand) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const viewport = window.innerHeight;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
      const target = Math.min(
        maxScroll,
        Math.max(0, el.getBoundingClientRect().top + window.scrollY - off),
      );
      window.scrollTo({ top: target, behavior: "instant" });

      // The navigation is a floating pill and it is not the same height in
      // every frame — 1440px gets the full bar, 390px gets a short one. So the
      // band it covers is measured here rather than taken from the caller: the
      // desktop figure applied to a mobile frame reports the sandbox banner as
      // hidden when it is sitting plainly in the clear, and a guard that cries
      // wolf is one that gets ignored the day it is right.
      let band = 0;
      for (const node of document.querySelectorAll("header, nav")) {
        const position = getComputedStyle(node).position;
        if (position !== "fixed" && position !== "sticky") continue;
        const rect = node.getBoundingClientRect();
        if (rect.height > 0 && rect.top < 200) band = Math.max(band, rect.bottom + 8);
      }
      const navBand = band || fallbackBand;

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

/**
 * Shrink the frame so its bottom edge lands on the main/footer seam.
 *
 * `/get-started` and `/contact` are each one section shorter than the 900px
 * frame: `main` ends at 796px and 716px. At scroll zero the default viewport
 * therefore photographs 104px and 184px of *footer* under the subject of the
 * shot — a wordmark cut through the middle and half a newsletter input. No
 * scroll position fixes it, because the subject starts at the top of the page
 * and there is nothing above it to give back. The frame is the wrong height,
 * so the frame is what changes.
 *
 * The seam is measured at capture time rather than written down here, because
 * it is a property of the page and this file should not become the second
 * place that number lives.
 */
async function fitToMain(page, viewport, { pad = 6, min = 560, max = 1100 } = {}) {
  const seam = await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return null;
    return Math.round(main.getBoundingClientRect().bottom + window.scrollY);
  });
  if (seam == null) throw new Error("no <main> to measure the frame against");
  const height = Math.max(min, Math.min(max, seam + pad));
  await page.setViewport({ ...viewport, height });
  await settle(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 350));
  console.log(`      frame trimmed to ${viewport.width}x${height} — main ends at ${seam}px`);
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
/**
 * Every frame written, with the URL it was actually photographed from.
 *
 * This exists because the images carry no provenance of their own. `sharp`
 * re-encodes each PNG and drops metadata, so a finished file is a grid of
 * pixels and nothing else — and the one question that matters about this set,
 * *"did frame 01 come from the deployed site or from somebody's laptop?"*, was
 * answerable only by trusting whoever ran the command. Two pages rendered from
 * the same commit are pixel-identical whether they were served from Vercel or
 * from `next start`, so comparing images cannot settle it either.
 *
 * `page.url()` is read at the moment of capture rather than reconstructed from
 * `ORIGIN`, so a redirect, a typo in `CATALOG_ORIGIN` or a frame that silently
 * landed on `/admin/login` shows up in the record as the URL it really was.
 */
const captured = [];

async function shot(page, name) {
  await requireDisclosure(page);
  const raw = await page.screenshot({ type: "png" });
  const out = resolve(OUT, `${name}.png`);
  const optimised = await sharp(raw).png({ compressionLevel: 9, effort: 10 }).toBuffer();
  const best = optimised.length < raw.length ? optimised : raw;
  writeFileSync(out, best);
  const meta = await sharp(best).metadata();
  captured.push({
    file: `${name}.png`,
    sourceUrl: page.url(),
    width: meta.width,
    height: meta.height,
    bytes: best.length,
    sha256: createHash("sha256").update(best).digest("hex"),
  });
  console.log(
    `  ok  ${name}.png  ${meta.width}x${meta.height}  ${(best.length / 1048576).toFixed(2)} MB`,
  );
}

/**
 * Write the record next to the images, and say plainly which frames are not
 * from the deployed origin.
 *
 * Frame 05 is the operator dashboard, which the credential-free deployment
 * cannot serve, so it is photographed from `ADMIN_ORIGIN` — that is a genuine
 * limitation of the set and belongs in the record rather than in a caveat
 * somebody has to remember. `verify` is the command that re-checks the hashes,
 * so the record is falsifiable rather than merely asserted.
 */
function writeProvenance() {
  const record = {
    capturedAt: new Date().toISOString(),
    origin: ORIGIN,
    adminOrigin: ADMIN_ORIGIN,
    note:
      "sourceUrl is page.url() at the moment of capture. Frames served from " +
      "adminOrigin are not from the public deployment; see 05-operator-dashboard.",
    verify: "node -e \"const{createHash}=require('crypto'),fs=require('fs');" +
      "for(const f of require('./upwork-catalog/provenance.json').frames)" +
      "console.log(f.file, createHash('sha256').update(fs.readFileSync('upwork-catalog/'+f.file))" +
      ".digest('hex')===f.sha256?'ok':'CHANGED', f.sourceUrl)\"",
    frames: captured,
  };
  writeFileSync(resolve(OUT, "provenance.json"), `${JSON.stringify(record, null, 2)}
`);

  const offOrigin = captured.filter((f) => !f.sourceUrl.startsWith(ORIGIN));
  console.log(`
  provenance.json written — ${captured.length} frames from ${ORIGIN}`);
  for (const f of offOrigin) console.log(`  ! ${f.file} came from ${f.sourceUrl}`);
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

    console.log("05 operator dashboard");
    const password = adminPassword();
    if (!password) {
      console.warn("  ! ADMIN_PASSWORD not set — skipping 05-operator-dashboard");
    } else {
      const unavailable = await signInToAdmin(page, password);
      if (unavailable) {
        console.warn(`  ! skipping 05-operator-dashboard — ${unavailable}`);
      } else {
        await requireCoherentFunnel(page);
        await atTop(page);
        await shot(page, "05-operator-dashboard");
      }
    }

    console.log("06 get started");
    await goto(page, "/get-started");
    await fitToMain(page, DESKTOP);
    await shot(page, "06-get-started");

    console.log("07 about / engineering");
    await goto(page, "/company/about", DESKTOP_TALL);
    // The headline, the reasoning under it, and the four figures — each
    // computed from the module that implements it — with the caption saying
    // so. Scroll zero, because the band ends at 993px and the next heading
    // starts at 1153px: anything lower puts the display `<h1>` behind the
    // navbar, which is the one thing a still cannot explain away.
    await atTop(page);
    await shot(page, "07-about-engineering");

    console.log("08 mobile");
    await goto(page, "/demo", MOBILE);
    await advance(page, 4);
    await clickLabel(page, /receive \$/);
    await advance(page, 1);
    await clickLabel(page, /convert \$/, 2000);
    await settle(page);
    // The sandbox banner is the anchor for the *top of the composition*, which
    // the progress rail is not: anchoring on the rail is what put "Interactive
    // sandbox" half behind the navigation, and a frame that loses the sandbox
    // label is the one frame this set must not contain.
    //
    // Found by `data-sandbox-notice`, not by `.glass-panel`. That class was the
    // frosted-surface utility, and the design pass that removed the effect
    // layer took it with everything else — so this line threw
    // `nothing matched .glass-panel` and killed the run at frame 08.
    // `scripts/record-demo.mjs` had already hit exactly this and had already
    // been moved onto the attribute hook; this call site was missed. The rule
    // it encodes is the one written beside the banner in `DemoFlow.tsx`: a
    // capture script should name the thing, not the paint on it.
    await frameOn(page, "[data-sandbox-notice]", MOBILE_BANNER_GAP);
    await shot(page, "08-mobile");

    console.log("09 contact");
    await goto(page, "/contact");
    await fitToMain(page, DESKTOP);
    await shot(page, "09-contact");

    writeProvenance();
    console.log("\nDone.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
