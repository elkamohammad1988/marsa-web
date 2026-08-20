import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * A control that is disabled must be disabled for every input device.
 *
 * `/blog`'s pagination shipped its Previous and Next controls as
 *
 *     <Link href="#" aria-disabled className="pointer-events-none opacity-50">
 *
 * on the pages where they had nowhere to go. That is disabled for exactly one
 * input device. `pointer-events-none` stops a mouse. `opacity-50` is a
 * suggestion to the eye. `aria-disabled` is an announcement — it tells a
 * screen reader the control is unavailable and removes nothing, by design.
 *
 * What none of the three does is take the anchor out of the tab order, because
 * what puts it there is the `href`. So a keyboard reader on page 1 reached
 * "Previous", pressed Enter, and navigated to `#` — losing their scroll
 * position and their place in the list, with nothing on screen to explain it.
 * It was found by driving the page with a keyboard rather than by reading it,
 * which is the only way this class of defect shows up: every automated gate the
 * repository had was green, and the markup is valid.
 *
 * `/admin`'s pagination never had the bug — it renders the control only when
 * there is a page to go to. So this is a guard on the rule the codebase already
 * followed everywhere except one file, written as a lint from source in the
 * style of `tests/nested-anchors.test.ts`, for the same reason: there is no DOM
 * renderer here, and the mistake is legible in the JSX without one.
 *
 * The rule: an anchor is either a link with somewhere real to go, or it is not
 * an anchor. There is no third state where it keeps its `href` and is made
 * inert by presentation.
 */

const ROOT = process.cwd();
const SCANNED = ["app", "components"];

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
 * Source with its comments removed.
 *
 * A lint reads code, not prose. Without this, a file that *documents* the
 * mistake — quoting the old markup in the comment explaining why it is gone —
 * fails the check it exists to describe, and the only way to keep the suite
 * green is to stop writing the explanation down. That is the wrong incentive
 * for a repository whose comments carry this much of its reasoning.
 *
 * Block comments first, then line comments. `//` inside a string literal is
 * rare in JSX and would only ever cost a false *pass* on that one line, never
 * a false failure.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const files = SCANNED.flatMap(sourceFiles).map((rel) => ({
  rel: rel.replaceAll("\\", "/"),
  source: withoutComments(readFileSync(path.join(ROOT, rel), "utf8")),
}));

describe("no anchor is a link to nowhere", () => {
  /**
   * `#` is the href of a control that was never wired up, and of one that was
   * deliberately deactivated. Neither belongs in a shipped page: the first is
   * unfinished and the second should not be an anchor. A same-page fragment
   * target is written `#section-id` and is unaffected.
   */
  it("no component renders href=\"#\"", () => {
    const offenders = files
      .filter(({ source }) => /href=(?:"#"|'#'|\{["'`]#["'`]\})/.test(source))
      .map(({ rel }) => rel);

    expect(offenders, `href="#" is a link that goes nowhere: ${offenders.join(", ")}`).toEqual([]);
  });
});

describe("no control is disabled by presentation alone", () => {
  /**
   * The failing combination, stated as such: an element that is both an anchor
   * and declared unavailable. `aria-disabled` on a `<button>` is a legitimate
   * pattern — a button carries its own `disabled` semantics and leaves the
   * focus ring where a reader can find it — so the check is scoped to anchors.
   */
  it("no anchor carries aria-disabled", () => {
    const offenders: string[] = [];

    for (const { rel, source } of files) {
      // Each opening tag, so the two attributes must occur on the *same*
      // element rather than merely in the same file.
      for (const tag of source.match(/<(?:a|Link)\b[^>]*>/g) ?? []) {
        if (/aria-disabled/.test(tag)) offenders.push(`${rel}: ${tag.slice(0, 80)}`);
      }
    }

    expect(
      offenders,
      `aria-disabled announces a state it does not enforce; an anchor with an href ` +
        `stays in the tab order however it is styled:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });

  it("no anchor is made inert with pointer-events-none", () => {
    const offenders: string[] = [];

    for (const { rel, source } of files) {
      for (const tag of source.match(/<(?:a|Link)\b[^>]*>/g) ?? []) {
        if (/pointer-events-none/.test(tag)) offenders.push(`${rel}: ${tag.slice(0, 80)}`);
      }
    }

    expect(
      offenders,
      `pointer-events-none disables the mouse and nothing else — keyboard ` +
        `activation still follows the href:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

describe("pagination renders its ends as text, not as dead links", () => {
  const source = withoutComments(
    readFileSync(path.join(ROOT, "components/sections/Pagination.tsx"), "utf8"),
  );

  it("has a non-anchor branch for a step with nowhere to go", () => {
    expect(source).toMatch(/<span\b/);
  });

  it("gives every numbered page a real destination", () => {
    // `href(n)` is the only thing that builds a page URL, and it is total: it
    // answers for every n. There is no branch in which a number renders
    // without one.
    expect(source).toMatch(/const href = \(n: number\) =>/);
    expect(source).not.toMatch(/href=\{[^}]*\?[^}]*:\s*["'`]#/);
  });
});
