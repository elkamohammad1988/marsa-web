import type { StoredSubmission } from "@/lib/storage";

/**
 * CSV serialisation for the admin export.
 *
 * Two things this deliberately gets right:
 *  • RFC 4180 quoting — values containing quotes, commas or newlines survive a
 *    round-trip into a spreadsheet.
 *  • Formula injection — a value starting with `=`, `+`, `-` or `@` is prefixed
 *    with a single quote, so opening an export in Excel cannot execute a
 *    payload someone typed into a public form.
 */

const RISKY_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  let text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (RISKY_PREFIX.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCsvValue).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCsvValue(row[c])).join(","));
  // Excel needs CRLF to reliably respect embedded newlines.
  return [header, ...body].join("\r\n");
}

/**
 * Flatten submissions to a stable set of columns: the fixed record fields
 * first, then every `data` key seen across the batch (sorted, so exports of the
 * same kind stay diff-able).
 */
export function submissionsToCsv(items: StoredSubmission[]): string {
  const dataKeys = new Set<string>();
  for (const item of items) {
    for (const key of Object.keys(item.data)) dataKeys.add(key);
  }
  const columns = ["id", "kind", "createdAt", ...Array.from(dataKeys).sort()];

  const rows = items.map((item) => ({
    id: item.id,
    kind: item.kind,
    createdAt: item.createdAt,
    ...item.data,
  }));

  return toCsv(rows, columns);
}
