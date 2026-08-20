import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Two properties about personal data at rest (audit B10 and P9).
 *
 *   1. The local submission store is never committed. The repository is public,
 *      and `.data/` holds real names and email addresses from anyone who has
 *      used the forms against a development build.
 *   2. The telemetry table has a stated retention period, expressed as a
 *      function somebody can schedule, rather than growing forever.
 *
 * The first is asserted through git itself rather than by reading `.gitignore`
 * and reasoning about it. Ignore rules are subtle — an ignored *directory* is
 * one git never descends into, so a negation inside it silently does nothing —
 * and the only authority on whether a file would be committed is git.
 */

const ROOT = process.cwd();

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

describe("the local submission store cannot be committed", () => {
  /**
   * `check-ignore` exits 1 for a path that is *not* ignored, which is why this
   * asks for the exit status rather than the output.
   */
  function isIgnored(relative: string): boolean {
    try {
      execFileSync("git", ["check-ignore", "-q", relative], { cwd: ROOT });
      return true;
    } catch {
      return false;
    }
  }

  it.each(["lead.jsonl", "contact.jsonl", "subscribe.jsonl", "demo-events.jsonl"])(
    ".data/%s is ignored",
    (file) => {
      expect(
        isIgnored(path.posix.join(".data", file)),
        `.data/${file} holds personal data and this repository is public`,
      ).toBe(true);
    },
  );

  it("ignores a submission file that does not exist yet", () => {
    // The rule must cover the *pattern*, not the four files that happen to be
    // there — a new submission kind would otherwise arrive uncovered.
    expect(isIgnored(".data/a-future-kind.jsonl")).toBe(true);
  });

  it("tracks nothing under .data/ but the README", () => {
    // `ls-files` lists what is actually in the index. Anything else here is
    // personal data that has already been committed.
    const tracked = git("ls-files", ".data").split("\n").filter(Boolean);
    expect(tracked.filter((f) => f !== ".data/README.md")).toEqual([]);
  });

  it("keeps the README readable, so the warning is where the data is", () => {
    const readme = readFileSync(path.join(ROOT, ".data", "README.md"), "utf8");
    expect(readme).toMatch(/personal data/i);
    expect(readme).toMatch(/never leave the machine/i);
  });
});

describe("demo telemetry has a retention period", () => {
  const migrations = readdirSync(path.join(ROOT, "db", "migrations"))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(path.join(ROOT, "db", "migrations", f), "utf8"))
    .join("\n");

  it("ships a purge function with a default period", () => {
    expect(migrations).toMatch(/create or replace function public\.purge_demo_events/);
    expect(migrations).toMatch(/interval '90 days'/);
  });

  it("reports how many rows it removed", () => {
    // A purge that returns nothing is indistinguishable from one that never
    // ran, which is the failure mode of every scheduled cleanup job.
    const fn = migrations.slice(migrations.indexOf("purge_demo_events"));
    expect(fn.slice(0, 400)).toMatch(/returns integer/);
    expect(fn.slice(0, 800)).toMatch(/get diagnostics/);
  });

  it("takes the period as an argument rather than hard-coding it in the body", () => {
    // So shortening retention is a change to the schedule, not to the schema.
    expect(migrations).toMatch(/purge_demo_events\(\s*\n?\s*p_older_than interval default/);
    expect(migrations).toMatch(/created_at < now\(\) - p_older_than/);
  });

  it("does not invent a retention period for submissions", () => {
    // The one number that is a legal decision rather than an engineering one.
    // Whoever writes it must be the person who is entitled to choose it.
    expect(migrations).not.toMatch(/purge_submissions|delete from public\.submissions/);
  });
});
