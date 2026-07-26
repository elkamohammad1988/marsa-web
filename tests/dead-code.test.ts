import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Guards against the three shapes of dead code this repository has actually
 * grown, rather than against dead code in the abstract.
 *
 * 1. **A second theme that is a copy of the first.** `styles/globals.css` used
 *    to carry a `.dark` block declaring all 30 custom properties to the same
 *    values as `:root`, plus a pre-paint script in `app/layout.tsx` whose only
 *    job was to add that class. The loop could not change a rendered colour.
 *    It survived because it *looked* load-bearing: the audit's CSP finding
 *    reasoned about hashing "the inline theme script", and two error messages
 *    kept a failing `red-600` in an unreachable `dark:` variant (F2/F8).
 *
 * 2. **Exported components nobody imports.** `ThemeToggle` was deleted in the
 *    same batch as F8; the `IconSun` and `IconMoon` it used were not, and
 *    `IconCheck` and `IconArrowRight` had never had a caller. Four SVGs in the
 *    bundle graph that no route could reach.
 *
 * 3. **Inline script in the document head.** Nothing needs one now. Reaching
 *    for one again is the change that would quietly re-justify
 *    `'unsafe-inline'` in the CSP, so it is worth noticing.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

describe("the palette has exactly one theme", () => {
  const css = read(path.join("styles", "globals.css"));

  it("declares every design token exactly once", () => {
    // A token declared twice means a second palette — which is either a real
    // light theme (fine, but it would need its own contrast assertions) or a
    // mirror of the first (dead weight that reads as configurable).
    const counts = new Map<string, number>();
    for (const [, name] of css.matchAll(/(--[a-z0-9-]+):\s*[^;]+;/g)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const duplicated = [...counts].filter(([, n]) => n > 1).map(([name]) => name);
    expect(duplicated).toEqual([]);
  });

  it("has no `.dark` selector left to mirror it", () => {
    expect(css).not.toMatch(/^\s*\.dark\s*\{/m);
  });

  it("still tells the browser which scheme its own UI should match", () => {
    // Removing the mirror must not remove this: without it, native selects,
    // scrollbars and autofill render light on a black page.
    expect(css).toMatch(/color-scheme:\s*dark/);
  });
});

describe("the document shell carries no inline script", () => {
  const layout = read(path.join("app", "layout.tsx"));

  it("does not inject script source into the head", () => {
    expect(layout).not.toContain("dangerouslySetInnerHTML");
  });

  it("does not suppress hydration warnings on <html>", () => {
    // That attribute existed only because the deleted script mutated the class
    // list before React hydrated. Keeping it would hide real mismatches.
    expect(layout).not.toContain("suppressHydrationWarning");
  });
});

describe("every exported icon has a caller", () => {
  const iconModule = path.join("components", "icons", "index.tsx");
  const exported = [...read(iconModule).matchAll(/^export function (\w+)/gm)].map((m) => m[1]);

  const consumers = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")]
    .filter((f) => f !== iconModule)
    .map((f) => read(f))
    .join("\n");

  it("finds the icon exports to check", () => {
    expect(exported.length).toBeGreaterThan(10);
  });

  it.each(exported)("%s is referenced outside its own module", (name) => {
    expect(new RegExp(`\\b${name}\\b`).test(consumers)).toBe(true);
  });
});
