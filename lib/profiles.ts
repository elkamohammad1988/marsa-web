import type { AuthConfig } from "@/lib/auth-config";
import { selectRows, updateRow, type PostgrestConfig } from "@/lib/postgrest";
import { DEFAULT_ROLE, toRole, type Role } from "@/lib/auth-roles";
import { captureException } from "@/lib/observability";

/**
 * Profile reads and writes, always as the signed-in user.
 *
 * Every function here takes an access token and none takes the service-role
 * key. That is the whole design: the database decides who may see which row,
 * so `listProfiles` can be written as "select every profile" and still return
 * exactly one row to an ordinary member, because migration 004's policies say
 * so. A filter in this file would be a second, weaker copy of that rule.
 *
 * The practical test of it: if the role in a session cookie were somehow wrong
 * — stale after a demotion, or forged — the administrator's page would open
 * and show one row. The application's checks decide what is *offered*; the
 * database decides what is *returned*.
 *
 * Edge-safe: `middleware.ts` calls `fetchRole` while renewing a session.
 */

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

const TABLE = "profiles";
const COLUMNS = "id,email,full_name,avatar_url,role,created_at,updated_at";

/** Largest page the administrator's list will fetch in one request. */
export const PROFILE_PAGE_SIZE = 50;

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    // Narrowed rather than cast: a value this build does not know about
    // becomes the least-privileged role instead of flowing through as one.
    role: toRole(row.role),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** A PostgREST configuration that acts as this user, so RLS applies. */
function asUser(cfg: AuthConfig, accessToken: string): PostgrestConfig {
  return { endpoint: cfg.restEndpoint, key: cfg.anonKey, token: accessToken };
}

/** The signed-in user's own profile, or null when there is no row for them. */
export async function getProfile(
  cfg: AuthConfig,
  accessToken: string,
  userId: string,
): Promise<Profile | null> {
  const { rows } = await selectRows<ProfileRow>(
    asUser(cfg, accessToken),
    TABLE,
    `select=${COLUMNS}&id=eq.${encodeURIComponent(userId)}&limit=1`,
  );
  return rows[0] ? rowToProfile(rows[0]) : null;
}

/**
 * The user's role, degrading to the least-privileged one.
 *
 * Called on every session renewal, including inside middleware, so it must not
 * throw: a database blip during a refresh would otherwise sign people out.
 * When it degrades it says so, with the remedy — the likeliest cause by far is
 * migration 004 not having been applied, which produces an authentication
 * system that works and an account area that is empty, with no error anywhere.
 */
export async function fetchRole(
  cfg: AuthConfig,
  accessToken: string,
  userId: string,
): Promise<Role> {
  try {
    const profile = await getProfile(cfg, accessToken, userId);
    if (profile) return profile.role;
    captureException(new Error(`No profile row for user ${userId}.`), {
      event: "auth.profile.missing",
      severity: "warning",
      remedy: "apply db/migrations/004_auth_profiles.sql — its trigger creates the row",
      fallback: `role "${DEFAULT_ROLE}"`,
    });
  } catch (err) {
    captureException(err, {
      event: "auth.profile.unreadable",
      severity: "warning",
      remedy: "apply db/migrations/004_auth_profiles.sql",
      fallback: `role "${DEFAULT_ROLE}"`,
    });
  }
  return DEFAULT_ROLE;
}

/**
 * Update the caller's own profile.
 *
 * The filter names the caller's own id and the policy requires the same thing,
 * which is deliberate belt and braces: the filter is what makes the intent
 * readable here, the policy is what makes it true. Returns null when no row
 * was updated — which, under RLS, is what "not yours" looks like.
 *
 * `role` cannot appear in `patch` by construction, and the database would
 * reject it anyway: `authenticated` holds no update privilege on that column.
 */
export async function updateProfile(
  cfg: AuthConfig,
  accessToken: string,
  userId: string,
  patch: { fullName: string | null },
): Promise<Profile | null> {
  const row = await updateRow<ProfileRow>(
    asUser(cfg, accessToken),
    TABLE,
    `id=eq.${encodeURIComponent(userId)}&select=${COLUMNS}`,
    { full_name: patch.fullName },
  );
  return row ? rowToProfile(row) : null;
}

/**
 * Every profile the caller is allowed to see, newest first.
 *
 * Written without a role check on purpose — see the note at the top of this
 * file. An administrator gets the directory; anybody else gets their own row,
 * because that is what the policies return.
 */
export async function listProfiles(
  cfg: AuthConfig,
  accessToken: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ items: Profile[]; total: number }> {
  const limit = Math.max(1, Math.min(options.limit ?? PROFILE_PAGE_SIZE, PROFILE_PAGE_SIZE));
  const offset = Math.max(0, options.offset ?? 0);

  const { rows, total } = await selectRows<ProfileRow>(
    asUser(cfg, accessToken),
    TABLE,
    `select=${COLUMNS}&order=created_at.desc&limit=${limit}&offset=${offset}`,
  );
  return { items: rows.map(rowToProfile), total };
}
