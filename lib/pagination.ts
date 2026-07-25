/**
 * Pure pagination helpers, shared by list pages and unit-tested in isolation.
 */

/** Total number of pages for a given item count and page size (never below 1). */
export function pageCount(itemCount: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

/**
 * Clamp a raw page parameter (typically from a query string) to a valid page
 * number in [1, total]. Missing, non-numeric, zero, negative, and
 * out-of-range values all resolve to the nearest valid page; fractions
 * truncate toward zero.
 */
export function clampPage(
  param: string | number | undefined | null,
  total: number,
): number {
  const max = Math.max(1, Math.floor(total) || 1);
  const n = typeof param === "number" ? param : Number(param);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.trunc(n)), max);
}

/** Return the slice of items for a given (already-clamped) page. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
