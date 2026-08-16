import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Two properties about headings that no other gate can see.
 *
 * **1. A font size may not be passed to `<Heading>` through `className`.**
 *
 * `Heading` picks a type step from its `level`, and `cn` concatenates class
 * lists rather than merging them. So a caller writing
 * `<Heading level="h1" className="text-2xl md:text-3xl">` shipped an element
 * carrying *both* sizes, and which one won was decided by the order Tailwind
 * happened to emit them in — not by the order they appear in the attribute.
 *
 * Tailwind emitted `.text-display-sm` after `.text-2xl` and before the `md:`
 * variants, so `/login`, `/register`, `/forgot-password`, `/reset-password`,
 * `/verify-email`, `/account` and `/account/admin` all rendered their `<h1>`
 * at **33.6px on a phone and 28px on a desktop** — the heading got smaller as
 * the screen got larger. Every class in the attribute was real, the markup was
 * valid, and typecheck, lint and 1,561 tests were green.
 *
 * The fix was to name the step (`size="panel"`) rather than to fight the one
 * `level` chose. This holds the door shut: `size` is the way to change how big
 * a heading is, and `className` stays for everything that is not a size.
 *
 * **2. Every page renders a top-level heading.**
 *
 * `/admin`, `/admin/login` and `/admin/funnel` each opened with an `<h3>` and
 * no `<h1>` above it, so the operator area had no document title in its own
 * markup — a screen reader landing there got a page whose outline began three
 * levels down. The public site had exactly one `<h1>` on all 31 routes, which
 * is why nothing flagged it: the defect was confined to the three pages behind
 * the password.
 *
 * A page satisfies this by carrying an `<h1>` itself or by rendering a
 * component that does. That set is *computed* from the components rather than
 * listed here, so a new shell that provides a heading works without editing
 * this test, and a shell that stops providing one fails it.
 */

const ROOT = process.cwd();

function sourceFiles(dir: string, ext = ".tsx"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel, ext));
    else if (entry.endsWith(ext)) out.push(rel);
  }
  return out;
}

/**
 * Tailwind font-size utilities, optionally with a responsive/state prefix.
 *
 * Named explicitly rather than matched as `text-*` because most `text-`
 * utilities on a heading are legitimate — `text-white`, `text-ink`,
 * `text-brand-strong`, `text-balance`, `text-center`, `text-gradient-hero`.
 * Only the ones that set `font-size` conflict with the type step.
 */
const FONT_SIZE = new RegExp(
  String.raw`(?:^|\s)(?:[a-z0-9-]+:)*text-(?:xs|sm|base|lg|[2-9]?xl|display|display-sm|\[[^\]]*(?:px|rem|em|pt|vw)\])(?:\s|$)`,
);

const componentFiles = sourceFiles("components");
const pageFiles = sourceFiles("app").filter((f) => path.basename(f) === "page.tsx");

/** Every `<Heading ...>` opening tag in a source file. */
function headingTags(source: string): string[] {
  return [...source.matchAll(/<Heading\b[^>]*>/g)].map((m) => m[0]);
}

/** The `className="..."` literal on a tag, if it has a static one. */
function classNameOf(tag: string): string | null {
  return /className="([^"]*)"/.exec(tag)?.[1] ?? null;
}

describe("a font size is never passed to <Heading> through className", () => {
  const files = [...pageFiles, ...componentFiles];

  it("finds the source files to check", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it.each(files)("%s", (file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const offenders = headingTags(source)
      .filter((tag) => {
        const cls = classNameOf(tag);
        return cls !== null && FONT_SIZE.test(cls);
      })
      .map((tag) => tag.replace(/\s+/g, " ").slice(0, 140));
    expect(offenders).toEqual([]);
  });
});

describe("Heading keeps size separable from level", () => {
  const source = readFileSync(path.join(ROOT, "components", "ui", "Heading.tsx"), "utf8");

  it("accepts a size prop", () => {
    // Without this the only way to resize a heading is the className route the
    // test above forbids, which would leave callers with no correct option.
    expect(source).toMatch(/size\?:\s*Size/);
  });

  it("draws the step named by size, falling back to level", () => {
    expect(source).toMatch(/sizes\[size \?\? level\]/);
  });

  it("still emits the tag named by level", () => {
    expect(source).toMatch(/case "h1":[\s\S]*?<h1/);
  });
});

describe("every page provides a top-level heading", () => {
  /**
   * A source that renders an `<h1>`, however it spells it.
   *
   * The third form is the one that is easy to miss: `CurrencyConverter` takes
   * a `headingLevel` prop defaulting to `"h1"` and renders it as a dynamic tag
   * (`const HeadingTag = headingLevel`), so the string `<h1` never appears in
   * its source at all. A page embedding it under another heading passes
   * `headingLevel="h2"`, which is handled at the call site below.
   */
  const providesH1 = (source: string) =>
    /<h1[\s>]/.test(source) ||
    /level="(?:h1|display)"/.test(source) ||
    /headingLevel\s*=\s*"h1"/.test(source);

  /**
   * Components that provide the `<h1>` for the pages rendering them —
   * computed, so this survives a new shell being written.
   */
  const shells = componentFiles
    .filter((f) => providesH1(readFileSync(path.join(ROOT, f), "utf8")))
    .map((f) => path.basename(f, ".tsx"))
    // `Heading` itself renders `<h1>`; it is the mechanism, not a page shell,
    // and treating it as one would let any page importing it pass vacuously.
    .filter((name) => name !== "Heading");

  it("finds the shells", () => {
    expect(shells.length).toBeGreaterThan(0);
  });

  it.each(pageFiles)("%s", (file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const viaShell = shells.some((name) => {
      const usage = new RegExp(`<${name}\\b[^>]*>`).exec(source);
      // A shell demoted to `h2` at the call site is embedded under another
      // heading and is no longer this page's top-level one.
      return usage !== null && !/(?:heading)?[Ll]evel="h[2-6]"/.test(usage[0]);
    });
    expect(providesH1(source) || viaShell).toBe(true);
  });
});
