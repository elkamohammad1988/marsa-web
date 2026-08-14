#!/usr/bin/env node
/**
 * Record the Marsa product demo video, reproducibly, from the real application.
 *
 * The brief this exists to satisfy asked for something that does *not* read as
 * a screen recording of a developer clicking around, and does not read as
 * generated either. Those are two different failure modes and they want
 * opposite fixes: the first is cured by choreography, the second by refusing to
 * invent anything. So every frame in this file is the production build running
 * on localhost, driven through real mouse and keyboard events, and the only
 * things drawn on top are a cursor, a caption and two title cards — all of
 * which use the site's own CSS custom properties and fonts, so the overlay is
 * literally the same design system as the page underneath it.
 *
 * Nothing here is composited afterwards. It is one continuous take, which is
 * why the scene transitions are veils rather than cuts: a cut would need an
 * editor, and an editor is a step that cannot be re-run by `npm run record`.
 *
 *   npm run build && npm start      # in one terminal
 *   npm run record                  # in another
 *
 * Output, in `portfolio-video/`:
 *   marsa-demo.mp4    the deliverable — H.264, 1920x1080, ~60s, no audio
 *   poster.png        a still for README/LinkedIn embeds that cannot autoplay
 *
 * ## Why the cursor is drawn rather than captured
 *
 * A screencast does not include the pointer — the CDP screencast is a capture
 * of the page's own compositor, and the OS cursor is not part of it. Recording
 * the desktop instead would pick up a real cursor and also the window chrome,
 * the taskbar, and whatever notification arrives mid-take. So the pointer here
 * is an element in the page, moved along an eased path, while `page.mouse` is
 * moved to the same coordinates on the same schedule. The hover states are
 * therefore real: the button under the drawn cursor lights up because the
 * browser genuinely thinks the mouse is over it.
 *
 * ## What is asserted rather than assumed
 *
 * `requireDisclosure()` refuses to record a page that is not carrying the
 * concept-build badge, for the same reason `scripts/capture.mjs` refuses to
 * photograph one. A video is even more of a standalone artefact than a
 * screenshot — it gets posted to LinkedIn where there is no repository around
 * it — so the closing card states the disclosure in full, and
 * `assertClosingDisclosure()` fails the run if that card has been edited into
 * something that no longer says it.
 *
 * The credibility card near the end quotes measured numbers. They are listed
 * once, in `FACTS`, and `tests/portfolio-honesty.test.ts` asserts the test
 * count there is the same one README.md claims — so the two artefacts cannot
 * drift apart without a red test. The numbers themselves come from actually
 * running the gate; see "Verified quality" in the README for the method.
 */

import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";

const CHROME =
  process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ORIGIN = process.env.CAPTURE_ORIGIN ?? "http://localhost:3000";
const OUT = resolve("portfolio-video");

/**
 * 1920x1080 at a device pixel ratio of 1.
 *
 * The tempting alternative is a smaller viewport at 2x, which gives crisper
 * text on a HiDPI capture. It also means every frame arrives as a 3840x2160
 * PNG over a CDP pipe at 30fps, which on this machine drops frames — and a
 * dropped frame in a scroll is visible as a stutter in a way that slightly
 * softer text is not. Native 1080p is one pixel per pixel, nothing resampled,
 * and it is the resolution every destination for this file expects.
 */
const VIEWPORT = { width: 1920, height: 1080, deviceScaleFactor: 1 };
const FPS = 30;

/**
 * The number `npm test` prints, written once.
 *
 * It used to be written twice in the object below — once as `tests` and once
 * inside the first chip — and the two were the same string only because nobody
 * had edited one of them yet. It is now a constant for the ordinary reason, and
 * for a second one: `tests/portfolio-honesty.test.ts` scans this file for test
 * counts and fails if it finds more than one distinct figure across every
 * artefact that quotes it. A duplicated literal here is a second place for the
 * claim to go stale in a frame of video, which is the hardest place to notice
 * it and the hardest to correct after the fact.
 */
const TEST_COUNT = "1,560";

/**
 * The engineering claims shown on the credibility card.
 *
 * Every one of these is checkable from this repository, which is the point of
 * showing them at all.
 */
const FACTS = {
  tests: TEST_COUNT,
  chips: [
    [TEST_COUNT, "unit tests, green"],
    ["0", "axe violations, 72 page-loads"],
    ["100", "Lighthouse accessibility"],
    ["0", "production vulnerabilities"],
    ["strict", "TypeScript, zero any"],
    ["RLS", "Postgres row-level security"],
    ["ECB", "live reference rates"],
    ["CI", "gate on every push"],
  ],
};

/* ------------------------------------------------------------------ *
 * The overlay, installed into every document before its own scripts run.
 * ------------------------------------------------------------------ */

/**
 * Everything drawn on top of the page: cursor, caption, veil, title cards.
 *
 * This runs via `evaluateOnNewDocument`, so it survives navigation — the
 * alternative is re-injecting after every `goto`, which races the first paint
 * and shows a naked page for a frame or two. It waits for `body` rather than
 * assuming one, because it is running before the document has been parsed.
 *
 * The veil's initial state is read from `sessionStorage`. A navigation destroys
 * the overlay along with the document, so without this the screen would flash
 * the new page at full brightness in the middle of what is supposed to be a
 * cross-fade. The driver sets the key before navigating and clears it once the
 * new page has settled.
 */
function installOverlay() {
  const CURSOR_SVG = `
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      <path d="M5 2.5 L5 19 L9.2 15.2 L11.9 21.2 L14.9 19.8 L12.2 13.9 L18 13.6 Z"
            fill="#ffffff" stroke="rgba(0,0,0,0.55)" stroke-width="1.1"
            stroke-linejoin="round"/>
    </svg>`;

  const install = () => {
    if (document.getElementById("mv-root")) return;

    const style = document.createElement("style");
    style.id = "mv-style";
    style.textContent = `
      #mv-root {
        position: fixed; inset: 0; z-index: 2147483647; pointer-events: none;
        font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
      }
      #mv-cursor {
        position: absolute; top: 0; left: 0; width: 26px; height: 26px;
        transform: translate3d(-100px,-100px,0); will-change: transform;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5)); opacity: 0;
        transition: opacity 260ms ease;
      }
      #mv-cursor.on { opacity: 1; }
      #mv-ring {
        position: absolute; top: 0; left: 0; width: 46px; height: 46px;
        margin: -23px 0 0 -23px; border-radius: 999px;
        border: 2px solid rgb(var(--brand-strong)); opacity: 0;
        transform: translate3d(-100px,-100px,0) scale(0.35); will-change: transform, opacity;
      }
      #mv-ring.ping { animation: mv-ping 520ms cubic-bezier(0.22,1,0.36,1); }
      @keyframes mv-ping {
        0%   { opacity: 0.85; transform: var(--mv-ring-pos) scale(0.35); }
        100% { opacity: 0;    transform: var(--mv-ring-pos) scale(1.15); }
      }
      #mv-caption {
        position: absolute; left: 56px; bottom: 52px; max-width: 46ch;
        display: flex; align-items: center; gap: 12px;
        padding: 13px 20px 13px 17px; border-radius: 999px;
        background: rgb(var(--surface-deep) / 0.82);
        border: 1px solid rgb(var(--line));
        backdrop-filter: blur(14px) saturate(1.3);
        box-shadow: 0 18px 44px rgba(0,0,0,0.5);
        color: rgb(var(--ink)); font-size: 17px; line-height: 1.35;
        letter-spacing: -0.005em;
        opacity: 0; transform: translateY(10px);
        transition: opacity 380ms ease, transform 380ms cubic-bezier(0.22,1,0.36,1);
      }
      #mv-caption.on { opacity: 1; transform: translateY(0); }
      #mv-caption .dot {
        width: 7px; height: 7px; border-radius: 999px; flex: none;
        background: rgb(var(--brand-strong));
        box-shadow: 0 0 0 4px rgb(var(--brand-strong) / 0.18);
      }
      #mv-veil {
        position: absolute; inset: 0; background: rgb(var(--surface-deep));
        opacity: 0; transition: opacity 300ms ease;
      }
      #mv-card {
        position: absolute; inset: 0; display: grid; place-items: center;
        background:
          radial-gradient(1100px 620px at 50% 8%, rgb(var(--brand) / 0.20), transparent 62%),
          radial-gradient(900px 560px at 82% 96%, rgb(var(--brand-soft) / 0.24), transparent 60%),
          rgb(var(--surface-deep));
        opacity: 0; transition: opacity 460ms ease; text-align: center;
      }
      #mv-card.on { opacity: 1; }
      #mv-card .inner { max-width: 1120px; padding: 0 64px; }
      #mv-card .mark {
        width: 62px; height: 62px; border-radius: 17px; margin: 0 auto 30px;
        display: grid; place-items: center; color: #fff;
        background: linear-gradient(145deg, rgb(var(--brand-soft)), rgb(var(--brand)) 55%, rgb(var(--brand-deep)));
        box-shadow: 0 0 0 1px rgb(255 255 255 / 0.14) inset, 0 16px 40px rgb(var(--brand) / 0.34);
      }
      #mv-card h2 {
        font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
        font-weight: 700; letter-spacing: -0.035em; color: rgb(var(--ink));
        font-size: 66px; line-height: 1.06; margin: 0;
      }
      #mv-card p.sub {
        margin: 22px auto 0; max-width: 56ch; font-size: 22px; line-height: 1.5;
        color: rgb(var(--ink-muted));
      }
      #mv-card .grid {
        margin: 54px auto 0; display: grid; gap: 18px;
        grid-template-columns: repeat(4, minmax(0,1fr)); max-width: 1320px;
      }
      #mv-card .chip {
        border: 1px solid rgb(var(--line)); border-radius: 18px;
        background: rgb(var(--card) / 0.72); padding: 26px 22px; text-align: left;
        opacity: 0; transform: translateY(14px);
        transition: opacity 420ms ease, transform 420ms cubic-bezier(0.22,1,0.36,1);
      }
      #mv-card.chips-in .chip { opacity: 1; transform: translateY(0); }
      #mv-card .chip b {
        display: block; font-family: var(--font-display), system-ui, sans-serif;
        font-size: 36px; font-weight: 700; letter-spacing: -0.02em;
        color: rgb(var(--brand-strong)); line-height: 1.1;
      }
      #mv-card .chip span {
        display: block; margin-top: 8px; font-size: 16px; line-height: 1.4;
        color: rgb(var(--ink-muted));
      }
      #mv-card .disclosure {
        margin: 42px auto 0; display: inline-flex; align-items: center; gap: 11px;
        padding: 13px 24px; border-radius: 999px;
        border: 1px solid rgb(var(--brand-strong) / 0.4);
        background: rgb(var(--brand) / 0.09);
        font-size: 17px; color: rgb(var(--ink));
      }
      #mv-card .disclosure .dot {
        width: 7px; height: 7px; border-radius: 999px; flex: none;
        background: rgb(var(--brand-strong));
      }
      @media (prefers-reduced-motion: reduce) {
        #mv-caption, #mv-card, #mv-veil, #mv-card .chip { transition-duration: 1ms; }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement("div");
    root.id = "mv-root";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <div id="mv-veil"></div>
      <div id="mv-card"></div>
      <div id="mv-ring"></div>
      <div id="mv-cursor">${CURSOR_SVG}</div>
      <p id="mv-caption"><span class="dot"></span><span class="text"></span></p>
    `;
    document.body.appendChild(root);

    const cursor = root.querySelector("#mv-cursor");
    const ring = root.querySelector("#mv-ring");
    const caption = root.querySelector("#mv-caption");
    const veil = root.querySelector("#mv-veil");
    const card = root.querySelector("#mv-card");

    // Carry the veil across a navigation, so a page swap fades rather than flashes.
    if (sessionStorage.getItem("mv-veil") === "1") {
      veil.style.transition = "none";
      veil.style.opacity = "1";
      // Restore the transition on the next frame, or the fade-out is instant too.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          veil.style.transition = "";
        });
      });
    }

    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    window.__mv = {
      cursorAt(x, y) {
        cursor.style.transform = `translate3d(${x - 4}px, ${y - 2}px, 0)`;
      },
      showCursor(on) {
        cursor.classList.toggle("on", on);
      },
      ping(x, y) {
        ring.style.setProperty("--mv-ring-pos", `translate3d(${x}px, ${y}px, 0)`);
        ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        ring.classList.remove("ping");
        void ring.offsetWidth;
        ring.classList.add("ping");
      },
      caption(text) {
        if (text === null) {
          caption.classList.remove("on");
          return;
        }
        const set = () => {
          caption.querySelector(".text").textContent = text;
          caption.classList.add("on");
        };
        if (caption.classList.contains("on")) {
          caption.classList.remove("on");
          setTimeout(set, 260);
        } else {
          set();
        }
      },
      veil(on) {
        veil.style.opacity = on ? "1" : "0";
        sessionStorage.setItem("mv-veil", on ? "1" : "0");
      },
      /** Ease the window to `y` over `ms`. Resolves when it arrives. */
      scrollTo(y, ms) {
        return new Promise((done) => {
          const from = window.scrollY;
          const delta = y - from;
          if (Math.abs(delta) < 1 || ms <= 0) {
            window.scrollTo(0, y);
            done();
            return;
          }
          const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / ms);
            window.scrollTo(0, from + delta * easeInOut(p));
            if (p < 1) requestAnimationFrame(tick);
            else done();
          };
          requestAnimationFrame(tick);
        });
      },
      card(html) {
        if (html === null) {
          card.classList.remove("on", "chips-in");
          return;
        }
        card.innerHTML = html;
        card.classList.add("on");
      },
      /** Stagger the credibility chips in, once the card itself has arrived. */
      chipsIn(stepMs) {
        const chips = card.querySelectorAll(".chip");
        chips.forEach((chip, i) => {
          chip.style.transitionDelay = `${i * stepMs}ms`;
        });
        card.classList.add("chips-in");
      },
      /** What the closing card actually says, for the guard in Node. */
      cardText() {
        return card.textContent.replace(/\s+/g, " ").trim();
      },
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
}

/* ------------------------------------------------------------------ *
 * Driver helpers.
 * ------------------------------------------------------------------ */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Where the drawn pointer currently is, so the next move starts from it. */
const pointer = { x: VIEWPORT.width * 0.5, y: VIEWPORT.height * 0.62 };

/**
 * Move the pointer along an eased path, driving the real mouse with it.
 *
 * The real `page.mouse.move` matters: it is what makes hover states fire, so
 * the button the cursor arrives at genuinely lights up rather than being
 * photographed in its resting state. Both are stepped at roughly the capture
 * rate — finer steps are wasted work because the screencast cannot see them.
 */
async function moveTo(page, x, y, ms = 620) {
  const from = { ...pointer };
  const steps = Math.max(2, Math.round((ms / 1000) * FPS));
  for (let i = 1; i <= steps; i += 1) {
    const p = easeInOut(i / steps);
    const nx = from.x + (x - from.x) * p;
    const ny = from.y + (y - from.y) * p;
    await page.evaluate((a, b) => window.__mv.cursorAt(a, b), nx, ny);
    await page.mouse.move(nx, ny);
    await wait(ms / steps);
  }
  pointer.x = x;
  pointer.y = y;
}

/** Centre of an element, in viewport coordinates. */
async function centreOf(page, selector) {
  const box = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
  if (!box) throw new Error(`nothing matched ${selector}`);
  return box;
}

/** Centre of the first button whose label matches `re`. */
async function centreOfLabel(page, re) {
  const box = await page.evaluate((source) => {
    const rx = new RegExp(source, "i");
    const el = Array.from(document.querySelectorAll("button, a")).find(
      (b) => rx.test((b.textContent ?? "").trim()) && !b.disabled,
    );
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, re.source);
  if (!box) throw new Error(`no enabled control matching ${re}`);
  return box;
}

/** Wait until a control matching `re` is present and enabled. */
async function waitForLabel(page, re, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const ready = await page.evaluate((source) => {
      const rx = new RegExp(source, "i");
      return Array.from(document.querySelectorAll("button, a")).some(
        (b) => rx.test((b.textContent ?? "").trim()) && !b.disabled,
      );
    }, re.source);
    if (ready) return;
    await wait(200);
  }
  throw new Error(`timed out waiting for an enabled control matching ${re}`);
}

/** Move to a point, pause a beat as a person would, then click it. */
async function clickAt(page, point, { travel = 620, settle = 260 } = {}) {
  await moveTo(page, point.x, point.y, travel);
  await wait(settle);
  await page.evaluate((a, b) => window.__mv.ping(a, b), point.x, point.y);
  await page.mouse.click(point.x, point.y);
}

async function clickLabel(page, re, opts) {
  await waitForLabel(page, re);
  await clickAt(page, await centreOfLabel(page, re), opts);
}

const caption = (page, text) => page.evaluate((t) => window.__mv.caption(t), text);
const showCursor = (page, on) => page.evaluate((v) => window.__mv.showCursor(v), on);
const scrollTo = (page, y, ms) => page.evaluate((a, b) => window.__mv.scrollTo(a, b), y, ms);

/**
 * Refuse to record a page that is not carrying the concept-build disclosure.
 *
 * Same rule, and the same reasoning, as `requireDisclosure()` in
 * `scripts/capture.mjs`: a portfolio artefact is the one place this product is
 * ever seen with no site around it. `[data-disclosure]` is an attribute that
 * exists to be found, rather than a class that a restyle can quietly move.
 */
async function requireDisclosure(page) {
  const ok = await page.evaluate(() => {
    const el = document.querySelector("[data-disclosure]");
    if (!el) return null;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return null;
    return el.innerText.replace(/\s+/g, " ").trim();
  });
  if (!ok || !/concept build/i.test(ok)) {
    throw new Error(
      "Concept-build disclosure missing from a frame about to be recorded. " +
        "Refusing to produce a video with no marker that this is a concept build.",
    );
  }
}

/**
 * Navigate under the veil, so a page swap is a cross-fade and not a white flash.
 *
 * The veil is raised here, carried across the navigation in `sessionStorage`,
 * and lowered by the caller once the new page has been scrolled and settled —
 * which is what makes the arrival feel composed rather than abrupt.
 */
async function navigate(page, path, { fade = 320 } = {}) {
  await page.evaluate(() => window.__mv.caption(null));
  await page.evaluate(() => window.__mv.veil(true));
  await wait(fade);
  await page.goto(`${ORIGIN}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await settle(page);
}

/**
 * Get a freshly-loaded page ready to be looked at.
 *
 * The reveal-on-scroll classes are forced visible rather than waited for. Their
 * observer fires when a section crosses the viewport, which for a video means
 * the first second of every scene would be spent watching content fade in that
 * a visitor scrolling normally would never have seen fade at all — the
 * animation is for arrival, and the camera has already arrived.
 */
async function settle(page) {
  await requireDisclosure(page);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    for (const el of document.querySelectorAll(".reveal, .stagger")) {
      el.classList.add("is-visible");
    }
  });
  await page.evaluate((x, y) => window.__mv.cursorAt(x, y), pointer.x, pointer.y);
  await wait(260);
}

/**
 * Put `selector`'s top edge `offset` pixels below the top of the frame.
 *
 * Scenes are composed around a subject rather than a scroll offset, because a
 * hand-tuned number is a number that is wrong the next time the copy above it
 * changes length — which is exactly how the first take ended up with the IBAN
 * checker's own heading sliced in half behind the navbar. `ms` of 0 jumps,
 * which is what a scene entering under the veil wants; anything else eases,
 * which is what a move within a scene wants.
 */
async function frameOn(page, selector, offset = 150, ms = 0) {
  const top = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.getBoundingClientRect().top + window.scrollY : null;
  }, selector);
  if (top === null) throw new Error(`nothing matched ${selector}`);
  await scrollTo(page, Math.max(0, top - offset), ms);
}

/** Lower the veil to reveal the page that was loaded behind it. */
async function reveal(page, hold = 420) {
  await page.evaluate(() => window.__mv.veil(false));
  await wait(hold);
}

/* ------------------------------------------------------------------ *
 * Title cards.
 * ------------------------------------------------------------------ */

const MARK = `
  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" aria-hidden="true">
    <circle cx="12" cy="7" r="2.7" fill="currentColor"/>
    <g stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6.4 12.6q5.6 3.4 11.2 0"/>
      <path d="M4.4 16.6q7.6 4.1 15.2 0" opacity="0.8"/>
    </g>
  </svg>`;

const credibilityCard = () => `
  <div class="inner">
    <h2>Built to a production bar</h2>
    <p class="sub">Every number below is measured from this repository, and the gate that
      produces them runs on every push.</p>
    <div class="grid">
      ${FACTS.chips
        .map(([value, label]) => `<div class="chip"><b>${value}</b><span>${label}</span></div>`)
        .join("")}
    </div>
  </div>`;

/**
 * The closing frame. The disclosure sentence here is the one thing in this file
 * that is not allowed to be softened — `assertClosingDisclosure()` checks it.
 */
const closingCard = () => `
  <div class="inner">
    <div class="mark">${MARK}</div>
    <h2>Marsa — concept fintech product</h2>
    <p class="sub">Next.js 15 · React 19 · TypeScript · Supabase Postgres with row-level
      security · live ECB rates · ${FACTS.tests} tests</p>
    <p class="disclosure"><span class="dot"></span>No real money. No customers. No financial licence.</p>
  </div>`;

async function assertClosingDisclosure(page) {
  const text = await page.evaluate(() => window.__mv.cardText());
  for (const phrase of ["No real money", "No customers", "No financial licence"]) {
    if (!text.includes(phrase)) {
      throw new Error(`Closing card no longer states "${phrase}". Refusing to write the video.`);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Scenes.
 * ------------------------------------------------------------------ */

/**
 * Scene 1 — the landing page, the brand, and the disclosure that governs it.
 *
 * No navigation: `main()` has already loaded `/` behind the veil, so this
 * opens by lifting it. The first cut re-navigated here, which meant the video
 * began with three seconds of black while a page that was already loaded
 * loaded again.
 */
async function sceneHero(page) {
  await settle(page);
  await scrollTo(page, 0, 0);
  await reveal(page, 520);
  await caption(page, "Marsa — a concept multi-currency account, built end to end");
  await wait(2100);
  await scrollTo(page, 560, 2200);
  await wait(900);
}

/** Scene 2 — the converter, running on live European Central Bank rates. */
async function sceneLiveFx(page) {
  await navigate(page, "/tools/currency-converter");
  await frameOn(page, "#fx-amount", 300);
  await reveal(page, 420);
  await caption(page, "Live FX — European Central Bank reference rates, not invented numbers");

  const field = await centreOf(page, "#fx-amount");
  await clickAt(page, field, { travel: 620 });
  // Select the existing value rather than appending to it: the field opens
  // pre-filled, and typing into it without this produces "10004820".
  await page.keyboard.down("Control");
  await page.keyboard.press("KeyA");
  await page.keyboard.up("Control");
  await page.keyboard.type("4820", { delay: 100 });
  await wait(1250);

  // Rest on the target-currency chip. The rate line and the 30-day ECB chart
  // are what the scene is about, and they sit directly under the pointer here.
  const to = await centreOf(page, "#fx-to");
  await moveTo(page, to.x, to.y, 520);
  await wait(1500);
}

/** Scene 3 — IBAN validation: ISO 13616 structure plus the MOD-97 checksum. */
async function sceneIban(page) {
  await navigate(page, "/tools/iban-checker");
  // Framed on the card, not the input: the result panel opens *below* the
  // field, so framing on the field alone pushed the success state — the whole
  // point of the scene — off the bottom of the frame.
  await frameOn(page, "#iban-input", 330);
  await reveal(page, 420);
  await caption(page, "IBAN validation — ISO 13616 structure and MOD-97 checksum, offline");

  const field = await centreOf(page, "#iban-input");
  await clickAt(page, field, { travel: 600 });
  await page.keyboard.type("DE89 3704 0044 0532 0130 00", { delay: 46 });
  await wait(420);
  await clickLabel(page, /check iban/, { travel: 520 });
  await wait(2600);
}

/**
 * Scene 4 — into the sandbox: open the account, pass the simulated identity
 * check, take the European IBAN, and receive the payout that funds the rest.
 *
 * Framed on the sandbox banner rather than a scroll offset, so the label that
 * says *sample data, no real money* is in frame for the whole sequence. That is
 * not a nicety: everything from here to the end of scene 6 is a balance moving,
 * and a balance moving with no visible sandbox marker is the single most
 * misleading thing this video could show.
 */
async function sceneSandbox(page) {
  await navigate(page, "/demo");
  await frameOn(page, "ol[aria-label='Demo progress']", 168);
  await reveal(page, 460);
  await caption(page, "Interactive sandbox — sample data, clearly labelled, no real money");

  await clickLabel(page, /start the demo/, { travel: 600 });
  await wait(750);
  // Account type and country are already sensible defaults; moving on keeps the
  // pace up. The identity step gates Continue until its check completes.
  await clickLabel(page, /continue/, { travel: 400, settle: 190 });
  await caption(page, "Onboarding, and a simulated KYC check");
  await wait(1850);
  await clickLabel(page, /continue/, { travel: 360, settle: 190 });
  await caption(page, "A European IBAN — structurally valid, not a live account");
  await wait(2100);
  await clickLabel(page, /continue/, { travel: 360, settle: 190 });
  await caption(page, "Money arrives from abroad");
  await clickLabel(page, /receive \$/, { travel: 480 });
  await wait(1900);
}

/** Scene 5 — the conversion, using the rate the app just fetched from the ECB. */
async function sceneConvert(page) {
  await clickLabel(page, /continue/, { travel: 400, settle: 190 });
  await caption(page, "Convert at the live interbank rate — fetched, not faked");
  // The step fetches the rate on entry; the button stays disabled until it lands.
  await waitForLabel(page, /convert \$/);
  await wait(1150);
  await clickLabel(page, /convert \$/, { travel: 520 });
  await wait(2400);
}

/** Scene 6 — the SEPA payout, and the account state it leaves behind. */
async function sceneSepa(page) {
  await clickLabel(page, /continue/, { travel: 400, settle: 190 });
  await caption(page, "Pay out over SEPA");
  await clickLabel(page, /send .*sepa/i, { travel: 500 });
  await wait(1800);
  await clickLabel(page, /continue/, { travel: 400, settle: 190 });
  await caption(page, "Received, converted, sent — the whole loop, and the activity to match");
  await wait(2500);
}

/** Scene 7 — the engineering behind it, in numbers that can be checked. */
async function sceneCredibility(page) {
  await caption(page, null);
  await showCursor(page, false);
  await page.evaluate((html) => window.__mv.card(html), credibilityCard());
  await wait(560);
  await page.evaluate(() => window.__mv.chipsIn(65));
  await wait(4200);
}

/** Scene 8 — the brand, and the disclosure, held long enough to read. */
async function sceneClosing(page) {
  await page.evaluate((html) => window.__mv.card(html), closingCard());
  await wait(240);
  await assertClosingDisclosure(page);
  await wait(4300);
}

/* ------------------------------------------------------------------ *
 * Post-processing.
 * ------------------------------------------------------------------ */

function run(cmd, args) {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", fail);
    child.on("close", (code) =>
      code === 0 ? done(out.trim()) : fail(new Error(`${cmd} exited ${code}\n${err.slice(-1500)}`)),
    );
  });
}

/** Decoded length of `file` in seconds. */
async function durationOf(file) {
  const out = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const seconds = Number.parseFloat(out);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`could not read a duration from ${file} (ffprobe said "${out}")`);
  }
  return seconds;
}

/**
 * How many video frames `file` contains.
 *
 * Counted rather than derived, because the raw capture carries no duration at
 * all — ffmpeg was writing to a pipe and never went back to fill the header in,
 * so `format=duration` on it is literally `N/A`. The frame count is the one
 * quantity in that file that is not in question.
 */
async function frameCountOf(file) {
  const out = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-count_packets",
    "-show_entries", "stream=nb_read_packets",
    "-of", "csv=p=0",
    file,
  ]);
  const frames = Number.parseInt(out, 10);
  if (!Number.isFinite(frames) || frames <= 0) {
    throw new Error(`could not count frames in ${file} (ffprobe said "${out}")`);
  }
  return frames;
}

/**
 * Turn the raw capture into the file that actually gets posted somewhere.
 *
 * Two things are wrong with what Puppeteer hands over, and both are fatal for
 * the destinations this video is for.
 *
 * **It is VP9, whatever the extension says.** `page.screencast()` hardcodes
 * `-vcodec vp9` and only the container follows `format`, so asking it for
 * `.mp4` produces VP9-in-MP4 with a `gbrp` pixel format. Chrome plays that;
 * LinkedIn, Upwork, QuickTime and most of Windows do not. The deliverable has
 * to be H.264 in `yuv420p`, which is the one combination everything decodes.
 *
 * **It plays back at the wrong speed.** Puppeteer duplicates frames so that the
 * stream runs at real time when interpreted at `fps`, but it never tells the
 * muxer that, so ffmpeg stamps the output at its own default and the file comes
 * out roughly a third longer than the take. A 78-second recording arrived as
 * 102 seconds of slow motion.
 *
 * Rather than hardcode a correction factor — which would be a magic number that
 * silently rots the next time either default changes — the timeline is rebuilt
 * from the two quantities that are known exactly: how many frames were
 * captured, and how long the driver was actually running. `setpts=N/(rate*TB)`
 * throws away the source timestamps and re-stamps each frame by its index, so
 * the output is the take, at the length the take really was, to the frame.
 */
async function transcode(raw, mp4, takeSeconds) {
  const frames = await frameCountOf(raw);
  const rate = frames / takeSeconds;
  console.log(`  ${frames} frames over ${takeSeconds.toFixed(1)}s → retimed at ${rate.toFixed(2)}fps`);
  await run("ffmpeg", [
    "-loglevel", "error", "-y",
    "-i", raw,
    "-vf", `setpts=N/(${rate.toFixed(6)}*TB),fps=${FPS},format=yuv420p`,
    "-c:v", "libx264",
    "-preset", "slow",
    "-crf", "20",
    "-profile:v", "high",
    "-level", "4.1",
    // Everything downstream streams this rather than downloading it first.
    "-movflags", "+faststart",
    "-an",
    mp4,
  ]);
}

/**
 * Pull a still out of the finished video for the places that cannot autoplay.
 *
 * GitHub will not play an MP4 that lives at a repository path, and a LinkedIn
 * or Upwork listing wants a thumbnail regardless. Taken from inside scene 4 —
 * the sandbox with an IBAN and a funded balance on screen, which is the frame
 * that says what the product is in one glance, and carries the concept badge.
 */
async function poster(mp4, at = "40") {
  await run("ffmpeg", [
    "-loglevel", "error", "-y",
    "-ss", at, "-i", mp4,
    "-frames:v", "1",
    resolve(OUT, "poster.png"),
  ]);
}

/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`);
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: [
      "--force-color-profile=srgb",
      "--hide-scrollbars",
      "--font-render-hinting=none",
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    ],
  });

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.evaluateOnNewDocument(installOverlay);

  const mp4 = resolve(OUT, "marsa-demo.mp4");
  const raw = resolve(OUT, ".raw-take.webm");
  let recorder;
  let takeSeconds = 0;

  try {
    // Land on the origin once before recording starts, so the first frame of
    // the take is a warm page rather than a cold compile — and raise the veil
    // first, so the recording opens on brand black rather than mid-layout.
    await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle2", timeout: 60000 });
    await page.evaluate(() => window.__mv.veil(true));
    await wait(300);

    // WebM is what the recorder natively produces; asking for `.mp4` would only
    // put VP9 in an MP4 box. `transcode()` makes the real deliverable.
    recorder = await page.screencast({ path: raw, fps: FPS, overwrite: true });
    const t0 = Date.now();
    await wait(400);
    await showCursor(page, true);

    const scenes = [
      ["hero", sceneHero],
      ["live FX", sceneLiveFx],
      ["IBAN", sceneIban],
      ["sandbox", sceneSandbox],
      ["convert", sceneConvert],
      ["SEPA", sceneSepa],
      ["credibility", sceneCredibility],
      ["closing", sceneClosing],
    ];
    for (const [name, scene] of scenes) {
      const at = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`  ${String(at).padStart(5)}s  ${name}`);
      await scene(page);
    }
    takeSeconds = (Date.now() - t0) / 1000;
    console.log(`\n  take length ${takeSeconds.toFixed(1)}s`);
  } finally {
    if (recorder) await recorder.stop();
    await browser.close();
  }

  await transcode(raw, mp4, takeSeconds);
  rmSync(raw, { force: true });
  await poster(mp4);

  const seconds = await durationOf(mp4);
  const megabytes = statSync(mp4).size / 1048576;
  console.log(`\nWrote ${mp4}`);
  console.log(`      ${seconds.toFixed(1)}s · ${megabytes.toFixed(1)} MB · ${VIEWPORT.width}x${VIEWPORT.height} H.264`);
  console.log(`Wrote ${resolve(OUT, "poster.png")}`);

  // The brief this was built to asks for 45-75 seconds, and a demo video that
  // outstays that is one nobody finishes. Loud rather than fatal: the file is
  // already written and watchable, and the fix is to retime scenes, not to
  // re-run the capture.
  if (seconds < 45 || seconds > 75) {
    console.warn(`\n  ! ${seconds.toFixed(1)}s is outside the 45-75s target. Retime the scenes.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
