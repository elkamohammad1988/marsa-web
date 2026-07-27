import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import {
  ART_NAMES,
  BLOG_MOTIFS,
  ART_CAPTIONS,
  BLOG_CAPTIONS,
} from "@/components/art/captions";

/**
 * Guards the failure that finding F1 actually was.
 *
 * It is tempting to read F1 as "the images are duplicates", but the duplication
 * was the symptom. The defect was that **a picture and the sentence describing
 * it were maintained in different files**: the drawing lived in
 * `public/images/`, the `alt` lived at each call site, and nothing connected
 * them. So `card-phone.png` could be rendered as *"Marsa Mastercard and mobile
 * app"* while being, in fact, the cover photograph of blog post 6 — a WCAG
 * 1.1.1 failure that no amount of care at the call site would have caught.
 *
 * Every illustration now ships its own description. These tests assert the
 * property that makes that true and keeps it true: no raster placeholders, no
 * per-page alt strings to drift, and a real sentence attached to every slot.
 */

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

const source = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("every illustration describes itself", () => {
  const all = [
    ...ART_NAMES.map((n) => [`art:${n}`, ART_CAPTIONS[n]] as const),
    ...BLOG_MOTIFS.map((m) => [`cover:${m}`, BLOG_CAPTIONS[m]] as const),
  ];

  it("covers every slot the site can render", () => {
    expect(ART_NAMES).toHaveLength(6);
    expect(BLOG_MOTIFS).toHaveLength(6);
  });

  it.each(all)("%s reads as a sentence, not a label", (_slot, caption) => {
    // "Marsa coin" was the old alt text, and it described nothing a
    // screen-reader user could picture. A caption has to earn its place.
    expect(caption.length).toBeGreaterThan(40);
    expect(caption.trim().endsWith(".")).toBe(true);
    expect(caption).toMatch(/illustration/i);
  });

  it("gives no two slots the same caption", () => {
    const captions = all.map(([, c]) => c);
    expect(new Set(captions).size).toBe(captions.length);
  });
});

describe("the placeholder imagery is gone for good", () => {
  it("ships no raster images in public/", () => {
    // Seventeen PNGs, six unique hashes, 2.2 MB, unknown provenance.
    const dir = path.join(ROOT, "public");
    const rasters: string[] = [];
    const walk = (d: string) => {
      if (!existsSync(d)) return;
      for (const entry of readdirSync(d)) {
        const p = path.join(d, entry);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(png|jpe?g|gif|webp|avif)$/i.test(entry)) rasters.push(path.relative(ROOT, p));
      }
    };
    walk(dir);
    expect(rasters).toEqual([]);
  });

  it("references no /images/ path from any source file", () => {
    const offenders = source.filter((f) => /["'`]\/images\//.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("takes no per-page alt string for an illustration", () => {
    // `imageSrc` + `imageAlt` as a prop pair is the shape that let a page
    // describe a picture it was not showing. The replacement passes an `art`
    // name and the caption travels with the drawing.
    const offenders = source.filter((f) => /\bimageAlt\b|\bimageSrc\b/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe("the card carries no payment-scheme mark", () => {
  it("names no card network anywhere in app, components or lib", () => {
    // The homepage sold a "Marsa Mastercard" — a trademark, on a product with
    // no issuer, no BIN and no scheme agreement. `components/art/` is exempt
    // because it *explains* the removal; the check is on rendered strings.
    const scheme = /\b(mastercard|visa|american express|amex|maestro|unionpay)\b/i;
    const offenders = source
      .filter((f) => !f.includes(`art${path.sep}`))
      .filter((f) => scheme.test(read(f)));
    expect(offenders).toEqual([]);
  });
});
