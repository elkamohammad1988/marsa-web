import { describe, it, expect } from "vitest";
import { posts, readingTimeMinutes, type BlogPost } from "@/lib/blog";

const make = (words: number): BlogPost => ({
  slug: "x",
  title: "",
  excerpt: "",
  date: "",
  category: "",
  cover: "",
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
