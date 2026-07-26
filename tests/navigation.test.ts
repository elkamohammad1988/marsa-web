import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mainNav, footerColumns } from "@/lib/nav";

/**
 * Audit F10: the navbar dropdowns declared `role="menu"` with `role="menuitem"`
 * children. Those roles are a contract — arrow keys, Home/End, type-ahead, and
 * focus moving into the menu on open. None was implemented, so a screen-reader
 * user was told "menu, 6 items" and then found the arrow keys did nothing.
 *
 * The component is a disclosure, and now says so. These tests pin the parts of
 * that which are checkable without a DOM: the roles stay gone, every
 * `aria-expanded` has an `aria-controls` beside it pointing at an element that
 * is rendered rather than unmounted, and no interactive element in the header
 * or footer relies on the browser's default focus ring.
 *
 * They read source rather than rendered output deliberately — the project runs
 * Vitest in a node environment with no component-test framework, and the
 * alternative (adding jsdom for four assertions) is a dependency the repo has
 * so far earned the right not to have.
 */

const ROOT = process.cwd();

/**
 * Comments are stripped before scanning. These files *explain* the roles they
 * no longer use, so a naive grep would count the explanation as the offence
 * and make the correct code fail.
 */
function code(rel: string[]): string {
  return readFileSync(path.join(ROOT, ...rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const navbar = code(["components", "layout", "Navbar.tsx"]);
const footer = code(["components", "layout", "Footer.tsx"]);

describe("the navbar markup describes the component that exists", () => {
  it("claims no ARIA menu pattern", () => {
    expect(navbar).not.toMatch(/role="menu"/);
    expect(navbar).not.toMatch(/role="menuitem"/);
    // `aria-haspopup` carries the same promise: it announces a menu.
    expect(navbar).not.toMatch(/aria-haspopup/);
  });

  it("pairs every aria-expanded with an aria-controls", () => {
    const expanded = (navbar.match(/aria-expanded/g) ?? []).length;
    const controls = (navbar.match(/aria-controls/g) ?? []).length;
    expect(expanded).toBeGreaterThan(0);
    expect(controls).toBe(expanded);
  });

  it("keeps controlled panels mounted so aria-controls resolves", () => {
    // `{open && <panel/>}` is what made the old `aria-expanded` point at
    // nothing: the element named by aria-controls has to exist even when
    // collapsed. Hiding with the `hidden` attribute keeps the id resolvable.
    expect(navbar).toMatch(/hidden=\{!open\}/);
    expect(navbar).toMatch(/hidden=\{!mobileOpen\}/);
  });

  it("gives Escape somewhere to return focus to", () => {
    expect(navbar).toMatch(/Escape/);
    expect(navbar).toMatch(/\.focus\(\)/);
  });
});

describe("focus is visible on the dark chrome", () => {
  it("never offsets a focus ring without naming the offset colour", () => {
    // Tailwind's default --tw-ring-offset-color is white. On the near-black
    // navbar an unnamed offset paints a white halo around the control.
    for (const [source, name] of [
      [navbar, "Navbar"],
      [footer, "Footer"],
    ] as const) {
      const offsets = (source.match(/focus-visible:ring-offset-2/g) ?? []).length;
      const named = (source.match(/focus-visible:ring-offset-canvas/g) ?? []).length;
      expect(named, `${name}: ring-offset-2 without ring-offset-canvas`).toBe(offsets);
    }
  });
});

describe("navigation links are honest about where they go", () => {
  it("never sends two footer shortcuts to the same page", () => {
    // "Help" and "FAQ" both pointed at /faq, in a four-item list, on every page.
    const fastLinks = [...footer.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(fastLinks).size).toBe(fastLinks.length);
  });

  it("has no dead or placeholder hrefs in the navigation model", () => {
    const hrefs = [
      ...mainNav.flatMap((g) => [g.href, ...(g.children ?? []).map((c) => c.href)]),
      ...footerColumns.flatMap((c) => c.links.map((l) => l.href)),
    ].filter((h): h is string => typeof h === "string");

    expect(hrefs.length).toBeGreaterThan(20);
    for (const href of hrefs) {
      expect(href, `"${href}" is not a site-relative path`).toMatch(/^\/(?!\/)/);
      expect(href).not.toBe("#");
    }
  });

  it("gives every top-level nav entry either a destination or children", () => {
    for (const group of mainNav) {
      expect(
        Boolean(group.href) || Boolean(group.children?.length),
        `"${group.label}" links nowhere and opens nothing`,
      ).toBe(true);
    }
  });
});
