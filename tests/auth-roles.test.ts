import { describe, it, expect } from "vitest";
import {
  can,
  DEFAULT_ROLE,
  isRole,
  PERMISSIONS,
  permissionsFor,
  ROLE_LABELS,
  ROLES,
  toRole,
  type Permission,
} from "@/lib/auth-roles";
import {
  ACCOUNT_HOME,
  AUTH_NOTICES,
  GOVERNED_PREFIXES,
  noticeFor,
  policyFor,
  safeRedirect,
  signInUrl,
  SIGN_IN_PATH,
} from "@/lib/auth-routes";

/**
 * The role model and the route policy — what a caller may do, and where the
 * answer is enforced.
 *
 * These are behavioural rather than structural on purpose: adding a role or a
 * page should not break this file, but weakening a boundary should.
 */

describe("the role model", () => {
  it("defaults to the least-privileged role", () => {
    // Every uncertain path — an unreadable profile, a value from a downgrade,
    // a row that predates the column — lands on this. A default of "admin"
    // would turn a database hiccup into an escalation.
    expect(DEFAULT_ROLE).toBe("user");
    expect(permissionsFor(DEFAULT_ROLE)).not.toContain("accounts:read");
  });

  it("recognises exactly the roles it declares", () => {
    for (const role of ROLES) expect(isRole(role), role).toBe(true);
    for (const value of ["superuser", "ADMIN", "", null, undefined, 1, {}]) {
      expect(isRole(value), String(value)).toBe(false);
    }
  });

  it("narrows anything unrecognised rather than passing it through", () => {
    expect(toRole("admin")).toBe("admin");
    expect(toRole("root")).toBe(DEFAULT_ROLE);
    expect(toRole(undefined)).toBe(DEFAULT_ROLE);
  });

  it("gives every role a label, so the account UI can never render a raw value", () => {
    for (const role of ROLES) expect(ROLE_LABELS[role], role).toBeTruthy();
  });

  it("grants only permissions that exist", () => {
    // A grant naming a permission nothing checks reads like a boundary and is
    // not one.
    for (const role of ROLES) {
      for (const permission of permissionsFor(role)) {
        expect(PERMISSIONS, `${role} → ${permission}`).toContain(permission);
      }
    }
  });

  it("keeps privileges additive: an administrator can do whatever a member can", () => {
    for (const permission of permissionsFor("user")) {
      expect(can("admin", permission), permission).toBe(true);
    }
  });

  it("reserves the directory for the administrator", () => {
    expect(can("admin", "accounts:read")).toBe(true);
    expect(can("user", "accounts:read")).toBe(false);
  });

  it("lets both roles read and write their own profile", () => {
    for (const role of ROLES) {
      expect(can(role, "profile:read"), role).toBe(true);
      expect(can(role, "profile:write"), role).toBe(true);
    }
  });

  it("answers false for a permission no role holds rather than throwing", () => {
    // `can` is called with a permission and a role that both come from typed
    // sources, but it is the last check before a boundary — it must not be the
    // thing that 500s.
    expect(can("user", "nonsense" as Permission)).toBe(false);
  });
});

describe("the route policy", () => {
  it("closes the account area", () => {
    expect(policyFor("/account")).toEqual({ access: "authenticated" });
    expect(policyFor("/api/account/profile")).toEqual({ access: "authenticated" });
  });

  it("protects a page under /account that does not exist yet", () => {
    // The point of a prefix table: a page added later inherits the protection
    // by existing. Nothing in the type system or the linter catches a new page
    // that forgets a check, so the boundary has to.
    expect(policyFor("/account/some-future-page")).toEqual({ access: "authenticated" });
  });

  it("lets the longest prefix win, so the directory keeps its stronger rule", () => {
    // `/account/admin` sits inside `/account`. If the shorter prefix won, the
    // permission gate would silently become a mere session check.
    expect(policyFor("/account/admin")).toEqual({
      access: "permission",
      permission: "accounts:read",
    });
    expect(policyFor("/account/admin/anything")).toEqual({
      access: "permission",
      permission: "accounts:read",
    });
  });

  it("sends a signed-in visitor away from the pages that exist to sign them in", () => {
    for (const path of ["/login", "/register", "/forgot-password"]) {
      expect(policyFor(path), path).toEqual({ access: "guest-only" });
    }
  });

  it("requires a session to set a new password", () => {
    // The recovery link mints one; without it there is nothing proving the
    // person owns the account.
    expect(policyFor("/reset-password")).toEqual({ access: "authenticated" });
  });

  it("leaves the rest of the site public", () => {
    for (const path of ["/", "/pricing", "/demo", "/verify-email", "/auth/confirm", "/api/rates"]) {
      expect(policyFor(path), path).toEqual({ access: "public" });
    }
  });

  it("does not treat a lookalike path as a governed one", () => {
    // `/accounts-payable` starts with "/account" as a string but is not under
    // it as a path, and must not inherit its policy — nor, more importantly,
    // its protection, which would be a boundary in the wrong place.
    expect(policyFor("/accounts-payable")).toEqual({ access: "public" });
    expect(policyFor("/logins")).toEqual({ access: "public" });
  });

  it("exposes its prefixes so the middleware matcher can be checked against them", () => {
    expect(GOVERNED_PREFIXES).toContain("/account");
    expect(GOVERNED_PREFIXES).toContain(SIGN_IN_PATH);
  });
});

describe("safeRedirect", () => {
  it("keeps an ordinary path, query string and all", () => {
    expect(safeRedirect("/account")).toBe("/account");
    expect(safeRedirect("/account/admin?page=2")).toBe("/account/admin?page=2");
  });

  it("refuses an absolute URL", () => {
    expect(safeRedirect("https://evil.example")).toBe(ACCOUNT_HOME);
    expect(safeRedirect("http://evil.example/path")).toBe(ACCOUNT_HOME);
  });

  it("refuses a protocol-relative URL", () => {
    // `//evil.example` is a complete URL that happens to start with a slash —
    // the exact shape a naive "must start with /" check lets through.
    expect(safeRedirect("//evil.example")).toBe(ACCOUNT_HOME);
    expect(safeRedirect("//evil.example/account")).toBe(ACCOUNT_HOME);
  });

  it("refuses a backslash, which browsers normalise to a slash", () => {
    expect(safeRedirect("/\\evil.example")).toBe(ACCOUNT_HOME);
    expect(safeRedirect("\\\\evil.example")).toBe(ACCOUNT_HOME);
    expect(safeRedirect("/account\\..\\evil")).toBe(ACCOUNT_HOME);
  });

  it("refuses control characters, which can split a response header", () => {
    expect(safeRedirect("/account\r\nLocation: https://evil.example")).toBe(ACCOUNT_HOME);
    expect(safeRedirect("/account\tx")).toBe(ACCOUNT_HOME);
    expect(safeRedirect("/account x")).toBe(ACCOUNT_HOME);
  });

  it("refuses a value that is not a string, and an empty one", () => {
    for (const value of [undefined, null, 42, {}, [], ""]) {
      expect(safeRedirect(value), String(value)).toBe(ACCOUNT_HOME);
    }
  });

  it("refuses a path long enough to be carrying something else", () => {
    expect(safeRedirect(`/${"a".repeat(512)}`)).toBe(ACCOUNT_HOME);
  });

  it("uses the fallback it was given", () => {
    expect(safeRedirect("https://evil.example", "/somewhere")).toBe("/somewhere");
    expect(safeRedirect("nonsense", "")).toBe("");
  });
});

describe("signInUrl", () => {
  it("is the bare path when there is nothing to carry", () => {
    expect(signInUrl()).toBe(SIGN_IN_PATH);
    expect(signInUrl("")).toBe(SIGN_IN_PATH);
  });

  it("carries a destination so the visitor lands where they were going", () => {
    expect(signInUrl("/account/admin")).toBe("/login?next=%2Faccount%2Fadmin");
  });

  it("drops a destination that would leave the site", () => {
    // Sanitised on the way in as well as on the way out, so an unusable value
    // never reaches the query string in the first place.
    expect(signInUrl("https://evil.example")).toBe(SIGN_IN_PATH);
  });

  it("carries a notice code alongside the destination", () => {
    expect(signInUrl("/account", "session-expired")).toBe(
      "/login?next=%2Faccount&error=session-expired",
    );
  });
});

describe("notices are looked up, never rendered from the URL", () => {
  it("resolves each code it declares", () => {
    for (const code of Object.keys(AUTH_NOTICES)) {
      expect(noticeFor(code), code).toBeTruthy();
    }
  });

  it("returns null for anything else", () => {
    // The attack this closes is not script injection — React escapes markup —
    // it is that arbitrary text under our heading, in our voice, on our
    // domain, is a convincing phishing page.
    for (const value of [
      "Your account is suspended. Call 555-0100 to restore it.",
      "<script>alert(1)</script>",
      "",
      undefined,
      42,
    ]) {
      expect(noticeFor(value), String(value)).toBeNull();
    }
  });

  it("does not resolve inherited object properties as notices", () => {
    // `"toString" in AUTH_NOTICES` is true via the prototype chain, so a
    // membership test written the obvious way returns a function here.
    expect(noticeFor("toString")).toBeNull();
    expect(noticeFor("constructor")).toBeNull();
  });
});
