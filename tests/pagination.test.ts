import { describe, it, expect } from "vitest";
import { clampPage, pageCount, paginate } from "@/lib/pagination";

describe("pageCount", () => {
  it("computes ceil with a floor of 1", () => {
    expect(pageCount(0, 4)).toBe(1);
    expect(pageCount(4, 4)).toBe(1);
    expect(pageCount(5, 4)).toBe(2);
    expect(pageCount(8, 4)).toBe(2);
    expect(pageCount(9, 4)).toBe(3);
  });

  it("guards against a non-positive page size", () => {
    expect(pageCount(10, 0)).toBe(1);
    expect(pageCount(10, -3)).toBe(1);
  });
});

describe("clampPage", () => {
  it("defaults missing/blank/nullish input to page 1", () => {
    expect(clampPage(undefined, 3)).toBe(1);
    expect(clampPage(null, 3)).toBe(1);
    expect(clampPage("", 3)).toBe(1);
  });

  it("treats zero and negatives as page 1", () => {
    expect(clampPage("0", 3)).toBe(1);
    expect(clampPage("-5", 3)).toBe(1);
    expect(clampPage(-2, 3)).toBe(1);
  });

  it("clamps out-of-range values down to the last page", () => {
    expect(clampPage("99", 2)).toBe(2);
    expect(clampPage(1000, 5)).toBe(5);
  });

  it("rejects non-numeric input", () => {
    expect(clampPage("abc", 3)).toBe(1);
    expect(clampPage("2x", 3)).toBe(1);
    expect(clampPage(NaN, 3)).toBe(1);
  });

  it("truncates fractional pages toward zero", () => {
    expect(clampPage("1.9", 3)).toBe(1);
    expect(clampPage("2.999", 3)).toBe(2);
  });

  it("returns valid in-range pages unchanged", () => {
    expect(clampPage("2", 3)).toBe(2);
    expect(clampPage(3, 3)).toBe(3);
  });

  it("collapses everything to page 1 when there is a single page", () => {
    expect(clampPage("3", 1)).toBe(1);
    expect(clampPage("2", 0)).toBe(1);
  });
});

describe("paginate", () => {
  const items = [1, 2, 3, 4, 5];

  it("slices the correct window", () => {
    expect(paginate(items, 1, 4)).toEqual([1, 2, 3, 4]);
    expect(paginate(items, 2, 4)).toEqual([5]);
  });

  it("returns an empty array past the end", () => {
    expect(paginate(items, 3, 4)).toEqual([]);
  });
});
