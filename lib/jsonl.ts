import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Newline-delimited JSON on local disk — the zero-configuration store that
 * lets `npm run dev` work with no credentials at all.
 *
 * Audit B6: `lib/analytics.ts` carried a near-verbatim copy of this — the
 * `DATA_DIR` resolution, the mkdir-then-append write, the
 * split-filter-parse-skip-corrupt read loop. Stable duplication is still
 * duplication: every change to how records are written or recovered had to be
 * made twice, and the second one would eventually be forgotten. Each module
 * now contains only its schema and its aggregation.
 *
 * Audit B5: reads are **bounded**. The previous implementation read every file
 * completely into memory, `JSON.parse`d every line and sorted the whole array
 * before slicing for pagination — on the default provider, on every request.
 * This reads at most the trailing `tailBytes` and reports when the window did
 * not cover the file, because a store that silently drops the oldest half of
 * its data is the same shape of bug as the funnel that could report 120%.
 *
 * **This is not a production path.** `createStore()` refuses to build it when
 * `NODE_ENV=production`, for reasons `lib/storage.ts` sets out.
 */

/**
 * 512 KiB ≈ several thousand submissions, which is far past what a development
 * database accumulates and small enough that parsing it is not a page's worth
 * of latency.
 */
export const DEFAULT_TAIL_BYTES = 512 * 1024;

/**
 * Resolved per call rather than once at module load, so a test can point
 * `DATA_DIR` somewhere temporary without having to control import order.
 */
export function dataDir(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.DATA_DIR ?? path.join(process.cwd(), ".data");
}

export type JsonlPage<T> = {
  records: T[];
  /** True when the read window did not reach the start of the file. */
  truncated: boolean;
};

export class JsonlStore<T> {
  constructor(
    private readonly fileName: string,
    private readonly tailBytes: number = DEFAULT_TAIL_BYTES,
  ) {}

  /** Absolute path of the backing file. Never returned to a caller. */
  get filePath(): string {
    return path.join(dataDir(), this.fileName);
  }

  /**
   * Append one record. Throws on failure — deciding whether a failed write is
   * fatal belongs to the caller, and getting that decision wrong is what B1
   * was about.
   */
  async append(record: T): Promise<void> {
    await fs.mkdir(dataDir(), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(record)}\n`, "utf8");
  }

  /**
   * Records in file order (oldest first), from at most the trailing
   * `tailBytes`. A missing file is an empty result, not an error: nothing has
   * been written yet is a normal state.
   *
   * A corrupt line is skipped rather than failing the read, so a partial write
   * cannot take the admin page down. That also absorbs the one edge case in
   * the byte-window read: slicing at an arbitrary offset can land inside a
   * multi-byte character, and the damage is confined to the first line, which
   * is discarded whenever the window started mid-file.
   */
  async read(): Promise<JsonlPage<T>> {
    let text: string;
    let truncated = false;

    try {
      const handle = await fs.open(this.filePath, "r");
      try {
        const { size } = await handle.stat();
        const start = Math.max(0, size - this.tailBytes);
        const buffer = Buffer.alloc(size - start);
        if (buffer.length > 0) await handle.read(buffer, 0, buffer.length, start);
        text = buffer.toString("utf8");
        if (start > 0) {
          truncated = true;
          // Everything up to the first newline is a fragment of a record that
          // began before the window.
          const firstBreak = text.indexOf("\n");
          text = firstBreak === -1 ? "" : text.slice(firstBreak + 1);
        }
      } finally {
        await handle.close();
      }
    } catch {
      return { records: [], truncated: false };
    }

    const records = text
      .split("\n")
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as T];
        } catch {
          return [];
        }
      });

    return { records, truncated };
  }
}
