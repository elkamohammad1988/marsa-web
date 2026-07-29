import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * An animation must never be able to cost a reader the content.
 *
 * Three defects sat behind this file, all of the same shape — a decorative
 * effect holding the only key to whether something was on screen:
 *
 *   1. `.reveal` set `opacity: 0` unconditionally, and a `useEffect` adding
 *      `.is-visible` was the only thing that ever removed it. With JavaScript
 *      off, or a bundle that failed to load, the content was invisible
 *      permanently — no error, nothing in the markup to explain it.
 *   2. The observer used `rootMargin: "0px 0px -12% 0px"`, which shrinks the
 *      observation area to the top 88% of the viewport. Anything sitting in
 *      that bottom strip on a page already scrolled to its end never
 *      intersects, so the last element on a short page could never reveal.
 *   3. The reduced-motion reset overrode `animation-duration` but not
 *      `animation-delay`. Several animations are declared `fill-mode: both`,
 *      whose `backwards` half applies the 0% keyframe — `opacity: 0` — for the
 *      whole delay. A reduced-motion reader was left looking at nothing for
 *      the length of every stagger.
 *
 * These assert the properties, not the implementation: the transition can be
 * retuned freely, but content cannot become conditional on JavaScript again.
 */

const ROOT = process.cwd();
const css = readFileSync(path.join(ROOT, "styles", "globals.css"), "utf8");
const revealSource = readFileSync(path.join(ROOT, "components", "ui", "Reveal.tsx"), "utf8");
const tailwind = readFileSync(path.join(ROOT, "tailwind.config.ts"), "utf8");

/** Every declaration block written for exactly this selector, in source order. */
function blocksFor(selector: string): string[] {
  const escaped = selector.replace(/\./g, "\\.");
  const pattern = new RegExp(`(?:^|[\\s{};])${escaped}\\s*\\{([^}]*)\\}`, "g");
  return [...css.matchAll(pattern)].map((match) => match[1]);
}

describe("content is visible without JavaScript", () => {
  const blocks = blocksFor(".reveal");

  it("finds the reveal rules to check", () => {
    expect(blocks.length).toBeGreaterThan(1);
  });

  it("starts visible, so nothing depends on an effect having run", () => {
    // The first rule is what a browser applies before — or without — any
    // script. It must paint the content.
    expect(blocks[0]).toMatch(/opacity:\s*1/);
    expect(blocks[0]).not.toMatch(/opacity:\s*0/);
  });

  it("hides the element only where scripting is available to unhide it", () => {
    const scriptingAt = css.indexOf("@media (scripting: enabled)");
    expect(scriptingAt, "no scripting media query").toBeGreaterThan(-1);

    // Every `.reveal` rule that hides the element must come after that query
    // opens. A browser that does not understand it ignores the whole block and
    // keeps the visible default, which is the safe direction to be wrong in.
    const hidden = [...css.matchAll(/(?:^|[\s{};])\.reveal\s*\{([^}]*)\}/g)].filter((m) =>
      /opacity:\s*0/.test(m[1]),
    );
    expect(hidden.length).toBeGreaterThan(0);
    for (const match of hidden) {
      expect(match.index, "a .reveal rule hides content outside the scripting query").
        toBeGreaterThan(scriptingAt);
    }
  });

  it("reveals itself even if the bundle never arrives", () => {
    // The one case the media query cannot cover: scripting enabled, script
    // absent. A CSS-only animation ends the wait without an observer.
    expect(css).toMatch(/@keyframes\s+reveal-fallback/);
    const hiddenRule = blocks.find((b) => /opacity:\s*0/.test(b));
    expect(hiddenRule).toMatch(/animation:\s*reveal-fallback/);
  });

  it("drops the fallback once the observer has done its job", () => {
    // Otherwise the animation would re-assert its own end state on top of the
    // transition, which is harmless today and a trap the moment either changes.
    const visible = blocksFor(".reveal.is-visible");
    expect(visible.length).toBeGreaterThan(0);
    expect(visible[0]).toMatch(/animation:\s*none/);
  });

  it("shows everything immediately under reduced motion", () => {
    const lastReveal = blocks[blocks.length - 1];
    expect(lastReveal).toMatch(/opacity:\s*1/);
    expect(lastReveal).toMatch(/animation:\s*none/);
    // Source order decides between two media queries of equal specificity, so
    // the reduced-motion rule has to be the later one.
    expect(css.lastIndexOf("@media (prefers-reduced-motion: reduce)")).toBeGreaterThan(
      css.indexOf("@media (scripting: enabled)"),
    );
  });
});

describe("the observer can only make content appear sooner", () => {
  it("watches the viewport exactly, with no shrinking margin", () => {
    // A negative root margin carves out a strip that content can sit in
    // forever if the page cannot scroll any further.
    expect(revealSource).toMatch(/rootMargin:\s*"0px"/);
    expect(revealSource).not.toMatch(/rootMargin:\s*"[^"]*-\s*\d/);
  });

  it("reveals on any intersection at all", () => {
    expect(revealSource).toMatch(/threshold:\s*0\b/);
  });

  it("shows the element when there is no observer to ask", () => {
    expect(revealSource).toMatch(/typeof IntersectionObserver === "undefined"/);
    expect(revealSource).toMatch(/setVisible\(true\)/);
  });
});

describe("reduced motion never leaves an element mid-animation", () => {
  it("resets the delay as well as the duration", () => {
    // The reset that was missing. `fill-mode: both` applies the 0% keyframe
    // during a delay, so overriding only the duration leaves the element in
    // that frame — for `fade-up`, `scale-in`, `step-in` and `row-in`, that
    // frame is `opacity: 0`.
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/animation-delay:\s*0\.001ms\s*!important/);
    expect(reduced).toMatch(/animation-duration:\s*0\.001ms\s*!important/);
  });

  it("is required precisely because animations fill backwards", () => {
    // If no animation used `both`/`backwards` the reset above would be
    // unnecessary. This keeps the two facts tied together, so removing the
    // last such animation is what retires the reset — not a guess.
    const fillsBackwards = /"(?:fade-up|fade-in|scale-in|step-in|row-in)":\s*"[^"]*\bboth\b/;
    expect(tailwind).toMatch(fillsBackwards);
  });

  it("starts every fill-mode animation from a state that ends visible", () => {
    // A keyframe pair that begins at `opacity: 0` must end at `opacity: 1`,
    // or the animation completing is itself a way to hide something.
    const keyframes = tailwind.slice(tailwind.indexOf("keyframes:"), tailwind.indexOf("animation:"));
    const zeroStarts = [...keyframes.matchAll(/"0%":\s*\{[^}]*opacity:\s*"0"[^}]*\}/g)];
    expect(zeroStarts.length).toBeGreaterThan(0);
    // Every one of them is followed by a 100% frame restoring full opacity.
    for (const start of zeroStarts) {
      const after = keyframes.slice(start.index);
      const end = after.match(/"100%":\s*\{[^}]*\}/);
      expect(end?.[0], `a 0%-opacity keyframe near index ${start.index} has no visible end`).
        toMatch(/opacity:\s*"1"/);
    }
  });
});
