import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * A horizontally scrollable panel must be reachable by keyboard.
 *
 * `overflow-x-auto` on a div scrolls with a wheel or a finger and with nothing
 * else. Unless a child takes focus — and a table of plain text has no child
 * that does — everything past the right edge is content that exists for
 * pointer users and does not exist for anyone navigating by keyboard. axe
 * calls this `scrollable-region-focusable` and rates it *serious*; it was live
 * on `/tools/sepa-vs-swift` at 390px, where the 640px comparison grid starts
 * to scroll, and it was invisible to every gate because the desktop pass never
 * makes the region scroll at all.
 *
 * The fix is `components/ui/ScrollRegion.tsx`. This lint is what stops the
 * next table from arriving as a bare div: the property being defended is not
 * "the two current tables are fixed" but "there is one way to build one".
 *
 * `whitespace-pre-wrap` is exempt — it wraps instead of scrolling, so the
 * overflow class is a belt with no trousers rather than a keyboard trap.
 */

const ROOT = process.cwd();

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (entry.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

/** The one component allowed to declare horizontal scrolling. */
const IMPLEMENTATION = path.join("components", "ui", "ScrollRegion.tsx");

const files = [...sourceFiles("app"), ...sourceFiles("components")].filter(
  (f) => f !== IMPLEMENTATION,
);

/** Each JSX opening tag in `source`, as raw text. */
function openingTags(source: string): string[] {
  return [...source.matchAll(/<[a-zA-Z][^<>]*>/g)].map((m) => m[0]);
}

describe("every horizontal scroll container is keyboard-reachable", () => {
  it("finds the source files to check", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("%s", (file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const offenders = openingTags(source).filter(
      (tag) =>
        /\boverflow-x-auto\b/.test(tag) &&
        !/\bwhitespace-pre-wrap\b/.test(tag) &&
        !/\btabIndex\b/.test(tag),
    );
    expect(offenders.map((t) => t.slice(0, 120))).toEqual([]);
  });
});

describe("the escape hatch exists and is named", () => {
  const source = readFileSync(path.join(ROOT, IMPLEMENTATION), "utf8");

  it("puts the region in the tab order", () => {
    expect(source).toMatch(/tabIndex=\{0\}/);
  });

  it("gives the stop a role and a name, so focus landing there means something", () => {
    expect(source).toMatch(/role="region"/);
    expect(source).toMatch(/aria-label=\{label\}/);
  });

  it("shows a focus ring, since a div has no default one", () => {
    expect(source).toMatch(/focus-visible:ring-2/);
  });
});
