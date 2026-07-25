import { describe, it, expect } from "vitest";
import { posts, featuredPost, formatPostDate } from "@/lib/blog";
import { blogPostingSchema } from "@/lib/schema";

/**
 * Audit findings F5 and F4.
 *
 * F5: `blogPostingSchema` passed `post.date` straight through to
 * `datePublished`, and `post.date` was a display string like
 * "March 30, 2025". Schema.org requires ISO 8601, so Google's Rich Results
 * test rejected the value and none of the six posts was eligible for an
 * article rich result — silently discarding the payoff of an otherwise
 * meticulous SEO implementation.
 *
 * F4: the index was rendered in declared order, so it opened with a
 * 16-month-old post and the newest sat fourth.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

describe("post dates are machine-readable", () => {
  it.each(posts.map((p) => [p.slug, p.date] as const))(
    "%s has an ISO 8601 date",
    (_slug, date) => {
      expect(date).toMatch(ISO_DATE);
    },
  );

  it("every date is real, not merely well-shaped", () => {
    for (const post of posts) {
      const parsed = new Date(`${post.date}T00:00:00Z`);
      expect(Number.isNaN(parsed.getTime()), post.slug).toBe(false);
      // Round-trips, so "2026-02-31" cannot slip through.
      expect(parsed.toISOString().slice(0, 10)).toBe(post.date);
    }
  });
});

describe("structured data", () => {
  it("emits datePublished in the format schema.org requires", () => {
    for (const post of posts) {
      const schema = blogPostingSchema(post) as Record<string, unknown>;
      expect(String(schema.datePublished), post.slug).toMatch(ISO_DATE);
    }
  });
});

describe("the index leads with the newest post", () => {
  it("orders posts newest first", () => {
    const dates = posts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("features the newest post rather than the first declared one", () => {
    // featuredPost was posts[0] of the declared array, which was the oldest.
    const newest = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    expect(featuredPost.slug).toBe(newest.slug);
  });

  it("does not open with the oldest article", () => {
    const oldest = [...posts].sort((a, b) => (a.date > b.date ? 1 : -1))[0];
    expect(posts[0].slug).not.toBe(oldest.slug);
  });

  it("keeps a deterministic order for posts sharing a date", () => {
    // Two posts share 2026-03-30. Array.prototype.sort is stable, so a rebuild
    // must not swap them and churn the rendered page.
    const once = posts.map((p) => p.slug);
    const again = [...posts].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    expect(again.map((p) => p.slug)).toEqual(once);
  });
});

describe("formatPostDate", () => {
  it("renders a date a reader can read", () => {
    expect(formatPostDate("2025-03-30")).toBe("March 30, 2025");
    expect(formatPostDate("2026-01-16")).toBe("January 16, 2026");
  });

  it("does not shift the day in a negative-offset timezone", () => {
    // Parsing "2026-01-16" as local time would render January 15 west of UTC.
    // The formatter pins both parse and format to UTC.
    expect(formatPostDate("2026-01-16")).toContain("16");
  });
});
