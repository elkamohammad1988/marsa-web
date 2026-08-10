import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * A decoration is only allowed to cost what a decoration is worth.
 *
 * The pointer spotlight is the one effect on the site driven by a continuous
 * input stream, and every naive way to build it is expensive in a way that does
 * not show up as a bug — it shows up as a page that feels heavy on a laptop
 * trackpad, on hardware nobody testing it owns. Three properties keep it cheap,
 * and all three are the kind a later refactor removes without noticing:
 *
 *   1. **No React state.** Routing the coordinates through `useState` re-renders
 *      the card subtree at the pointer's event rate to move a gradient.
 *   2. **One listener per grid, not per card.** Delegation via `closest()`.
 *   3. **One style write per frame.** Pointer events outrun the display, so the
 *      coordinates are stashed and flushed in a single `requestAnimationFrame`.
 *
 * The fourth property is not about cost. The effect must degrade to a design:
 * with no script, no mouse, or a touch screen, `--mx`/`--my` are never written,
 * and the CSS fallbacks are what a phone sees for the entire life of the page.
 * A `var(--mx)` with no fallback would make an invalid gradient and paint
 * nothing, which is the difference between a resting state and an absence.
 */

const ROOT = process.cwd();

/**
 * Source with comments removed. `PointerGlow.tsx` names `useState` in the
 * course of explaining why it holds none, and a scan of the raw file would
 * report that explanation as the defect it describes.
 */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const source = stripComments(
  readFileSync(path.join(ROOT, "components", "ui", "PointerGlow.tsx"), "utf8"),
);
const css = readFileSync(path.join(ROOT, "styles", "globals.css"), "utf8");

/** The `.spotlight::after` declaration block — where the light is painted. */
const spotlight = (() => {
  const at = css.indexOf(".spotlight::after");
  expect(at, "no .spotlight::after rule").toBeGreaterThan(-1);
  const open = css.indexOf("{", at);
  return css.slice(open + 1, css.indexOf("}", open));
})();

describe("the spotlight costs a decoration's worth", () => {
  it("keeps the coordinates out of React entirely", () => {
    expect(source).not.toMatch(/\buseState\b/);
    // Written straight onto the node, which is the only way to move a gradient
    // without re-rendering what is drawn on top of it.
    expect(source).toMatch(/style\.setProperty\(\s*"--mx"/);
    expect(source).toMatch(/style\.setProperty\(\s*"--my"/);
  });

  it("subscribes once for a whole grid rather than once per card", () => {
    expect(source).toMatch(/onPointerMove=\{handleMove\}/);
    expect(source).toMatch(/closest\?\.\("\[data-glow\]"\)/);
  });

  it("writes at most once per frame however fast the pointer moves", () => {
    expect(source).toMatch(/requestAnimationFrame/);
    // The guard that makes it a coalescing queue instead of a scheduler with
    // one frame per event in it.
    expect(source).toMatch(/if \(frame\.current !== null\) return;/);
  });

  it("cancels a pending frame when the grid unmounts", () => {
    // Otherwise the callback fires against a detached node after navigation.
    expect(source).toMatch(/cancelAnimationFrame\(frame\.current\)/);
  });

  it("ignores touch, which has no pointer to follow", () => {
    // A `pointermove` from a finger lights whatever it scrolled past and leaves
    // it lit, under the finger that would be covering it anyway.
    expect(source).toMatch(/pointerType !== "mouse"/);
  });
});

describe("the resting state is a design, not an absence", () => {
  it("gives both coordinates a fallback, so the light has a home", () => {
    // With no script and no mouse these are the only values the gradient ever
    // gets. A bare `var(--mx)` makes the whole declaration invalid.
    expect(spotlight).toMatch(/var\(--mx,\s*[^)]+\)/);
    expect(spotlight).toMatch(/var\(--my,\s*[^)]+\)/);
  });

  it("can never intercept a click meant for the card", () => {
    expect(spotlight).toMatch(/pointer-events:\s*none/);
  });

  it("appears on focus as well as hover, so it is not mouse-only", () => {
    // Keyboard users get the same affordance; the light simply rests where the
    // fallback puts it.
    expect(css).toMatch(/\.spotlight:focus-within::after/);
  });
});
