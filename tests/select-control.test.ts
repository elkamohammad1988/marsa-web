import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * There is one way to build a select, and it is a real `<select>`.
 *
 * Five of them shipped with no `appearance-none` at all — `CurrencyConverter`
 * ×2, `FxCalculator` ×2, `DemoFlow` ×1. A bare select is painted by the
 * operating system rather than by this stylesheet, so on Windows Chrome each
 * one rendered as a light-grey chip with a black chevron sitting inside the
 * darkest surface on the page. It was the most obviously un-designed element on
 * the site and it sat in the middle of the flagship tool, which is the part of
 * the failure worth remembering: nothing was broken, no gate could see it, and
 * it was only ever visible to someone opening the page on the right OS.
 *
 * The fix is `components/ui/Select.tsx`. What this file defends is not "those
 * five are styled now" but that the next one cannot arrive unstyled — and that
 * the wrapper keeps being a wrapper. Replacing the native control with a
 * `role="listbox"` would cost type-ahead, the mobile wheel picker, and correct
 * screen-reader announcement, all to change a chevron.
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

/** The one component allowed to render the element itself. */
const IMPLEMENTATION = path.join("components", "ui", "Select.tsx");

/**
 * Source with comments removed. Every prose block in this codebase explains the
 * defect it replaced, so a scan for the defect's own text finds the explanation
 * and reports the fix as the bug — `Select.tsx` names both `role="listbox"` and
 * the old baked-in `stroke='%23…'` in the course of saying why it uses neither.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const source = stripComments(readFileSync(path.join(ROOT, IMPLEMENTATION), "utf8"));
const css = readFileSync(path.join(ROOT, "styles", "globals.css"), "utf8");

const files = [...sourceFiles("app"), ...sourceFiles("components")].filter(
  (f) => f !== IMPLEMENTATION,
);

describe("every select on the site is the site's select", () => {
  it("finds the source files to check", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("renders no bare <select> anywhere else", () => {
    const offenders = files.filter((file) =>
      /<select[\s/>]/.test(stripComments(readFileSync(path.join(ROOT, file), "utf8"))),
    );
    expect(offenders, `bare <select> outside ${IMPLEMENTATION}`).toEqual([]);
  });

  it("is actually used, so the rule above is not vacuous", () => {
    const importers = files.filter((file) =>
      readFileSync(path.join(ROOT, file), "utf8").includes('from "@/components/ui/Select"'),
    );
    expect(importers.length).toBeGreaterThanOrEqual(4);
  });
});

describe("the wrapper keeps everything the native control gives", () => {
  it("wraps a native <select> rather than reimplementing one", () => {
    expect(source).toMatch(/<select\b/);
    // The tell of a hand-rolled listbox, which would have to re-earn keyboard
    // semantics, type-ahead and the mobile picker one bug at a time.
    expect(source).not.toMatch(/role="listbox"/);
  });

  it("forwards its ref and its props to that element", () => {
    // A select that cannot be labelled, named, or read by a form library is a
    // decoration. Both are how it stays a form control.
    expect(source).toMatch(/forwardRef</);
    expect(source).toMatch(/<select ref=\{ref\}[^>]*\{\.\.\.props\}/);
  });

  it("removes the OS paint and nothing else", () => {
    expect(source).toMatch(/appearance-none/);
  });

  it("paints the popup too, which CSS alone cannot reach", () => {
    // The open list is drawn by the browser, and `color-scheme` is the only
    // declaration that reaches it. Without this the field is dark and the menu
    // it opens is white.
    expect(css).toMatch(/color-scheme:\s*dark/);
  });
});

describe("the chevron follows the palette and never blocks the control", () => {
  it("is a real element taking currentColor, not a coloured data URI", () => {
    expect(source).toMatch(/<IconChevronDown/);
    // The regression this replaced: `stroke='%235B6478'` baked into a
    // background-image — a slate blue-grey from a light theme this site no
    // longer has, unreachable by any token.
    const styling = [IMPLEMENTATION, path.join("components", "forms", "fields.tsx")];
    for (const file of styling) {
      const text = stripComments(readFileSync(path.join(ROOT, file), "utf8"));
      expect(text, `${file} still paints a chevron with a baked-in colour`).not.toMatch(
        /stroke='%23/,
      );
    }
  });

  it("is hidden from assistive technology", () => {
    expect(source).toMatch(/aria-hidden="true"/);
  });

  it("cannot swallow the click that opens the menu", () => {
    // It sits on top of the control by construction, so this is the whole
    // reason it is safe to put it there.
    expect(source).toMatch(/pointer-events-none/);
  });
});
