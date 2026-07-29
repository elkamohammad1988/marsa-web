import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * The two error boundaries, and the properties that make them work.
 *
 * `app/error.tsx` renders *inside* the root layout, which means it cannot
 * catch a failure in the root layout itself — the fonts, the navbar, the
 * JSON-LD, `siteConfig`. Without `app/global-error.tsx` that class of failure
 * reaches the visitor as the browser's own error page: unstyled, unbranded,
 * no way back. It was absent.
 *
 * `global-error.tsx` has two requirements that are easy to get wrong and
 * silent when you do, because the file only renders when something is already
 * broken and nobody is watching:
 *
 * 1. It **replaces** the root layout rather than nesting inside it, so it must
 *    supply its own `<html>` and `<body>`.
 * 2. It must not import the thing that might have broken. The palette lives in
 *    a stylesheet imported by the failed layout, so a Tailwind class like
 *    `bg-canvas` would render an unstyled white page at exactly the wrong
 *    moment. Its colours are inline literals for that reason — the one place
 *    in this repository where a hard-coded colour is correct.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

/**
 * Source with comments removed.
 *
 * `error.tsx` now *explains* the phrase it stopped rendering, and a naive scan
 * would count the explanation as the offence — the same trap
 * `tests/navigation.test.ts` hit when those components began documenting the
 * ARIA roles they no longer use.
 */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("global-error.tsx", () => {
  const rel = path.join("app", "global-error.tsx");

  it("exists", () => {
    expect(existsSync(path.join(ROOT, rel))).toBe(true);
  });

  const src = read(rel);

  it("is a client component", () => {
    // Error boundaries receive `reset` and run an effect; both require it.
    expect(src.slice(0, 40)).toMatch(/^["']use client["']/);
  });

  it("supplies its own document shell", () => {
    // It replaces the root layout, so nothing else will.
    expect(src).toMatch(/<html\b/);
    expect(src).toMatch(/<body\b/);
    expect(src).toMatch(/lang=/);
  });

  it("imports no component or stylesheet that could be the failure", () => {
    // Anything from components/ or styles/ is exactly what may have thrown.
    // `lib/observability` is allowed: reporting the error is the point, and it
    // is dependency-free by design.
    const imports = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    const forbidden = imports.filter(
      (i) => i.includes("components/") || i.includes("styles/") || i.includes("next/font"),
    );
    expect(forbidden).toEqual([]);
  });

  it("uses no Tailwind class for colour or layout", () => {
    // `className=` at all would mean depending on a stylesheet that is gone.
    expect(src).not.toMatch(/className=/);
  });

  it("reports through the observability seam, tagged as a shell failure", () => {
    expect(src).toMatch(/captureException/);
    expect(src).toMatch(/app\.render\.root/);
  });

  it("offers both a retry and a way out", () => {
    expect(src).toMatch(/onClick=\{reset\}/);
    expect(src).toMatch(/href="\/"/);
  });
});

describe("error.tsx", () => {
  const src = code(path.join("app", "error.tsx"));

  it("promises no support team", () => {
    // There is no team, and the contact form reaches nobody — the same
    // correction made to the /company CTAs in #26.
    expect(src).not.toMatch(/support team/i);
    expect(src).not.toMatch(/we('| wi)ll (get back|be in touch|email)/i);
  });

  it("surfaces the digest, so a report resolves to one server log line", () => {
    expect(src).toMatch(/error\.digest/);
    expect(src).toMatch(/captureException/);
  });
});
