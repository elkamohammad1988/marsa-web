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
  it("publishes only contact channels the site actually shows", () => {
    const schema = organizationSchema();
    const emails = schema.contactPoint.map((c) => c.email);

    expect(schema.contactPoint.map((c) => c.contactType)).toEqual(["customer support", "sales"]);
    for (const email of emails) expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("links only to profiles configured as absolute URLs", () => {
    for (const profile of organizationSchema().sameAs) {
      expect(profile).toMatch(/^https:\/\//);
    }
  });
});

describe("manifest", () => {
  it("names the app and matches the palette", () => {
    const m = manifest();
    expect(m.short_name).toBe("Marsa");
    expect(m.theme_color).toBe("#0c080b");
    expect(m.background_color).toBe("#0c080b");
    expect(m.start_url).toBe("/");
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
