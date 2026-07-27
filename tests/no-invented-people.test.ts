import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import sitemap from "@/app/sitemap";

/**
 * Nobody has said anything about this product, because nobody has used it.
 *
 * Nine pages carried a testimonial — a quotation attributed to a named person
 * with a job title and a city. *"I got a Netherlands IBAN in one day and
 * finally unblocked my Amazon DE payouts" — Diana V., Amazon FBA Seller,
 * Madrid.* Three pages ran the same quote from the same invented "Marco P.",
 * which is the detail that gives the game away: they were filler, written to
 * fill a section, and a reader who visits two pages sees it.
 *
 * A fabricated endorsement is a different order of thing from an optimistic
 * product claim. A claim describes a hypothetical product; an endorsement
 * asserts that a real person had a real experience. On a site whose argument is
 * that its claims are checkable, it is the single most expensive sentence type
 * available.
 *
 * The careers page went with them: five open roles, five "Apply" buttons, and a
 * benefits list (equity, private health cover, 26 days holiday) for a company
 * that does not exist. There is no honest version of that page — a concept
 * build has no roles to fill — so it is gone rather than reworded.
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

const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("no invented people", () => {
  it("has no testimonial component to render one with", () => {
    expect(existsSync(path.join(ROOT, "components", "sections", "Testimonial.tsx"))).toBe(false);
  });

  it("attributes no quotation to a named individual", () => {
    // The prop shape rather than the strings: a new quote would arrive with an
    // `authorName`, whatever it said.
    const offenders = files.filter((f) => /\bauthorName\b|\bauthorTitle\b|<Testimonial\b/.test(read(f)));
    expect(offenders).toEqual([]);
  });

  it("advertises no roles", () => {
    expect(existsSync(path.join(ROOT, "app", "company", "careers"))).toBe(false);
    const offenders = files.filter((f) => /\/company\/careers/.test(read(f)));
    expect(offenders).toEqual([]);
  });
});

describe("the sitemap describes routes that exist", () => {
  // The careers deletion had three separate consequences — the route, the
  // footer link, and a sitemap entry — and only the first two are visible while
  // clicking around. A sitemap advertising a 404 to crawlers is the one that
  // rots silently, so it is asserted rather than remembered.
  const urls = sitemap().map((e) => new URL(e.url).pathname);

  it.each(urls)("%s resolves to a page file", (pathname) => {
    if (pathname.startsWith("/blog/") && pathname !== "/blog") {
      // Served by the [slug] dynamic segment.
      expect(existsSync(path.join(ROOT, "app", "blog", "[slug]", "page.tsx"))).toBe(true);
      return;
    }
    const segments = pathname.split("/").filter(Boolean);
    expect(existsSync(path.join(ROOT, "app", ...segments, "page.tsx"))).toBe(true);
  });

  it("lists no path twice", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});
