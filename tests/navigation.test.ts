import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
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

  it("never offers the same destination twice in the main navigation", () => {
    // "FAQ" was both a top-level item and the last entry under Resources, so
    // the desktop bar offered one page under two controls — in the band where
    // the comments in `Navbar.tsx` record the row running out of width.
    const hrefs = mainNav.flatMap((g) => [g.href, ...(g.children ?? []).map((c) => c.href)]);
    const present = hrefs.filter((h): h is string => typeof h === "string");
    const duplicates = present.filter((h, i) => present.indexOf(h) !== i);
    expect(duplicates, `${duplicates.join(", ")} appears twice in mainNav`).toEqual([]);
  });
});

/**
 * No call to action may point at the page it is rendered on.
 *
 * `/pricing` ended its own page with a "See Pricing" button. Nothing was
 * broken in the sense a type or a link checker understands — the href resolved,
 * the page answered 200 — and that is exactly why it survived: the only way to
 * see it is to be on the page and read the button. A reader who presses it
 * watches the page reload into itself, which is the plainest kind of
 * unfinished.
 *
 * Routes are derived from the filesystem rather than listed, so a page added
 * later is covered by existing. Dynamic segments are skipped: `[slug]` has no
 * single route to compare against.
 */
describe("no page links to itself", () => {
  const pages = (function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(path.join(ROOT, dir))) {
      const rel = path.posix.join(dir, entry);
      if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
      else if (entry === "page.tsx") out.push(rel);
    }
    return out;
  })("app");

  /** `app/(auth)/login/page.tsx` → `/login`; `null` for a dynamic route. */
  function routeOf(file: string): string | null {
    const segments = file
      .slice("app/".length, -"/page.tsx".length)
      .split("/")
      .filter((s) => s && !/^\(.*\)$/.test(s));
    if (segments.some((s) => s.startsWith("["))) return null;
    return `/${segments.join("/")}`;
  }

  const routed = pages
    .map((file) => [file, routeOf(file)] as const)
    .filter((pair): pair is readonly [string, string] => pair[1] !== null);

  it("finds the pages to check", () => {
    expect(routed.length).toBeGreaterThan(20);
  });

  it.each(routed)("%s offers no link back to %s", (file, route) => {
    const source = code(file.split("/"));
    // Query strings are allowed: `/get-started?type=business` from
    // `/get-started` is a genuinely different destination.
    const selfLink = new RegExp(`href:\\s*"${route}"|href="${route}"`);
    expect(source, `${file} links to itself (${route})`).not.toMatch(selfLink);
  });
});

/**
 * On a `force-dynamic` page, a control that changes only the query string must
 * be a plain anchor, never `<Link>`.
 *
 * This is a fix for a defect that every other gate was blind to. `/admin`'s
 * kind filters and its Previous/Next pagination were `<Link>`s pointing at
 * `/admin?kind=…` and `/admin?page=…` — the same route, a different query.
 * Clicking one made the App Router fetch the new RSC payload (the request goes
 * out, the server answers 200 with a correct document) and then never commit
 * it: the URL did not change and the table did not move. From the operator's
 * side, the filters and the pagination were dead controls.
 *
 * Everything about that was invisible from the outside. The href resolved, the
 * page it named rendered perfectly on a direct visit, the markup was valid, and
 * the server did exactly the right thing. Only a browser that clicked the link
 * and then asked where it had ended up could see it — which is what
 * `tests/smoke/admin-dashboard.smoke.ts` now does, and this is the cheap
 * static rule that stops the pattern being reintroduced somewhere the browser
 * suite does not reach.
 *
 * A plain `<a>` is also the right control for this area on its own merits:
 * `/admin` deliberately ships no client JavaScript, and its search box is
 * already a native `<form method="get">`. Full navigation is what the other two
 * thirds of the toolbar were already doing.
 */
describe("query-only navigation on a dynamic page is a full navigation", () => {
  const dynamicPages = (function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(path.join(ROOT, dir))) {
      const rel = path.posix.join(dir, entry);
      if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...walk(rel));
      else if (entry === "page.tsx") out.push(rel);
    }
    return out;
  })("app").filter((file) => /dynamic\s*=\s*"force-dynamic"/.test(code(file.split("/"))));

  it("finds the force-dynamic pages", () => {
    expect(dynamicPages.length).toBeGreaterThan(0);
  });

  it.each(dynamicPages)("%s uses no <Link> to its own query string", (file) => {
    const source = code(file.split("/"));
    const route = `/${file
      .slice("app/".length, -"/page.tsx".length)
      .split("/")
      .filter((segment) => segment && !/^\(.*\)$/.test(segment))
      .join("/")}`;

    /*
     * Every `<Link …>` element in the file, with the whole opening tag, so an
     * href written across several lines is still seen. Then: does its href
     * begin with this page's own route and continue into a query?
     *
     * `buildQuery(...)` is matched as well as a literal, because that is how
     * the admin page composes them — `href={`/admin${buildQuery({ kind: k })}`}`
     * is exactly the shape that broke.
     */
    const links = source.match(/<Link[\s\S]*?>/g) ?? [];
    const offenders = links.filter((tag) => {
      const href = tag.match(/href=\{?[`"]([^`"]*)[`"]?/)?.[1] ?? "";
      if (!href.startsWith(route)) return false;
      const rest = href.slice(route.length);
      return rest.startsWith("?") || rest.startsWith("${buildQuery");
    });

    expect(
      offenders,
      `${file}: <Link> to its own query string does not navigate on a ` +
        `force-dynamic route — use a plain <a>`,
    ).toEqual([]);
  });
});
