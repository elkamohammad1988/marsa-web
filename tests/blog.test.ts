import { describe, it, expect } from "vitest";
import { posts, readingTimeMinutes, postSocialImage, type BlogPost } from "@/lib/blog";

const make = (words: number): BlogPost => ({
  slug: "x",
  title: "",
  excerpt: "",
  date: "",
  category: "",
  cover: "corridor",
  body: [{ paragraphs: [Array(words).fill("word").join(" ")] }],
});

describe("blog data integrity", () => {
  it("every post has a non-empty body with non-empty paragraphs", () => {
    for (const post of posts) {
      expect(post.body.length).toBeGreaterThan(0);
      for (const block of post.body) {
        expect(block.paragraphs.length).toBeGreaterThan(0);
        expect(block.paragraphs.every((p) => p.trim().length > 0)).toBe(true);
      }
    }
  });

  it("has unique slugs", () => {
    const slugs = posts.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("gives every post its own cover", () => {
    // The six `cover` paths this replaced resolved to five distinct images:
    // posts 2 and 4 were byte-identical, so the blog index showed the same
    // picture twice and neither told a reader anything about either article.
    const covers = posts.map((p) => p.cover);
    expect(new Set(covers).size).toBe(covers.length);
  });

  it("addresses each post's share card under its own slug", () => {
    // OpenGraph, Twitter and `BlogPosting.image` all read this one function;
    // if it stopped varying by slug, every post would share a card and the
    // duplication would be back in the place crawlers actually look.
    const images = posts.map((p) => postSocialImage(p.slug));
    expect(new Set(images).size).toBe(images.length);
    for (const post of posts) {
      expect(postSocialImage(post.slug)).toBe(`/blog/${post.slug}/opengraph-image`);
    }
  });
});

describe("readingTimeMinutes", () => {
  it("returns a positive integer for every post", () => {
    for (const post of posts) {
      const minutes = readingTimeMinutes(post);
      expect(Number.isInteger(minutes)).toBe(true);
      expect(minutes).toBeGreaterThanOrEqual(1);
    }
  });

  it("scales with word count (~200 wpm) and never drops below 1", () => {
    expect(readingTimeMinutes(make(3))).toBe(1);
    expect(readingTimeMinutes(make(600))).toBe(3);
    expect(readingTimeMinutes(make(600))).toBeGreaterThan(readingTimeMinutes(make(3)));
  });
});
