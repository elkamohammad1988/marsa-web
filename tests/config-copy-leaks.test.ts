import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { MIN_PASSWORD_LENGTH, MIN_SECRET_LENGTH } from "@/lib/admin-session";

/**
 * The setup instructions on `/admin/login` must agree with the rule
 * `getAdminConfig()` enforces.
 *
 * They did not. The panel read "ADMIN_PASSWORD (8+ characters)" long after
 * `MIN_PASSWORD_LENGTH` rose to 16, so the only on-screen guidance an operator
 * gets pointed at a value the app rejects — and the rejection is a
 * `console.error` on the server plus an admin area that silently stays shut.
 *
 * The fix was to interpolate the constants. This test is what stops the prose
 * drifting back: it fails if a literal length is ever typed into the page
 * again, whatever number is chosen.
 */

const SOURCE = readFileSync(
  path.join(process.cwd(), "app", "admin", "login", "page.tsx"),
  "utf8",
);

describe("the admin setup instructions cannot drift from the rule they describe", () => {
  it("interpolates both minimums rather than hard-coding them", () => {
    expect(SOURCE).toContain("{MIN_PASSWORD_LENGTH}+ characters");
    expect(SOURCE).toContain("{MIN_SECRET_LENGTH}+");
  });

  it("states no literal character count anywhere on the page", () => {
    // Catches "(8+ characters)", "16+ characters", "at least 12 characters" —
    // any hand-typed number describing a credential length.
    const literals = SOURCE.match(/\b\d+\+?\s*characters\b/g) ?? [];
    expect(literals).toEqual([]);
  });

  it("keeps a password floor that is at least the secret floor", () => {
    // A password weaker than the signing secret would make the shared
    // credential the cheapest way in, which is the asymmetry S1 was about.
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(MIN_SECRET_LENGTH);
  });
});
