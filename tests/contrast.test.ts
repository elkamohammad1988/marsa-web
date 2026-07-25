import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Audit finding F2: every form error message rendered in `text-red-600`
 * (#DC2626), which computes to 4.04:1 on `--card` and 4.12:1 on `--canvas`.
 * The text is 12px and 14px, so the 4.5:1 AA threshold applies with no
 * large-text exemption. That is the one string a user must read to recover
 * from a failed submission, and it was the least readable text on the page.
 *
 * F3 compounded it: the IBAN checker's failure panel used `bg-red-50`
 * (#FEF2F2, near-white) on a site whose surfaces are #0C080B and #140A10.
 *
 * These tests compute real WCAG 2.x contrast ratios from the token values in
 * `styles/globals.css` rather than asserting class names, so they fail if
 * someone later darkens `--danger` or lightens a surface — the outcome a user
 * experiences, not the spelling of a utility class.
 *
 * README.md's "0 axe violations across 29 routes" never covered this: error
 * states only render after a failed submit, so an automated crawl never sees
 * them.
 */

const ROOT = process.cwd();

/** WCAG 2.x relative luminance for an sRGB triplet in 0–255. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/** Read the space-separated RGB custom properties out of the `:root` block. */
function readTokens(): Map<string, [number, number, number]> {
  const css = readFileSync(path.join(ROOT, "styles", "globals.css"), "utf8");
  const root = css.slice(css.indexOf(":root"));
  const tokens = new Map<string, [number, number, number]>();
  for (const match of root.matchAll(/--([a-z0-9-]+):\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/g)) {
    const [, name, r, g, b] = match;
    if (!tokens.has(name)) tokens.set(name, [Number(r), Number(g), Number(b)]);
  }
  return tokens;
}

/** WCAG AA for text below 18.66px. */
const AA_NORMAL_TEXT = 4.5;

describe("error text is readable on every surface it renders on", () => {
  const tokens = readTokens();
  const danger = tokens.get("danger");
  const surfaces = ["card", "canvas"] as const;

  it("defines the tokens the assertions depend on", () => {
    expect(danger, "--danger").toBeDefined();
    for (const name of surfaces) expect(tokens.get(name), `--${name}`).toBeDefined();
  });

  it.each(surfaces)("--danger meets AA on --%s", (surface) => {
    const ratio = contrastRatio(danger!, tokens.get(surface)!);
    expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("would have caught the colour it replaced", () => {
    // #DC2626 — Tailwind's red-600, the value every error message used.
    const red600: [number, number, number] = [0xdc, 0x26, 0x26];
    for (const surface of surfaces) {
      expect(
        contrastRatio(red600, tokens.get(surface)!),
        `red-600 on --${surface}`,
      ).toBeLessThan(AA_NORMAL_TEXT);
    }
  });
});

describe("the design tokens are not escaped for failure states", () => {
  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(path.join(ROOT, dir))) {
      const rel = path.join(dir, entry);
      const full = path.join(ROOT, rel);
      if (statSync(full).isDirectory()) out.push(...sourceFiles(rel));
      else if (/\.tsx?$/.test(entry)) out.push(rel);
    }
    return out;
  }

  const files = [...sourceFiles("app"), ...sourceFiles("components")];

  it("finds source files to scan", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("uses no raw Tailwind red-* utility anywhere", () => {
    // The palette already carries the right token. Reaching past it is how
    // F2 and F3 happened, and it is invisible in review.
    const offenders = files.filter((f) =>
      /\b(text|bg|border|ring|from|to|via)-red-\d{2,3}\b/.test(readFileSync(path.join(ROOT, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("uses no `dark:` variant, which cannot render on a dark-only palette", () => {
    // `.dark` is an exact mirror of `:root`, so a `dark:` variant is either a
    // no-op or, for a visitor whose OS prefers light, unreachable — which is
    // how two error messages kept the failing red-600 base value (F8).
    const offenders = files.filter((f) =>
      /\bdark:/.test(readFileSync(path.join(ROOT, f), "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
