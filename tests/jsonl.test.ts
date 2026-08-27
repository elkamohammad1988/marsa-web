import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { JsonlStore, dataDir } from "@/lib/jsonl";

/**
 * Audit B6 and B5.
 *
 * B6: `lib/analytics.ts` carried a near-verbatim copy of the JSONL mechanics
 * in `lib/storage.ts` — the DATA_DIR resolution, the mkdir-then-append write,
 * the split-filter-parse-skip-corrupt read. This is the one implementation
 * both now use, so these assertions cover both stores at once.
 *
 * B5: reads are bounded. The property that matters is not "it reads less" but
 * "it never pretends the window was the whole file": a store that silently
 * drops the oldest half of its data is the same shape of bug as the funnel
 * that could report over 100%, and that one shipped for months.
 */

const TMP_DIR = path.join(os.tmpdir(), `marsa-jsonl-${process.pid}-${Date.now()}`);

type Record = { id: number; note: string };

beforeAll(async () => {
  process.env.DATA_DIR = TMP_DIR;
  await fs.mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  delete process.env.DATA_DIR;
  await fs.rm(TMP_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  await fs.rm(path.join(TMP_DIR, "records.jsonl"), { force: true });
});

describe("dataDir", () => {
  it("honours DATA_DIR", () => {
    expect(dataDir({ DATA_DIR: "/tmp/elsewhere" })).toBe("/tmp/elsewhere");
  });

  it("falls back to .data under the working directory", () => {
    expect(dataDir({})).toBe(path.join(process.cwd(), ".data"));
  });

  it("is resolved per call, not once at module load", async () => {
    // The old modules read DATA_DIR into a const at import time, which is why
    // two test files have to set the variable before a dynamic import and
    // explain why in a comment.
    const store = new JsonlStore<Record>("records.jsonl");
    const first = store.filePath;
    process.env.DATA_DIR = path.join(TMP_DIR, "moved");
    expect(store.filePath).not.toBe(first);
    process.env.DATA_DIR = TMP_DIR;
  });
});

describe("append and read", () => {
  it("round-trips records in file order", async () => {
    const store = new JsonlStore<Record>("records.jsonl");
    await store.append({ id: 1, note: "first" });
    await store.append({ id: 2, note: "second" });

    const { records, truncated } = await store.read();

    expect(records).toEqual([
      { id: 1, note: "first" },
      { id: 2, note: "second" },
    ]);
    expect(truncated).toBe(false);
  });

  it("creates the directory on first write", async () => {
    const nested = path.join(TMP_DIR, "nested");
    process.env.DATA_DIR = nested;
    try {
      await new JsonlStore<Record>("records.jsonl").append({ id: 1, note: "x" });
      await expect(fs.stat(nested)).resolves.toBeDefined();
    } finally {
      process.env.DATA_DIR = TMP_DIR;
      await fs.rm(nested, { recursive: true, force: true });
    }
  });

  it("treats a missing file as empty rather than an error", async () => {
    const { records, truncated } = await new JsonlStore<Record>("absent.jsonl").read();
    expect(records).toEqual([]);
    expect(truncated).toBe(false);
  });

  it("skips a corrupted line instead of failing the whole read", async () => {
    // A partial write must not take the admin page down.
    const store = new JsonlStore<Record>("records.jsonl");
    await store.append({ id: 1, note: "good" });
    await fs.appendFile(path.join(TMP_DIR, "records.jsonl"), "{not json}\n", "utf8");
    await store.append({ id: 2, note: "also good" });

    const { records } = await store.read();
    expect(records.map((r) => r.id)).toEqual([1, 2]);
  });

  it("throws on a failed write rather than reporting success", async () => {
    // A directory where the file belongs makes appendFile fail with EISDIR,
    // standing in for the read-only filesystem of a serverless deploy. B1: the
    // caller has to be able to tell, or a visitor is told "we have your
    // details" about a record that does not exist.
    await fs.mkdir(path.join(TMP_DIR, "blocked.jsonl"), { recursive: true });
    try {
      await expect(new JsonlStore<Record>("blocked.jsonl").append({ id: 1, note: "x" })).rejects
        .toBeInstanceOf(Error);
    } finally {
      await fs.rm(path.join(TMP_DIR, "blocked.jsonl"), { recursive: true, force: true });
    }
  });
});

describe("bounded reads (B5)", () => {
  /**
   * One record per line, each comfortably over 40 bytes.
   *
   * Written in a single `writeFile` rather than through `append()`, and that is
   * a fix rather than a shortcut.
   *
   * `append()` is `mkdir` **then** `appendFile` — two syscalls per record, by
   * design, so the store survives its directory being removed underneath it.
   * Building a 50-record fixture through it is therefore 100 sequential awaited
   * filesystem operations, `beforeEach` clears the file so all four tests below
   * pay it again, and every one of them runs under vitest's *default* 5s
   * budget. On an idle machine that is about a second; with the browser suite
   * compiling and three `next start` servers on the same disk it is not, and
   * `never returns a half-record from the start of the window` was observed
   * timing out at exactly 5000ms — a timeout, never a wrong assertion.
   *
   * Nothing is given up. This block is `bounded reads (B5)`: what is under test
   * is `read()`'s byte window, and `read()` opens a file and slices bytes — it
   * cannot tell how those bytes arrived. `append()` has its own coverage in the
   * block above, including the failed-write path. The bytes here are exactly
   * what `append()` produces, `JSON.stringify(record) + "
"` per line, so the
   * fixture is identical and the flakiness is gone at its source rather than
   * absorbed by a wider timeout.
   */
  async function writeRecords(count: number) {
    const lines = Array.from(
      { length: count },
      (_, i) =>
        `${JSON.stringify({
          id: i + 1,
          note: `record number ${i + 1} with padding to give it some size`,
        })}
`,
    ).join("");
    await fs.writeFile(path.join(TMP_DIR, "records.jsonl"), lines, "utf8");
  }

  it("reads the whole file when it fits inside the window", async () => {
    await writeRecords(20);
    const { records, truncated } = await new JsonlStore<Record>("records.jsonl", 64 * 1024).read();

    expect(records).toHaveLength(20);
    expect(truncated).toBe(false);
  });

  it("keeps the newest records when the file does not fit", async () => {
    await writeRecords(50);
    // Small enough to hold only the last few lines.
    const { records, truncated } = await new JsonlStore<Record>("records.jsonl", 300).read();

    expect(truncated).toBe(true);
    expect(records.length).toBeGreaterThan(0);
    expect(records.length).toBeLessThan(50);
    // The tail, not the head: recent submissions are the ones an operator is
    // looking at, and the alternative is showing the oldest and calling it all.
    expect(records[records.length - 1].id).toBe(50);
  });

  it("never returns a half-record from the start of the window", async () => {
    await writeRecords(50);
    const { records } = await new JsonlStore<Record>("records.jsonl", 300).read();

    // The window almost certainly starts mid-line. Every record that comes
    // back must still be whole — a truncated first line is dropped, not parsed
    // into a record with missing fields.
    for (const record of records) {
      expect(typeof record.id).toBe("number");
      expect(record.note).toMatch(/^record number \d+ with padding/);
    }
  });

  it("says so when it truncated, rather than looking complete", async () => {
    await writeRecords(50);

    const full = await new JsonlStore<Record>("records.jsonl", 64 * 1024).read();
    const clipped = await new JsonlStore<Record>("records.jsonl", 300).read();

    expect(full.truncated).toBe(false);
    expect(clipped.truncated).toBe(true);
  });

  it("survives a window smaller than a single record", async () => {
    await writeRecords(5);
    const { records, truncated } = await new JsonlStore<Record>("records.jsonl", 10).read();

    // No newline inside the window means nothing whole can be recovered — and
    // that has to be an empty result, not a parse error and not a fragment.
    expect(truncated).toBe(true);
    expect(records).toEqual([]);
  });
});
