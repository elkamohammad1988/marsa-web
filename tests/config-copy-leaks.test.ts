import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MIN_PASSWORD_LENGTH, MIN_SECRET_LENGTH } from "@/lib/admin-session";
import { AUTH_UNAVAILABLE_MESSAGE } from "@/lib/api-auth";

/**
 * No surface a visitor can reach may render this application's configuration.
 *
 * This test replaces a narrower one, and the reason it widened is worth
 * keeping. The original asserted that `/admin/login`'s setup panel interpolated
 * `MIN_PASSWORD_LENGTH` and `MIN_SECRET_LENGTH` rather than retyping them,
 * because the panel had read "8+ characters" long after the constant rose to 16
 * — so an operator who followed the only on-screen guidance set a password the
 * app rejected, and got a closed door and a server log for it.
 *
 * That was a true fix to a real bug, and it accepted the panel's premise: that
 * a public route is a reasonable place to print a build instruction. It is not.
 * Four routes shared that premise — `/admin/login`, `/login`, `/register`,
 * `/forgot-password` — and on a deployment running with no credentials, which
 * this one does deliberately, the instruction is the *only* thing any of them
 * shows. A visitor deciding whether this developer can be trusted with their
 * product met `SUPABASE_ANON_KEY` instead of a product.
 *
 * None of it was a secret. Which variables this application reads is in
 * `.env.example` and in a public repository, and that is exactly why the old
 * reasoning held for so long: it answered "is this a disclosure?" when the
 * question was "what is this doing in the product?" A configuration fragment
 * rendered where a sign-in belongs reads as an unfinished side project whatever
 * it reveals.
 *
 * So the property is now the stronger and simpler one: these surfaces name no
 * environment variable at all. Documentation *links* are fine and are the point
 * — `AUTHENTICATION.md` tells a developer more than three variable names could,
 * because standing up accounts also needs a migration and two Supabase
 * dashboard settings that no variable can express.
 */

const ROOT = process.cwd();

/**
 * Source with comments removed.
 *
 * Every file below is checked for identifiers that look like environment
 * variables, and the comments in these files discuss those variables at length
 * — including the comment explaining why they were removed. Without this the
 * test would fail on its own rationale.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** Source with `import ... from "..."` statements removed. */
function withoutImports(source: string): string {
  return source.replace(/^import\s[\s\S]*?from\s+["'][^"']+["'];?$/gm, "");
}

function read(...segments: string[]): string {
  return withoutImports(withoutComments(readFileSync(path.join(ROOT, ...segments), "utf8")));
}

/**
 * `SUPABASE_ANON_KEY`, `ADMIN_PASSWORD`, `AUTH_SESSION_SECRET` — and equally
 * `MIN_SECRET_LENGTH`, because a screaming-snake identifier interpolated into
 * a sentence is how the old panel was written and is the shape this is watching
 * for. Deliberately a shape rather than a list: a variable added next year is
 * not on any list, and this must fail for it too.
 */
const SCREAMING_SNAKE = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g;

/** Every surface reachable without credentials on a deployment that has none. */
const PUBLIC_AUTH_SURFACES: Array<[label: string, segments: string[]]> = [
  ["/admin/login", ["app", "admin", "login", "page.tsx"]],
  ["the account setup notice", ["components", "auth", "AuthUnavailableNotice.tsx"]],
  ["/login", ["app", "(auth)", "login", "page.tsx"]],
  ["/register", ["app", "(auth)", "register", "page.tsx"]],
  ["/forgot-password", ["app", "(auth)", "forgot-password", "page.tsx"]],
  ["/verify-email", ["app", "(auth)", "verify-email", "page.tsx"]],
];

describe("public auth surfaces render no configuration", () => {
  for (const [label, segments] of PUBLIC_AUTH_SURFACES) {
    it(`${label} names no environment variable`, () => {
      const found = read(...segments).match(SCREAMING_SNAKE) ?? [];
      expect(
        found,
        `${label} renders ${found.join(", ")} — that belongs in docs/, not in a page a visitor lands on`,
      ).toEqual([]);
    });
  }

  /**
   * The same rule for the one string that is not in a page. This is a 503
   * response body, so it reaches anything that can issue a request — a
   * visitor's devtools included, and on the deployed build every auth call
   * returns it.
   */
  it("the unavailable-accounts API message names no environment variable", () => {
    expect(AUTH_UNAVAILABLE_MESSAGE.match(SCREAMING_SNAKE) ?? []).toEqual([]);
  });

  /**
   * The instruction was moved rather than deleted, and a move that loses the
   * destination is a deletion with extra steps. Whoever runs this project still
   * has to be told what to set.
   */
  it("keeps the setup instruction somewhere a developer can find it", () => {
    const auth = readFileSync(path.join(ROOT, "AUTHENTICATION.md"), "utf8");
    expect(auth).toContain("SUPABASE_ANON_KEY");
    expect(auth).toContain("AUTH_SESSION_SECRET");

    const deployment = readFileSync(path.join(ROOT, "docs", "DEPLOYMENT.md"), "utf8");
    expect(deployment).toContain("ADMIN_PASSWORD");
    expect(deployment).toContain("ADMIN_SESSION_SECRET");
  });

  /**
   * Carried over from the test this replaces. A password weaker than the
   * signing secret would make the shared credential the cheapest way in, which
   * is the asymmetry audit finding S1 was about.
   */
  it("keeps a password floor that is at least the secret floor", () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(MIN_SECRET_LENGTH);
  });
});
