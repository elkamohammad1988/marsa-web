import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * An anchor may not contain another anchor.
 *
 * `/blog` shipped a featured card that was a `<Link>` wrapping a
 * `<Button href>` pointing at the same post. That is invalid HTML, and the
 * failure mode is worse than it sounds: the browser repairs the nesting by
 * closing the outer `<a>` early, so the DOM it builds no longer matches the
 * markup the server sent, React discards the entire tree and re-renders it on
 * the client, and the page flashes. None of the existing gates saw it —
 * `tsc` and ESLint have nothing to say about nesting, the server render is
 * valid on its own, and the descriptive React warning appears only in a
 * development build, where a CSP without `'unsafe-eval'` had been preventing
 * React's development bundle from running at all.
 *
 * So this asserts the property directly, from source. It is a lint rather than
 * a render test: the repository has no DOM renderer, and the mistake is
 * visible in the JSX without one.
 *
 * The check is deliberately narrow — a `<Link>` or `<a>` opening tag whose
 * balanced subtree contains something that renders another anchor. The
 * components that render an `<a>` are listed below and must be kept current;
 * `Button` does so only when given an `href`, which is why the pattern looks
 * for the prop rather than the name.
 */

const ROOT = process.cwd();

/** JSX that renders an `<a>`: a real anchor, a Link, or a Button with href. */
const ANCHOR_OPENERS = [/<a[\s>]/, /<Link[\s>]/, /<Button\b[^>]*\bhref[=\s]/];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = path.join(dir, entry);
    if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...sourceFiles(rel));
    else if (entry.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

/**
 * Find each `<Link>`/`<a>` element and return the source of its children.
 *
 * Balanced by tag depth rather than by regex, so a card containing several
 * nested `<div>`s is followed correctly to its real closing tag.
 */
function anchorSubtrees(source: string): string[] {
  const subtrees: string[] = [];
  const opener = /<(Link|a)(\s[^>]*)?>/g;

  for (const match of source.matchAll(opener)) {
    const tag = match[1];
    // Self-closing elements have no children to search.
    if (match[0].endsWith("/>")) continue;

    const start = match.index + match[0].length;
    const scanner = new RegExp(`<${tag}(?:\\s[^>]*)?>|</${tag}>`, "g");
    scanner.lastIndex = start;

    let depth = 1;
    let step: RegExpExecArray | null;
    while ((step = scanner.exec(source)) !== null) {
      depth += step[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        subtrees.push(source.slice(start, step.index));
        break;
      }
    }
  }
  return subtrees;
}

const files = [...sourceFiles("app"), ...sourceFiles("components")];

describe("no anchor contains another anchor", () => {
  it("finds the source files to check", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  it.each(files)("%s", (file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    const offenders = anchorSubtrees(source).filter((subtree) =>
      ANCHOR_OPENERS.some((pattern) => pattern.test(subtree)),
    );
    expect(offenders.map((s) => s.trim().slice(0, 120))).toEqual([]);
  });
});

describe("the escape hatch exists", () => {
  it("Button exports a non-interactive label for use inside a clickable card", () => {
    // Without this, the only way to get the button's appearance inside a card
    // is `<Button href>`, which is what caused the bug. The fix has to leave a
    // correct option in place, not just remove the incorrect one.
    const button = readFileSync(path.join(ROOT, "components", "ui", "Button.tsx"), "utf8");
    expect(button).toMatch(/export function ButtonLabel/);
    expect(button).toMatch(/<span className=/);
  });
});
