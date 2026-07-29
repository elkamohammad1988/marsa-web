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

/**
 * 4. **A colour utility naming a token the palette does not define.**
 *
 * The rebrand left `brand.blue`, `brand["blue-deep"]` and `brand["blue-soft"]`
 * in the Tailwind config "for zero-churn" — but seven places in the source had
 * already been written as `bg-brand-soft/25`, `text-brand-soft` and
 * `hover:border-brand-soft/40`. There was no `brand.soft` key, so Tailwind
 * emitted nothing for any of them: the hero and corridor aurora glows, the
 * CTA glow, two status dots and the corridor eyebrow were all rendering with
 * no colour, and had been since the rename.
 *
 * Nothing caught it. Tailwind does not warn on an unknown utility, `tsc` and
 * ESLint never see class strings, and the elements were decorative enough that
 * their absence read as a design choice. The only visible symptom was a
 * slightly flatter page than the one that had been designed.
 *
 * So: every colour utility in the source must name a colour the config
 * actually defines. Parsed from `tailwind.config.ts` rather than hard-coded,
 * so adding a token to the palette is all it takes to use it.
 */
describe("every colour utility resolves to a defined token", () => {
  const config = readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");

  /** Colour names Tailwind will accept, derived from the config's `colors`. */
  const defined = (() => {
    const names = new Set<string>();
    // Bounded to the `colors` block. Reading to the end of the file also
    // swept up `keyframes` and `animation` names — `fade-in`, `aurora-a`,
    // `shimmer` — which would then have counted as palette roots and made
    // `shadow-glow-sm` look like a colour utility.
    const start = config.indexOf("colors: {");
    const end = config.indexOf("\n      letterSpacing:", start);
    const colours = config.slice(start, end === -1 ? undefined : end);
    let group: string | null = null;
    for (const line of colours.split("\n")) {
      const nested = line.match(/^\s{8}"?([a-z-]+)"?:\s*\{/);
      if (nested) {
        group = nested[1];
        names.add(group);
        continue;
      }
      if (/^\s{8}\}/.test(line)) {
        group = null;
        continue;
      }
      // Digits belong in a key name: `alt-2`, `tint-2` and `deep-2` are all
      // real tokens, and a `[A-Za-z-]` class silently skipped every one.
      const leaf = line.match(/^\s{8,10}"?([A-Za-z0-9-]+)"?:\s*withAlpha/);
      if (!leaf) continue;
      const key = leaf[1];
      if (group) names.add(key === "DEFAULT" ? group : `${group}-${key}`);
      else names.add(key);
    }

    // `backgroundImage` keys are reachable through `bg-`, so `bg-brand-gradient`
    // is a real utility even though `brand-gradient` is not a colour.
    const images = config.slice(config.indexOf("backgroundImage: {"));
    for (const line of images.split("\n")) {
      if (/^\s{6}\}/.test(line)) break;
      const key = line.match(/^\s{8}"?([A-Za-z0-9-]+)"?:/);
      if (key) names.add(key[1]);
    }
    return names;
  })();

  /** The palette roots — utilities on any other colour are Tailwind's own. */
  const roots = [...defined].map((n) => n.split("-")[0]);

  const PROPERTIES =
    "bg|text|border|ring|ring-offset|from|to|via|fill|stroke|decoration|outline|caret|accent|divide|placeholder";

  const pattern = new RegExp(`\\b(?:${PROPERTIES})-([a-z][a-z0-9-]*)`, "g");

  it("parses a palette out of the config", () => {
    expect(defined.has("brand")).toBe(true);
    expect(defined.has("brand-soft")).toBe(true);
    expect(defined.has("surface-deep")).toBe(true);
    expect(defined.has("fade-in")).toBe(false);
    expect(defined.size).toBeGreaterThan(15);
  });

  it("actually detects an undefined token", () => {
    // The first version of this shipped with `\b` inside a template literal —
    // a backspace character, not a word boundary — so the pattern matched
    // nothing and every file passed. A guard that cannot fail is worse than
    // no guard, because it also reports success.
    const found = [...'className="bg-brand-bogus"'.matchAll(pattern)].map((m) => m[1]);
    expect(found).toEqual(["brand-bogus"]);
    expect(defined.has("brand-bogus")).toBe(false);
    expect(roots.includes("brand")).toBe(true);
  });

  const files = [...sourceFiles("app"), ...sourceFiles("components")];

  it.each(files)("%s", (file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const used = new Set<string>();
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      // Only judge names inside this palette; `bg-white`, `text-xs`,
      // `border-2` and friends belong to Tailwind's own scales.
      if (roots.includes(name.split("-")[0])) used.add(name);
    }
    const unresolved = [...used].filter((name) => !defined.has(name));
    expect(unresolved).toEqual([]);
  });
});
