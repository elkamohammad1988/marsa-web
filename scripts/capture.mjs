#!/usr/bin/env node
/**
 * Capture the eight portfolio screenshots, reproducibly.
 *
 * The previous version of this file swept every marketing route and wrote one
 * PNG per `<section>`, which produced 118 images across ten directories. That
 * is a contact sheet, not a portfolio: nobody looks at 118 screenshots, and the
 * whole set went stale the moment the brand changed — every filename still
 * carried the pre-rebrand name. Two further faults meant it had not run in a
 * long time and could not have run safely if it had:
 *
 *   - it imported `puppeteer-core`, which was neither declared nor installed;
 *   - it began by `rmSync`-ing the output directory, which would have deleted
 *     the four tracked images the README embeds.
 *
 * This version captures a fixed set of seven, chosen to tell the product story
 * in order, and each one is a surface that actually exists in this repository:
 *
 *   01-hero              the landing page, above the fold
 *   02-live-rates        the converter running on live ECB reference rates
 *   03-feature-account   the demo at the point an account and IBAN exist
 *   04-feature-convert   the demo converting at the live ECB rate
 *   05-analytics         /admin/funnel — the demo funnel behind a password
 *   06-iban-validation   /tools/iban-checker — ISO 13616 / MOD-97, offline
 *   07-mobile            the demo, mid-flow, at 390px
 *
 * There is no AI screenshot because there is no AI in this product, and no
 * team/billing screenshot because there is no billing. Inventing either would
 * be the exact failure this repository's honesty programme exists to prevent.
 *
 * Two used to be here and are not.
 *
 * `08-pricing` photographed the concept product's own subscription tiers. The
 * page is built to the same bar as everything else, which is the argument that
 * kept it, and it is not what the image says to someone deciding whether to
 * hire a developer: it says €4.99 a month for a financial product. The caption
 * defending it had grown longer than the caption describing it.
 *
 * `07-mobile` used to be the landing page at 390px — the same hero as `01`,
 * narrower. It proved the breakpoint and nothing else. A portfolio image has to
 * earn its slot with information the previous one did not carry, so it is now
 * the demo mid-flow, which is the claim worth making on mobile: not that the
 * layout reflows, but that the whole interaction works down there.
 *
 * `/admin` itself is deliberately not captured. It is a real dashboard and it
 * looks like one, but it renders live form submissions — which on any machine
 * that has used the contact form means a real name and a real email address in
 * an image intended for a public listing. A portfolio shot is not worth
 * publishing someone's inbox. The funnel view carries the same "there is an
 * authenticated operator area" message and is anonymous by construction.
 *
 * It writes only those eight names and deletes nothing, so the tracked images
 * are safe and a partial run leaves the previous set intact.
 *
 * Usage:
 *   npm run build && npm start          # in one terminal
 *   npm run capture                     # in another
 *
 * /admin needs ADMIN_PASSWORD from the environment; without it the two admin
 * shots are skipped with a warning rather than silently written as a login box.
 */

import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = resolve("portfolio-screenshots");
const ORIGIN = process.env.CAPTURE_ORIGIN ?? "http://localhost:3000";

/**
 * Capture scale, chosen against what these images are actually displayed at.
 *
 * They were 2x desktop and 3x mobile, which produced a 2880 x 1800 hero at
 * 2.0 MB and a 1170 x 2532 mobile shot at 1.8 MB — 6.2 MB across the eight.
 * Both are dominated by the `bg-noise` overlay, whose whole job is
 * high-frequency dither, which is precisely what a lossless PNG cannot
 * compress. Re-encoding saved 9-28% on the flat frames and nothing at all on
 * those two.
 *
 * Nothing renders them at that size. GitHub lays a README image out at roughly
 * 880 CSS px and Upwork asks for at least 1280 wide. 1.5x desktop gives
 * 2160 x 1350 and 2x mobile gives 780 x 1688 — comfortably above both, and
 * captured natively rather than downscaled afterwards, so the text is drawn at
 * the output resolution instead of resampled into it.
 */
const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1.5 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

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
 * Settle a page before capture: fonts loaded, lazy content scrolled through,
 * scroll position returned to the top, and every `Reveal` forced visible.
 *
 * That last step matters. `Reveal` starts hidden and fades in on intersection,
 * so a screenshot taken a moment too early catches half-transparent sections.
 * Rather than sleeping and hoping, this adds the class the observer would have
 * added and disables the transition, which makes the output deterministic.
 */
async function settle(page) {
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y <= total; y += window.innerHeight) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    for (const el of document.querySelectorAll(".reveal")) {
      el.classList.add("is-visible");
      el.style.transition = "none";
    }
    if (document.fonts?.ready) await document.fonts.ready;
  });
  await new Promise((r) => setTimeout(r, 400));
}

/**
 * Keep the concept-build disclosure in frame, and refuse to capture without it.
 *
 * This function used to do the exact opposite. It injected
 * `.fixed.bottom-4.left-4 { display: none }`, on the argument that the badge is
 * the same chrome in all eight frames and the disclosure belongs on the site
 * where a visitor can act on it. That reasoning is right about a screenshot read
 * *on the site* and backwards for these eight, because a portfolio image is the
 * one place this product is ever seen with no site around it — no navigation, no
 * footer, no badge to open, no `/demo` banner, none of the honesty programme
 * this repository is otherwise built on.
 *
 * What that produced was `01-hero.png`: a European IBAN, a €12,480.55 balance,
 * an "Open An Account" button and "Free plan available · Online application in
 * about 5 minutes" — the listing thumbnail, and the one artefact where every
 * marker that this is a concept build had been removed by this script. The site
 * was scrupulously honest and its screenshots were not.
 *
 * So the badge stays in every frame. Collapsed it is a single on-brand pill
 * reading "Concept build — what's real?", which costs almost nothing visually
 * and is the whole difference between an image that reads as a fake bank and one
 * that reads as a designed demo. For a reviewer deciding whether this developer
 * can be trusted with a client's product, it argues in favour.
 *
 * It throws rather than warns. A run that quietly wrote eight unmarked images is
 * precisely the failure this exists to prevent, and a class-based selector is a
 * thing that drifts silently when a component is restyled.
 *
 * It drifted. The badge was moved out of the page corner and into the navbar —
 * a good change, because a permanent overlay has no idea what is under it and
 * that one was covering the primary call to action on /pricing — and
 * `.fixed.bottom-4.left-4` stopped matching anything. The guard did its job and
 * threw, so no unmarked image was written; the lesson is that it should not have
 * been reachable by a styling decision in the first place. `[data-disclosure]`
 * is an attribute that exists to be found, and `tests/portfolio-honesty.test.ts`
 * now asserts that this script and `ConceptBadge` name the same one.
 */
async function requireDisclosure(page) {
  const found = await page.evaluate(() => {
    const el = document.querySelector("[data-disclosure]");
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      text: el.innerText.replace(/\s+/g, " ").trim(),
      width: rect.width,
      height: rect.height,
      hidden: style.display === "none" || style.visibility === "hidden",
    };
  });

  if (!found || found.hidden || found.width < 40 || found.height < 16) {
    throw new Error(
      "Concept-build disclosure is missing or not rendered. Refusing to write " +
        "portfolio images with no marker that this is a concept build. If the " +
        "badge moved, update the selector in requireDisclosure().",
    );
  }
  if (!/concept build/i.test(found.text)) {
    throw new Error(
      `Element in the disclosure slot does not read as one: "${found.text}".`,
    );
  }
}

/**
 * Write the shot, then re-encode it.
 *
 * Chrome's PNG encoder optimises for speed, not size, and these frames are
 * mostly large smooth magenta gradients — the worst case for it. The first
 * eight came to 6.2 MB, of which the hero alone was 2.0 MB and the 3x mobile
 * shot 1.8 MB. That matters in two places: the README embeds the hero at the
 * top, so every visitor to the repository downloads it before reading a word,
 * and a public repo carries its images forever in git history.
 *
 * `sharp` re-encodes losslessly at maximum effort — identical pixels, roughly a
 * third of the bytes. It is already present as a transitive dependency and is
 * pinned in `overrides`, so this adds nothing to install.
 */
async function shot(page, name) {
  const path = resolve(OUT, `${name}.png`);
  const raw = await page.screenshot({ type: "png" });
  const optimised = await sharp(raw)
    .png({ compressionLevel: 9, effort: 10, palette: false })
    .toBuffer();
  // Keep whichever is smaller: on a shot that is mostly flat colour Chrome
  // occasionally already wins, and "optimised" that is larger is not.
  const output = optimised.length < raw.length ? optimised : raw;
  writeFileSync(path, output);
  const saved = Math.round((1 - output.length / raw.length) * 100);
  console.log(
    `  ✓ ${name}.png  ${(output.length / 1048576).toFixed(2)} MB` +
      (saved > 0 ? ` (−${saved}% vs raw)` : ""),
  );
}

/** Height of the floating navbar, plus a little breathing room. */
const NAV_BAND = 104;

/**
 * Put the interesting element in the frame, at a scroll position that cuts
 * nothing.
 *
 * A viewport screenshot taken at scroll zero shows whatever the page opens
 * with, which on `/demo` and the tool pages is the marketing hero — the same
 * hero already captured as 01. So each of these has to be scrolled to its
 * subject.
 *
 * The previous version scrolled the subject to a hand-tuned offset and stopped
 * there, which is why the shipped set looked the way it did: `06` sliced the
 * intro paragraph through the middle of its line at the top edge, `08` sliced
 * the `<h1>` in half, and `03`/`04` ended on the next section's heading cut
 * mid-word. Each was fixed by nudging its own magic number, which just moved
 * the cut somewhere else — the offset that clears one page's header lands in
 * the middle of the next page's paragraph.
 *
 * The property actually wanted is not an offset. It is: **no line of text
 * crosses either edge of the frame, and nothing meaningful hides under the
 * navbar.** So this searches a window of scroll positions around the ideal one
 * and picks the best-scoring, which is a property that holds when the page
 * changes rather than a number that has to be re-tuned when it does.
 */
async function frame(page, selector, offset = NAV_BAND) {
  const result = await page.evaluate(
    (sel, off, navBand) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      const viewport = window.innerHeight;
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewport);
      const ideal = Math.min(maxScroll, Math.max(0, el.getBoundingClientRect().top + window.scrollY - off));

      /**
       * Boxes worth not cutting: things that read as a line of text or a
       * discrete object, rather than the containers wrapping them. A section
       * `<div>` spanning the whole frame is crossed by every candidate and
       * would drown out the signal.
       */
      const boxes = [];
      // `a` matters as much as `button`: every CTA on this site is a `Button
      // href`, which renders an anchor. Leaving it out is why the first run of
      // this scorer still sliced "Get Marsa Plus" across the bottom of `08`
      // while reporting a cut score of zero.
      const SELECTOR =
        "h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd,label,button,a,[role='button'],img,svg,input,figcaption,blockquote";
      for (const node of document.querySelectorAll(SELECTOR)) {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) continue;
        const heading = /^H[1-6]$/.test(node.tagName);
        /*
         * Taller than this and it is a layout box that happens to use a text
         * tag, not a line someone would notice being sliced.
         *
         * Headings are exempt, and that exemption is the whole reason `02`
         * shipped with the word "Instant" cut through the middle at the top
         * edge. `/tools/currency-converter` sets its `<h1>` at display size and
         * it wraps to five lines, which is comfortably over this ceiling — so
         * the one element on the page that matters most was the one element the
         * scorer never saw, and every candidate position scored as if slicing it
         * were free. A heading is never a layout container. Excluding it by
         * height is excluding it by importance, backwards.
         */
        if (!heading && rect.height > 240) continue;
        const style = getComputedStyle(node);
        if (style.visibility === "hidden" || style.opacity === "0") continue;
        /*
         * Skip anything that travels with the viewport — the floating navbar
         * and its links, the disclosure badge inside it.
         *
         * These are not part of the composition being framed: they are drawn
         * at the same place on screen whatever the scroll position, so they
         * can neither be cut by an edge nor hidden behind the bar they *are*.
         * Counting them did both. `rect.top + scrollY` for a fixed element
         * grows as the page scrolls, so the navbar's own contents kept landing
         * inside the navbar band and being charged the obscured penalty — a
         * tax on every candidate near the top of a page, largest at scroll 0.
         *
         * On `/tools/currency-converter` that tax was decisive. Scroll 0 frames
         * the page exactly as designed — the whole five-line `<h1>` clear of
         * the bar, the live converter and its chart beneath it — and scored
         * **73.5** against 9.8 for a position that tucks the first line of the
         * headline behind the navbar. So the scorer rejected the correct frame
         * because of the bar it was trying to avoid, and `02` shipped with
         * "Instant" sliced through the middle. The heading-height exemption
         * above was a real fix for a real fault and was never the whole one.
         */
        let floating = false;
        for (let el = node; el; el = el.parentElement) {
          const position = getComputedStyle(el).position;
          if (position === "fixed" || position === "sticky") {
            floating = true;
            break;
          }
        }
        if (floating) continue;
        boxes.push({
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
          // A heading cut in half is the worst thing in the frame; a list item
          // is bad; an icon is untidy.
          weight: heading ? 6 : node.tagName === "P" ? 4 : /^(A|BUTTON)$/.test(node.tagName) ? 3 : 2,
        });
      }

      /*
       * The three faults are not equally bad, and the first version of this
       * scorer had them ranked backwards.
       *
       * It charged a full weight for a cut at *either* edge and a half weight
       * for sitting under the navbar — making "hide a paragraph behind the
       * navbar" the cheapest outcome available. On `03`/`04` that is exactly
       * what it bought: given a choice between tucking the demo page's intro
       * paragraph under the translucent navbar (2) and cutting the section
       * heading below the fold at the bottom edge (6), it picked the former,
       * and the frame it wrote had a line of text showing through the navigation
       * bar. In a still, with no scroll position to explain it, that reads as a
       * rendering fault rather than as a crop.
       *
       * How each fault actually reads in a still image:
       *
       *   • **Under the navbar** — worst. Nothing in a screenshot tells the
       *     viewer the bar is floating over a longer page, so text emerging
       *     from behind it looks like a z-index bug.
       *   • **Cut at the top edge** — bad. The frame appears to start
       *     mid-sentence.
       *   • **Cut at the bottom edge** — mild, and unavoidable on any page
       *     taller than the viewport. A part-visible heading at the bottom is
       *     how every screenshot of a long page ends; it reads as "the page
       *     continues", which is true.
       */
      const OBSCURED = 1.5;
      const TOP_CUT = 1;
      const BOTTOM_CUT = 0.4;

      const score = (scroll) => {
        const top = scroll;
        const bottom = scroll + viewport;
        let total = 0;
        for (const box of boxes) {
          // Straddling either edge: the element is drawn cut in half.
          if (box.top < top && box.bottom > top) total += box.weight * TOP_CUT;
          if (box.top < bottom && box.bottom > bottom) total += box.weight * BOTTOM_CUT;
          // Sitting behind the floating navbar: not cut, but obscured, which
          // is what made the converter's own <h1> unreadable in `02`.
          if (box.top < top + navBand && box.bottom > top) total += box.weight * OBSCURED;
        }
        return total;
      };

      /*
       * Search around the ideal position, paying for the distance travelled.
       *
       * Distance used to be a tie-break only: any position with a strictly
       * lower cut score won, however far away it was. That is not what framing
       * means. Each of these shots names a subject — the converter's amount
       * field, the demo's progress rail — and `offset` says how far below the
       * top of the frame that subject belongs; a position that cuts nothing but
       * has scrolled 400px off the mark is a picture of something else.
       *
       * It duly took one. With the navbar tax removed, scroll 20 on `/demo`
       * cuts nothing at all — because it is the marketing hero, with the demo
       * widget half in frame beneath it — and it beat the correct 340 on score
       * alone. Both demo captures became a second photograph of the page header.
       *
       * So distance enters the objective rather than the tie-break. At 0.04 a
       * unit of cut weight is worth 25px of travel, which puts a sliced heading
       * (weight 6) at 150px — far enough to clear the thing being avoided,
       * never far enough to leave the subject behind.
       */
      const DISTANCE_COST = 0.04;

      let best = ideal;
      let bestScore = Infinity;
      let bestCut = Infinity;
      for (let delta = 0; delta <= 420; delta += 4) {
        for (const candidate of delta === 0 ? [ideal] : [ideal - delta, ideal + delta]) {
          const scroll = Math.min(maxScroll, Math.max(0, candidate));
          const cut = score(scroll);
          const value = cut + Math.abs(scroll - ideal) * DISTANCE_COST;
          if (value < bestScore - 0.001) {
            bestScore = value;
            bestCut = cut;
            best = scroll;
          }
        }
      }

      window.scrollTo({ top: best, behavior: "instant" });
      return { ideal: Math.round(ideal), chosen: Math.round(best), score: bestCut };
    },
    selector,
    offset,
    NAV_BAND,
  );
  if (!result) throw new Error(`nothing matched ${selector}`);
  if (result.chosen !== result.ideal) {
    console.log(`    framed ${result.ideal}px → ${result.chosen}px (cut score ${result.score})`);
  }
  await new Promise((r) => setTimeout(r, 450));
}

async function goto(page, url, viewport = DESKTOP) {
  await page.setViewport(viewport);
  await page.goto(`${ORIGIN}${url}`, { waitUntil: "networkidle2", timeout: 60000 });
  await requireDisclosure(page);
  await settle(page);
}

/**
 * Click the demo's primary advance button, waiting for it to become enabled.
 *
 * Several steps gate Continue behind an action that takes time — the identity
 * step runs a simulated KYC check to 100% before it opens. Polling for the
 * enabled state rather than sleeping a fixed interval keeps this correct if the
 * timings are retuned.
 */
async function advance(page, times) {
  for (let i = 0; i < times; i += 1) {
    const deadline = Date.now() + 15000;
    let clicked = false;
    while (Date.now() < deadline && !clicked) {
      clicked = await page.evaluate(() => {
        const next = Array.from(document.querySelectorAll("button")).find((b) =>
          /start the demo|continue/i.test(b.textContent ?? ""),
        );
        if (!next || next.disabled) return false;
        next.click();
        return true;
      });
      if (!clicked) await new Promise((r) => setTimeout(r, 300));
    }
    if (!clicked) throw new Error(`demo: advance ${i + 1} stayed disabled for 15s`);
    await new Promise((r) => setTimeout(r, 550));
  }
}

/**
 * Click a button whose label matches `re`, waiting for it to become enabled.
 *
 * The convert step fetches a live ECB rate before its button opens, so this
 * polls for the same reason `advance` does — a fixed sleep would be a race
 * against the network.
 */
async function clickLabel(page, re, waitMs = 1600) {
  const deadline = Date.now() + 20000;
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
  if (!clicked) throw new Error(`could not find an enabled button matching ${re}`);
  await new Promise((r) => setTimeout(r, waitMs));
}

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`);
    process.exit(1);
  }
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const page = await browser.newPage();

  try {
    console.log("01 hero");
    await goto(page, "/");
    await shot(page, "01-hero");

    console.log("02 live rates");
    await goto(page, "/tools/currency-converter");
    // The amount field is inside the converter card, so framing on its section
    // puts the working widget — and the live rate it just fetched — in shot,
    // rather than the explainer copy further down the page.
    await frame(page, "#fx-amount", 260);
    await shot(page, "02-live-rates");

    console.log("03/04 demo");
    await goto(page, "/demo");
    // welcome → profile → identity → account → receive, then take the payout.
    // Captured here rather than one step earlier: the "account is live" step
    // shows a correct but empty account, and three zero balances is a poor
    // advertisement for a multi-currency product. One step on, the IBAN is
    // still in frame and the money has actually arrived.
    await advance(page, 4);
    await clickLabel(page, /receive|payout/);
    await settle(page);
    await frame(page, "ol[aria-label='Demo progress']");
    await shot(page, "03-feature-account");
    await advance(page, 1);
    // The convert step loads a live ECB rate on entry; give it room, then
    // capture the state where the rate and the converted amount are both shown.
    await clickLabel(page, /→ EUR/, 1800);
    await settle(page);
    await frame(page, "ol[aria-label='Demo progress']");
    await shot(page, "04-feature-convert");
    // Finish the run. The funnel captured below counts real sessions, so
    // leaving every capture abandoned at "convert" would show a 0% completion
    // rate that is an artefact of this script rather than of the product.
    await advance(page, 1);
    await clickLabel(page, /send .*sepa/i);
    await advance(page, 1);

    console.log("06 iban validation");
    await goto(page, "/tools/iban-checker");
    await page.evaluate(() => {
      const input = document.querySelector("input[type='text'], input:not([type])");
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      ).set;
      setter.call(input, "DE89 3704 0044 0532 0130 00");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    // Submit it. An untouched form shows the feature exists; the result panel
    // shows it works, which is the only reason this shot is in the set.
    await clickLabel(page, /check iban/, 900);
    // 150px puts the card just clear of the sticky navbar. Framing tighter
    // slices the page's own <h1> in half behind it, which looks like a
    // rendering fault rather than a crop.
    await frame(page, "#iban-input, input", 150);
    await shot(page, "06-iban-validation");

    console.log("07 mobile demo");
    // Driven through the same steps as 03, at 390px, because the claim worth
    // making about mobile is not that the hero reflows — 01 already implies
    // that, and the previous version of this shot proved only that. It is that
    // the whole interaction works down here: the progress rail, the balances,
    // the live conversion and the controls, on a phone.
    await goto(page, "/demo", MOBILE);
    await advance(page, 4);
    await clickLabel(page, /receive|payout/);
    await advance(page, 1);
    await clickLabel(page, /→ EUR/, 1800);
    await settle(page);
    await frame(page, "ol[aria-label='Demo progress']", 84);
    await shot(page, "07-mobile");

    const password = adminPassword();
    if (!password) {
      console.warn("  ! ADMIN_PASSWORD not set — skipping 05-analytics");
    } else {
      console.log("05 analytics");
      await page.setViewport(DESKTOP);
      await page.goto(`${ORIGIN}/admin/login`, { waitUntil: "networkidle2" });
      await page.type("input[name='password']", password);
      await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => {}),
        page.click("button[type='submit']"),
      ]);
      await new Promise((r) => setTimeout(r, 1200));

      await goto(page, "/admin/funnel");
      await shot(page, "05-analytics");
    }

    console.log("\nDone.");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
