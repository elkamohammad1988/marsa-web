/**
 * Date formatting for dates that are shown to a person.
 *
 * `en-GB` and `timeZone: "UTC"`, both deliberately. A fixed locale means the
 * server and the client agree on the string, which is what keeps a
 * server-rendered date from failing hydration; a fixed zone means a row does
 * not appear to change day depending on where the reader is sitting, which is
 * the wrong kind of surprise on an audit trail.
 *
 * Returns the input unchanged when it is not a date, rather than rendering
 * "Invalid Date" — an unparseable timestamp is worth seeing, not worth
 * replacing with a word that looks like a bug in the page.
 */
const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : DAY.format(date);
}
