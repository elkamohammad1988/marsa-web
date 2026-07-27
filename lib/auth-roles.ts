/**
 * The role model.
 *
 * Two roles today. The thing that makes a third cheap is that **no component
 * and no route ever compares against a role name**: they ask whether a role
 * carries a permission, and the answer comes from one table below. Adding
 * `support` is a row in `ROLE_PERMISSIONS` and a value in the `role` check
 * constraint in migration 005 — not a search for `=== "admin"` across the app.
 *
 * The reason to be strict about that here rather than later: `role === "admin"`
 * scattered through components is not merely untidy, it is the shape in which
 * an authorisation check gets *forgotten*. A permission name appearing in a
 * component is a question the reader can answer; a role name is one they have
 * to go and research.
 *
 * A role in this file is a claim about what someone may do. Where the claim is
 * *stored* matters just as much, and it is not here: see migration 004, which
 * keeps `profiles.role` in a column the `authenticated` database role has no
 * privilege to update. User metadata would have been the convenient place and
 * is writable by the user it describes, which is the classic way an account
 * system grows a privilege-escalation bug.
 */

export const ROLES = ["user", "admin"] as const;

export type Role = (typeof ROLES)[number];

/**
 * What a new account gets, and what anything uncertain falls back to.
 *
 * Least privilege, so that every failure mode — an unreadable profile, a row
 * predating the column, a value the database somehow accepted — degrades
 * *downwards*. A default of "admin" would make a database hiccup an escalation.
 */
export const DEFAULT_ROLE: Role = "user";

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** A role name if it is one we know, otherwise the least-privileged default. */
export function toRole(value: unknown): Role {
  return isRole(value) ? value : DEFAULT_ROLE;
}

/**
 * Every capability the application gates on.
 *
 * Deliberately short. Each of these is checked somewhere real — there is no
 * speculative permission for a feature that does not exist, because a
 * permission nobody enforces reads like a boundary and is not one.
 */
export const PERMISSIONS = [
  /** Read one's own profile. */
  "profile:read",
  /** Change one's own display name. */
  "profile:write",
  /** Read every account's profile, not only one's own. */
  "accounts:read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * The grant table. One row per role; adding a role means adding a row.
 *
 * `Record<Role, …>` rather than a partial map on purpose: adding a role to
 * `ROLES` without deciding what it may do is then a type error rather than a
 * silent grant of nothing (or, worse, of everything, if this had been written
 * as a deny-list).
 */
const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  user: ["profile:read", "profile:write"],
  admin: ["profile:read", "profile:write", "accounts:read"],
};

/** Whether a role carries a permission. The only authorisation question. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Everything a role may do — for display, never for a decision. */
export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/** Human-readable role name for the account UI. */
export const ROLE_LABELS: Record<Role, string> = {
  user: "Member",
  admin: "Administrator",
};
