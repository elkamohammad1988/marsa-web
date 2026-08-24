import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import sitemap from "@/app/sitemap";
import manifest from "@/app/manifest";
import robots from "@/app/robots";
import { buildMetadata } from "@/lib/seo";
import { blogPostingSchema, breadcrumbSchema, organizationSchema } from "@/lib/schema";
import { posts } from "@/lib/blog";
import { socialHandle, absoluteUrl } from "@/lib/site";

/**
 * The SEO surface, asserted on the things a crawler acts on rather than on
 * whether a tag is present.
 *
 * The theme running through these is that a claim which is not true is worse
 * than a claim that is absent: a `lastmod` of "today, every day" trains a
 * crawler to ignore `lastmod` everywhere on the site, and a `BreadcrumbList`
 * naming a URL that does not exist is an invalid breadcrumb rather than a
 * partial one.
 */

describe("sitemap", () => {
  const entries = sitemap();

  it("lists every blog post and a page of static routes", () => {
    expect(entries.length).toBeGreaterThan(25);
    for (const post of posts) {
      expect(entries.some((e) => e.url.endsWith(`/blog/${post.slug}`))).toBe(true);
    }
  });

  it("dates blog entries from their publication date", () => {
    for (const post of posts) {
      const entry = entries.find((e) => e.url.endsWith(`/blog/${post.slug}`));
      expect(entry?.lastModified).toEqual(new Date(`${post.date}T00:00:00Z`));
    }
  });

  it("claims no lastModified for routes with no change history", () => {
    // Every entry used to carry `new Date()`, so each crawl was told the whole
    // site changed that morning — which is not a strong freshness signal, it
    // is one a crawler learns to discount, taking the accurate blog dates with
    // it.
    const dated = entries.filter((e) => e.lastModified !== undefined);
    expect(dated).toHaveLength(posts.length);
  });

  it("emits absolute URLs and no duplicates", () => {
    for (const entry of entries) expect(entry.url).toMatch(/^https?:\/\//);
    expect(new Set(entries.map((e) => e.url)).size).toBe(entries.length);
  });

  it("lists no route that robots.txt disallows", () => {
    // A sitemap is a request to crawl. Listing a path that robots forbids asks
    // for two contradictory things and is a Search Console warning.
    const disallowed = [robots().rules].flat().flatMap((r) => [r.disallow].flat());
    for (const entry of entries) {
      const pathname = new URL(entry.url).pathname || "/";
      for (const rule of disallowed) {
        if (typeof rule !== "string" || rule === "/") continue;
        expect(pathname.startsWith(rule), `${pathname} is disallowed by "${rule}"`).toBe(false);
      }
    }
  });
});

describe("every indexable route declares a canonical", () => {
  function pageFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(path.join(process.cwd(), dir))) {
      const rel = path.join(dir, entry);
      if (statSync(path.join(process.cwd(), rel)).isDirectory()) out.push(...pageFiles(rel));
      else if (entry === "page.tsx") out.push(rel);
    }
    return out;
  }

  const pages = pageFiles("app");

  it("finds the routes to check", () => {
    expect(pages.length).toBeGreaterThan(25);
  });

  it.each(pages)("%s", (file) => {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    // The admin area is noindex by its layout and must not advertise a
    // canonical — it is the one part of the site that should be invisible.
    if (file.includes(`admin${path.sep}`) || file.includes("admin/")) {
      expect(source).not.toContain("alternates");
      return;
    }
    expect(source).toMatch(/buildMetadata|alternates:\s*\{\s*canonical/);
  });
});

describe("buildMetadata", () => {
  it("sets a canonical, OpenGraph and Twitter card from one source", () => {
    const meta = buildMetadata({ title: "Pricing", description: "Plans", path: "/pricing" });

    expect(meta.alternates?.canonical).toBe(absoluteUrl("/pricing"));
    expect(meta.openGraph?.url).toBe(absoluteUrl("/pricing"));
    expect(meta.twitter).toMatchObject({ card: "summary_large_image" });
  });

  /**
   * A `summary_large_image` card with no image is worse than no card at all.
   *
   * `images` was left `undefined` whenever a caller passed no path, on the
   * reasonable-sounding assumption that `app/opengraph-image.tsx` would cover
   * the rest. It does not: the file convention applies to its own route
   * segment, so it covered `/` and the blog posts covered themselves — and
   * every other page, `/demo` and `/pricing` among them, shipped
   * `twitter:card: summary_large_image` and no `og:image` to go with it. A
   * shared link rendered as a strip of text on a site whose argument is that
   * the design is good.
   *
   * The card and the image are one decision, so they are asserted together.
   */
  it("never declares a large-image card without an image to put in it", () => {
    const page = buildMetadata({ title: "Interactive demo", description: "…", path: "/demo" });

    expect(page.twitter).toMatchObject({ card: "summary_large_image" });
    expect(page.openGraph?.images, "/demo ships no og:image").toEqual([
      { url: absoluteUrl("/opengraph-image") },
    ]);
    expect(page.twitter?.images).toEqual([absoluteUrl("/opengraph-image")]);
  });

  it("lets a caller name its own card, and does not overwrite it", () => {
    // A blog post generates a per-post image and passes its path. The default
    // must give way to it rather than replacing every post's card with the
    // generic one.
    const post = buildMetadata({
      title: "A post",
      description: "…",
      path: "/blog/a-post",
      image: "/blog/a-post/opengraph-image",
      type: "article",
    });
    expect(post.openGraph?.images).toEqual([
      { url: absoluteUrl("/blog/a-post/opengraph-image") },
    ]);
  });

  it("dates an article and never a marketing page", () => {
    const article = buildMetadata({
      title: "A post",
      description: "…",
      type: "article",
      publishedTime: "2026-04-12",
    });
    expect(article.openGraph).toHaveProperty("publishedTime", "2026-04-12T00:00:00.000Z");

    // A publication date on a page that was never published is a false claim,
    // so the field is dropped rather than defaulted.
    const page = buildMetadata({ title: "Pricing", description: "…", publishedTime: "2026-04-12" });
    expect(page.openGraph).not.toHaveProperty("publishedTime");
  });

  it("marks a noindex page and leaves the rest to the layout default", () => {
    expect(buildMetadata({ title: "x", description: "y", noindex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
    expect(buildMetadata({ title: "x", description: "y" }).robots).toBeUndefined();
  });
});

describe("socialHandle", () => {
  it("reads the handle off a profile URL", () => {
    expect(socialHandle("https://x.com/marsamoney")).toBe("@marsamoney");
    expect(socialHandle("https://www.twitter.com/marsamoney/")).toBe("@marsamoney");
  });

  it("returns null rather than a broken attribution", () => {
    // A card crediting "@undefined" is worse than one crediting nobody.
    expect(socialHandle("https://www.linkedin.com/company/marsamoney")).toBeNull();
    expect(socialHandle("")).toBeNull();
    expect(socialHandle("https://x.com/")).toBeNull();
  });
});

describe("breadcrumbSchema", () => {
  it("numbers positions consecutively from one", () => {
    const schema = breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: "A post" },
    ]);
    expect(schema.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
  });

  it("drops a grouping label that no route serves", () => {
    // "Business" is a visual grouping with no page behind it. Schema.org
    // requires `item` on every entry but the last, so listing it would claim a
    // URL that 404s.
    const schema = breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Business" },
      { name: "EU Business Account" },
    ]);

    expect(schema.itemListElement.map((i) => i.name)).toEqual(["Home", "EU Business Account"]);
    expect(schema.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });

  it("gives every entry but the last an absolute item URL", () => {
    const schema = breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: "A post" },
    ]);

    const [first, second, last] = schema.itemListElement;
    expect(first).toHaveProperty("item", absoluteUrl("/"));
    expect(second).toHaveProperty("item", absoluteUrl("/blog"));
    expect(last).not.toHaveProperty("item");
  });
});

describe("blogPostingSchema", () => {
  it.each(posts.map((p) => [p.slug, p] as const))("%s is rich-result eligible", (_slug, post) => {
    const schema = blogPostingSchema(post);

    // ISO 8601, which is what Google's Rich Results test rejects a display
    // string for (audit F5).
    expect(schema.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(schema.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Date.parse(schema.datePublished)).not.toBeNaN();
    expect(schema.image).toMatch(/^https?:\/\//);
    expect(schema.url).toMatch(/^https?:\/\//);
    expect(schema.headline.length).toBeGreaterThan(0);
  });

  it("never reports a modification earlier than publication", () => {
    for (const post of posts) {
      const schema = blogPostingSchema(post);
      expect(Date.parse(schema.dateModified)).toBeGreaterThanOrEqual(
        Date.parse(schema.datePublished),
      );
    }
  });
});

describe("organizationSchema", () => {
  /**
   * These two assertions used to read `contactPoint.map(...)` and
   * `sameAs` directly, because both were emitted unconditionally against
   * defaults that invented a support address and three social profiles at a
   * domain nobody owns. Those defaults are now empty (#24), so the keys are
   * *absent* rather than present-and-blank — a `ContactPoint` whose `email` is
   * `""` is a worse claim than no contact point at all, and `sameAs` is a
   * machine-readable assertion of ownership.
   *
   * The invariant is therefore about shape, not about a particular
   * configuration: whatever is emitted must be real, and nothing may be
   * emitted empty. That holds both here and on a deployment that has the
   * environment variables set.
   */
  it("emits no empty contact channel", () => {
    const schema = organizationSchema();
    expect("contactPoint" in schema).toBe(Boolean(schema.contactPoint?.length));

    for (const c of schema.contactPoint ?? []) {
      expect(c.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(["customer support", "sales"]).toContain(c.contactType);
    }
  });

  it("links only to profiles configured as absolute URLs", () => {
    const schema = organizationSchema();
    expect("sameAs" in schema).toBe(Boolean(schema.sameAs?.length));

    for (const profile of schema.sameAs ?? []) {
      expect(profile).toMatch(/^https:\/\//);
    }
  });

  it("claims no email address unless one is configured", () => {
    const schema = organizationSchema();
    if ("email" in schema) expect(schema.email).toMatch(/@/);
  });
});

describe("manifest", () => {
  /**
   * `--canvas`, read from the stylesheet rather than restated here.
   *
   * This test was called "matches the palette" while asserting a hex literal,
   * which is not the same thing: when the palette went from rose-black to
   * water-slate the manifest and the stylesheet disagreed, and the only reason
   * that surfaced was that the literal had been written down twice. Deriving it
   * means the assertion is now about the property the name claims — the browser
   * chrome and the page paint the same colour — and it will hold through the
   * next palette too.
   *
   * The manifest and `viewport.themeColor` are the two places a palette value
   * must be duplicated as a literal, because both are consumed before any
   * stylesheet exists. So both are checked against the token here.
   */
  const canvas = (() => {
    const css = readFileSync(path.join(process.cwd(), "styles", "globals.css"), "utf8");
    const match = css.match(/--canvas:\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*;/);
    expect(match, "no --canvas token in globals.css").not.toBeNull();
    const hex = match!.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, "0"));
    return `#${hex.join("")}`;
  })();

  it("names the app and matches the palette", () => {
    const m = manifest();
    expect(m.short_name).toBe("Marsa");
    expect(m.theme_color).toBe(canvas);
    expect(m.background_color).toBe(canvas);
    expect(m.start_url).toBe("/");
  });

  it("agrees with the theme colour the document shell declares", () => {
    const layout = readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8");
    const declared = layout.match(/themeColor:\s*"(#[0-9a-f]{6})"/i);
    expect(declared, "no themeColor in app/layout.tsx").not.toBeNull();
    expect(declared![1].toLowerCase()).toBe(canvas);
  });

  it("keeps the address bar visible", () => {
    // Hiding browser chrome on something presenting as a bank removes the one
    // control a visitor has for checking they are where they think they are.
    expect(manifest().display).toBe("browser");
  });

  it("declares at least one icon the launcher can scale", () => {
    expect(manifest().icons?.some((i) => i.sizes === "any")).toBe(true);
  });
});

/**
 * Titles and descriptions have a length budget, because a search result has
 * one.
 *
 * Google renders roughly 60 characters of `<title>` and roughly 160 of the
 * description, and truncates the rest with an ellipsis. Every blog post here
 * overran the title budget — the longest headline was 111 characters against a
 * document title of `${title} · Marsa` — so the qualifier that made the
 * headline worth clicking was the exact part being cut. Eight marketing pages
 * overran the description budget the same way.
 *
 * These assert the budget rather than the current strings, so a new post or a
 * new page fails here instead of shipping truncated. The blog assertion runs
 * against `seoTitle ?? title`, which is what `generateMetadata` uses.
 */
describe("search-result length budgets", () => {
  /** What `app/layout.tsx`'s title template appends to a page title. */
  const SUFFIX = " · Marsa";
  const TITLE_BUDGET = 60;
  const DESCRIPTION_BUDGET = 160;

  it.each(posts.map((p) => [p.slug, p] as const))(
    "blog/%s fits a search-result title",
    (_slug, post) => {
      const rendered = `${post.seoTitle ?? post.title}${SUFFIX}`;
      expect(rendered.length).toBeLessThanOrEqual(TITLE_BUDGET);
    },
  );

  it.each(posts.map((p) => [p.slug, p] as const))(
    "blog/%s fits a search-result description",
    (_slug, post) => {
      expect(post.excerpt.length).toBeLessThanOrEqual(DESCRIPTION_BUDGET);
    },
  );

  /**
   * Page metadata is read from source rather than imported, because importing
   * every route's module to reach `export const metadata` would execute each
   * page's server-side dependencies for a string comparison.
   */
  const ROOT = process.cwd();
  function pageFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(path.join(ROOT, dir))) {
      const rel = path.join(dir, entry);
      if (statSync(path.join(ROOT, rel)).isDirectory()) out.push(...pageFiles(rel));
      else if (entry === "page.tsx") out.push(rel);
    }
    return out;
  }

  const described = pageFiles("app")
    .map((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      const match = source.match(/\bdescription:\s*\n?\s*"((?:[^"\\]|\\.)*)"/);
      return match ? ([file, match[1]] as const) : null;
    })
    .filter((x): x is readonly [string, string] => x !== null);

  it("finds the described pages", () => {
    expect(described.length).toBeGreaterThan(20);
  });

  it.each(described)("%s fits a search-result description", (_file, description) => {
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_BUDGET);
  });
});
