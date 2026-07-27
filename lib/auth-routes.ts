import type { Permission } from "@/lib/auth-roles";

/**
 * Which routes need what, in one table.
 *
 * The admin area learned this the hard way (audit S5): when "is this protected"
 * is a call each page has to remember to make, a new page that forgets is
 * silently world-readable, with nothing in the type system, the linter or the
 * tests to catch it. Here the answer is data, `middleware.ts` reads it before
 * the handler runs, and a new route under a protected prefix inherits the
 * protection by existing.
 *
 * The per-page checks stay anyway — `requireSession()` in each layout — for
 * the same reason the admin routes kept theirs: the middleware matcher is one
 * edit away from not covering a path, and the page-level check is what fails
 * closed if that happens.
 */

export type RoutePolicy =
  | { access: "public" }
  /** Signed-in visitors are sent away: the sign-in page has nothing for them. */
  | { access: "guest-only" }
  | { access: "authenticated" }
  | { access: "permission"; permission: Permission };

export const SIGN_IN_PATH = "/login";
export const ACCOUNT_HOME = "/account";

/**
 * Longest matching prefix wins, so `/account/admin` is read as the
 * permission-gated entry rather than the merely-authenticated `/account` it
 * sits inside. Order in this array is presentation only.
 */
const ROUTE_POLICIES: ReadonlyArray<readonly [string, RoutePolicy]> = [
  ["/account/admin", { access: "permission", permission: "accounts:read" }],
  ["/account", { access: "authenticated" }],
  ["/api/account", { access: "authenticated" }],
  // Reached with a recovery session minted from the emailed link, and also by
  // someone already signed in who simply wants a new password. Both are the
  // same requirement: prove who you are, then set it.
  ["/reset-password", { access: "authenticated" }],
  [SIGN_IN_PATH, { access: "guest-only" }],
  ["/register", { access: "guest-only" }],
  ["/forgot-password", { access: "guest-only" }],
];

/** Every prefix the table governs — the source for the middleware matcher. */
export const GOVERNED_PREFIXES: readonly string[] = ROUTE_POLICIES.map(([prefix]) => prefix);

const PUBLIC: RoutePolicy = { access: "public" };

/** The policy for a path. Unlisted paths are public — this site is a website. */
export function policyFor(pathname: string): RoutePolicy {
  let matched: RoutePolicy = PUBLIC;
  let matchedLength = -1;

  for (const [prefix, policy] of ROUTE_POLICIES) {
    const isMatch = pathname === prefix || pathname.startsWith(`${prefix}/`);
    if (isMatch && prefix.length > matchedLength) {
      matched = policy;
      matchedLength = prefix.length;
    }
  }
  return matched;
}

/** Control characters and whitespace, which must never survive into a redirect. */
function hasUnsafeCharacter(value: string): boolean {
  // Character codes rather than a regex: a literal holding control characters
  // is unreadable, and this states exactly what it rejects.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * A same-origin path taken from a query parameter, or the fallback.
 *
 * `?next=` exists so that being bounced to the sign-in page returns you to
 * where you were going. It is also the classic open redirect: an attacker
 * sends `…/login?next=https://evil.example`, the victim signs in on the real
 * site, and the site itself hands them to the attacker's page carrying all the
 * trust that transfer implies.
 *
 * So only a path is ever accepted, and four ways of dressing an absolute URL
 * up as one are rejected explicitly:
 *
 *   `//evil.example`      protocol-relative — a whole URL that starts with a slash
 *   `/\evil.example`      browsers normalise backslash to slash before navigating
 *   a path holding CR/LF  control characters, which can split a response header
 *   a 4 KB path           length, so a redirect cannot carry a payload
 */
export function safeRedirect(value: unknown, fallback: string = ACCOUNT_HOME): string {
  if (typeof value !== "string") return fallback;
  if (value.length === 0 || value.length > 512) return fallback;
  if (value.includes("\\")) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (hasUnsafeCharacter(value)) return fallback;
  return value;
}

/**
 * The messages the sign-in page may show, keyed by a code carried in the URL.
 *
 * A closed set, looked up rather than rendered. The alternative — putting the
 * message itself in `?error=` — lets anyone with a link put arbitrary text in
 * our page, under our heading, in our voice. React would escape the markup, so
 * this is not about script injection; it is that "Your account is suspended.
 * Call this number to restore it" is a convincing phishing page hosted on the
 * real domain, and no amount of escaping makes it less convincing.
 */
export const AUTH_NOTICES = {
  "invalid-link": "That link has expired or has already been used. Request a new one below.",
  "session-expired": "Your session has ended. Please sign in again.",
} as const;

export type AuthNotice = keyof typeof AUTH_NOTICES;

/**
 * The message for a notice code, or null for anything unrecognised.
 *
 * `Object.hasOwn`, not `in`: `in` walks the prototype chain, so
 * `?error=toString` would resolve to `Object.prototype.toString` and hand a
 * *function* to the page as its notice.
 */
export function noticeFor(code: unknown): string | null {
  return typeof code === "string" && Object.hasOwn(AUTH_NOTICES, code)
    ? AUTH_NOTICES[code as AuthNotice]
    : null;
}

/**
 * The sign-in URL that returns to `from` afterwards, optionally explaining
 * why the reader is looking at it.
 *
 * `from` goes through `safeRedirect` here rather than only on the way back
 * out, so an unusable value never reaches the query string at all.
 */
export function signInUrl(from?: string, notice?: AuthNotice): string {
  const params = new URLSearchParams();
  const next = from ? safeRedirect(from, "") : "";
  if (next) params.set("next", next);
  if (notice) params.set("error", notice);

  const query = params.toString();
  return query ? `${SIGN_IN_PATH}?${query}` : SIGN_IN_PATH;
}
