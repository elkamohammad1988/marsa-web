import puppeteer from "puppeteer-core";
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT_ROOT = resolve("portfolio-screenshots");
const ORIGIN = "http://localhost:3000";

const PAGES = [
  { slug: "pricing", url: "/pricing" },
  { slug: "personal-iban", url: "/personal/multi-currency-iban" },
  { slug: "personal-how-it-works", url: "/personal/how-it-works" },
  { slug: "personal-sepa", url: "/personal/sepa-transfers" },
  { slug: "business-iban", url: "/business/multi-currency-iban" },
  { slug: "business-account", url: "/business/eu-business-account" },
  { slug: "business-ecommerce", url: "/business/e-commerce-sellers" },
  { slug: "business-how-it-works", url: "/business/how-it-works" },
  { slug: "currency-converter", url: "/tools/currency-converter" },
  { slug: "blog", url: "/blog" },
];

const MOBILE_PAGES = [
  { slug: "pricing", url: "/pricing" },
  { slug: "personal-iban", url: "/personal/multi-currency-iban" },
  { slug: "currency-converter", url: "/tools/currency-converter" },
  { slug: "business-account", url: "/business/eu-business-account" },
];

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 2 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const MAX_HEIGHT_DESKTOP = 1100; // cap section height so shots stay balanced
const MAX_HEIGHT_MOBILE = 1200;
const MIN_HEIGHT = 320; // skip trivial sections (breadcrumbs, etc.)

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

async function loadPage(page, url, viewport) {
  await page.setViewport(viewport);
  await page.goto(`${ORIGIN}${url}`, { waitUntil: "networkidle2", timeout: 60000 });
  // Force lazy-loaded images to load by scrolling through the page once.
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    const step = window.innerHeight;
    for (let y = 0; y <= total; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  // Brief settle
  await new Promise((r) => setTimeout(r, 600));
}

async function captureHero(page, viewport, outPath) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({
    path: outPath,
    type: "png",
    clip: { x: 0, y: 0, width: viewport.width, height: viewport.height },
  });
}

async function captureSections(page, viewport, maxHeight, slug, outDir) {
  // Hide sticky navbar and "back-to-top" floater so they don't repeat in every shot.
  await page.addStyleTag({
    content: `
      header.sticky { position: static !important; }
      body > main > section:first-of-type { /* hero keeps its own shot */ }
    `,
  });

  // Get bounding rects of all <section> elements within main.
  const rects = await page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll("main > section, main section"));
    // Dedupe to direct main children if any exist, else fall back.
    const direct = Array.from(document.querySelectorAll("main > section"));
    const list = direct.length ? direct : sections;
    return list.map((el, idx) => {
      const r = el.getBoundingClientRect();
      return {
        idx,
        top: r.top + window.scrollY,
        height: r.height,
        // Try to grab a heading for naming
        heading:
          el.querySelector("h1,h2,h3")?.innerText?.trim().slice(0, 40) || `section-${idx + 1}`,
      };
    });
  });

  let n = 0;
  for (const r of rects) {
    if (r.height < MIN_HEIGHT) continue;
    const clipHeight = Math.min(Math.ceil(r.height), maxHeight);
    // Ensure document is tall enough by scrolling near the section first
    await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y - 50), behavior: "instant" }), r.top);
    await new Promise((r) => setTimeout(r, 150));

    // Re-measure after layout settled.
    const top = await page.evaluate((idx) => {
      const direct = Array.from(document.querySelectorAll("main > section"));
      const el = direct[idx];
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return rect.top + window.scrollY;
    }, r.idx);
    if (top == null) continue;

    n += 1;
    const safeName = r.heading
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || `section-${n}`;
    const filename = `${String(n).padStart(2, "0")}-${safeName}.png`;
    const out = resolve(outDir, filename);

    // Scroll the section to viewport top so clip math is straightforward.
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), top);
    await new Promise((r) => setTimeout(r, 250));

    await page.screenshot({
      path: out,
      type: "png",
      clip: { x: 0, y: top, width: viewport.width, height: clipHeight },
    });
    console.log(`  -> ${slug}/${filename}  (h=${clipHeight})`);
  }
}

async function main() {
  // Fresh output dir
  if (existsSync(OUT_ROOT)) rmSync(OUT_ROOT, { recursive: true, force: true });
  ensureDir(OUT_ROOT);
  ensureDir(resolve(OUT_ROOT, "desktop"));
  ensureDir(resolve(OUT_ROOT, "mobile"));

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--hide-scrollbars", "--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();

  // Desktop captures
  for (const p of PAGES) {
    const dir = resolve(OUT_ROOT, "desktop", p.slug);
    ensureDir(dir);
    console.log(`[desktop] ${p.slug}`);
    try {
      await loadPage(page, p.url, DESKTOP);
      // Hero shot first (with navbar visible)
      await captureHero(page, DESKTOP, resolve(dir, "00-hero.png"));
      // Then section-by-section (with navbar hidden)
      await captureSections(page, DESKTOP, MAX_HEIGHT_DESKTOP, p.slug, dir);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
  }

  // Mobile captures
  for (const p of MOBILE_PAGES) {
    const dir = resolve(OUT_ROOT, "mobile", p.slug);
    ensureDir(dir);
    console.log(`[mobile] ${p.slug}`);
    try {
      await loadPage(page, p.url, MOBILE);
      await captureHero(page, MOBILE, resolve(dir, "00-hero.png"));
      await captureSections(page, MOBILE, MAX_HEIGHT_MOBILE, p.slug, dir);
    } catch (e) {
      console.error(`  FAIL: ${e.message}`);
    }
  }

  await browser.close();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
