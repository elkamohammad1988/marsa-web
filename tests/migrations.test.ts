import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROLES } from "@/lib/auth-roles";

/**
 * Audit P4: the database was defined by a single apply-once file with no record
 * of what had been applied where, and no way to express a *change* — adding a
 * column or a constraint to a live table had nowhere to live.
 *
 * These assert the properties that make a migration directory trustworthy. A
 * migration that is not idempotent, or that does not record itself, breaks the
 * ledger for every environment it touches — and that is discovered in
 * production, not here, unless something checks.
 */

const DIR = path.join(process.cwd(), "db", "migrations");
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const read = (f: string) => readFileSync(path.join(DIR, f), "utf8");

describe("the migration directory", () => {
  it("contains migrations", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("names every file with a numeric prefix", () => {
    for (const file of files) expect(file, file).toMatch(/^\d{3}_[a-z0-9_]+\.sql$/);
  });

  it("numbers them consecutively from 001, with no gaps or duplicates", () => {
    // A gap means a migration was deleted; a duplicate means two people picked
    // the same number and one will silently never run.
    const versions = files.map((f) => Number(f.slice(0, 3)));
    expect(versions).toEqual(versions.map((_, i) => i + 1));
  });
});

describe("every migration is safe to re-run", () => {
  it.each(files)("%s creates things conditionally", (file) => {
    const sql = read(file).toLowerCase();
    // Bare `create table` / `create index` fail on a second run, which turns a
    // re-applied directory from a no-op into an error.
    expect(sql, "create table without if not exists").not.toMatch(
      /create\s+table\s+(?!if\s+not\s+exists)/,
    );
    expect(sql, "create index without if not exists").not.toMatch(
      /create\s+index\s+(?!if\s+not\s+exists)/,
    );
    expect(sql, "create function without or replace").not.toMatch(
      /create\s+function\s/,
    );
  });

  it.each(files)("%s records itself in the ledger", (file) => {
    const version = file.slice(0, 3);
    const sql = read(file);
    expect(sql).toContain("insert into public.schema_migrations");
    expect(sql).toContain(`values ('${version}')`);
    // Without the guard, re-running raises a duplicate-key error.
    expect(sql.toLowerCase()).toContain("on conflict (version) do nothing");
  });
});

describe("the security model survives every migration", () => {
  it("enables row level security on every table it creates", () => {
    const all = files.map(read).join("\n").toLowerCase();
    const created = [...all.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/g)].map(
      (m) => m[1],
    );
    expect(created.length).toBeGreaterThan(0);
    for (const table of created) {
      expect(all, `RLS missing for ${table}`).toContain(
        `alter table public.${table} enable row level security`,
      );
    }
  });

  /**
   * The rule used to be "RLS on, **zero policies**": every table unreadable to
   * the anon key, reached only by server code holding the service-role key.
   * That is correct while every row belongs to the operator — a form
   * submission has no owner but the business.
   *
   * A profile does have an owner, and 004 adds the policies that say so. The
   * property the old rule was protecting is kept, and stated more precisely:
   * **no policy grants anything to `anon` or `public`, and every policy is
   * constrained by the caller's own identity.** A policy that failed either of
   * those would be exactly the quiet opening-up the original test existed to
   * prevent.
   */
  describe("row level security policies", () => {
    const sql = files.map(read).join("\n").toLowerCase();
    const policies = [...sql.matchAll(/create\s+policy[\s\S]*?;/g)].map((m) => m[0]);

    it("finds the policies to check", () => {
      expect(policies.length).toBeGreaterThan(0);
    });

    it.each(policies.map((p, i) => [i, p] as const))(
      "policy %i grants nothing to anon or public",
      (_index, policy) => {
        // The anon key is public. A policy naming it hands every visitor a row.
        expect(policy).not.toMatch(/\bto\s+(anon|public)\b/);
      },
    );

    it.each(policies.map((p, i) => [i, p] as const))(
      "policy %i is scoped to authenticated",
      (_index, policy) => {
        expect(policy).toMatch(/\bto\s+authenticated\b/);
      },
    );

    it.each(policies.map((p, i) => [i, p] as const))(
      "policy %i is constrained by who the caller is",
      (_index, policy) => {
        // Either the row belongs to them, or they hold a role that may read
        // every row. A policy with neither is `using (true)` wearing a hat.
        expect(policy).toMatch(/auth\.uid\(\)|is_admin\(\)/);
      },
    );

    it.each(policies.map((p, i) => [i, p] as const))(
      "policy %i grants only reads and updates",
      (_index, policy) => {
        // Profiles are created by a trigger and removed by the cascade from
        // auth.users. An insert policy is how a user would create their own
        // row with the role of their choosing.
        expect(policy).toMatch(/\bfor\s+(select|update)\b/);
      },
    );

    it("is safe to re-run: every policy is dropped before it is created", () => {
      // `create policy` has no `if not exists`, so a re-applied directory
      // errors without this — which turns a no-op into a failed migration.
      for (const policy of policies) {
        const name = policy.match(/create\s+policy\s+(\w+)/)?.[1];
        expect(name, policy).toBeTruthy();
        expect(sql).toContain(`drop policy if exists ${name}`);
      }
    });
  });

  it("pins search_path on every security definer function", () => {
    // A security definer function without a pinned search_path is a privilege
    // escalation waiting for someone to create a shadowing schema.
    const all = files.map(read).join("\n").toLowerCase();
    const definers = all.split("security definer").length - 1;
    const pinned = all.split("set search_path = public").length - 1;
    expect(definers).toBeGreaterThan(0);
    expect(pinned).toBe(definers);
  });

  /**
   * The companion to the rule above, and the one that was missing.
   *
   * Pinning `search_path` stops a definer-rights function being *subverted*. It
   * does nothing about who may *call* it — and PostgreSQL grants EXECUTE on a
   * new function to PUBLIC, with Supabase additionally granting it to `anon`
   * and `authenticated` by default privilege. A definer-rights function runs as
   * its owner, so an open EXECUTE grant is a hole straight through the "RLS on,
   * no policies" model every table here relies on.
   *
   * 004 spotted this for `is_admin()` and revoked it. 001-003 did not, which
   * left `submission_stats()`, `demo_funnel()`, `check_rate_limit()` and
   * `purge_rate_limit_hits()` callable by anyone holding the project's anon key
   * — a key that is public by design. 005 closes them; this is what stops the
   * next definer-rights function being added without one.
   *
   * Trigger functions are exempt because they are not reachable: PostgreSQL
   * refuses to call a function returning `trigger` directly, so PostgREST
   * cannot expose one as an RPC.
   */
  describe("every callable security definer function has its EXECUTE closed", () => {
    const all = files.map(read).join("\n").toLowerCase();

    /** `create or replace function public.foo(...) … $$;` → one entry per function. */
    const definerRpcs = all
      .split("create or replace function ")
      .slice(1)
      .map((chunk) => ({
        name: chunk.match(/^public\.(\w+)/)?.[1] ?? "",
        body: chunk.slice(0, chunk.indexOf("$$;") + 1),
      }))
      .filter((fn) => fn.name && fn.body.includes("security definer"))
      // Not callable over PostgREST — Postgres rejects a direct call.
      .filter((fn) => !/returns\s+trigger/.test(fn.body))
      .map((fn) => fn.name);

    /** Every function named in a revoke, however that revoke is spelled. */
    const revoked = new Set(
      [
        // `revoke execute on function public.is_admin() from public`
        ...all.matchAll(/revoke\s+(?:execute|all)\s+on\s+function\s+public\.(\w+)/g),
        // 005 builds its revokes with format(), so the signature is the literal.
        ...all.matchAll(/'public\.(\w+)\s*\(/g),
      ].map((m) => m[1]),
    );

    it("finds the functions to check", () => {
      expect(definerRpcs.length).toBeGreaterThan(0);
    });

    it.each(definerRpcs)("%s is revoked from public", (name) => {
      expect(revoked.has(name), `${name} keeps PostgreSQL's default grant to PUBLIC`).toBe(true);
    });
  });
});

describe("001 still defines the original schema", () => {
  const sql = read("001_initial_schema.sql");

  it.each(["submissions", "demo_events", "rate_limit_hits", "schema_migrations"])(
    "creates %s",
    (table) => {
      expect(sql).toContain(`create table if not exists public.${table}`);
    },
  );

  it("keeps the trigram index backing the admin search", () => {
    expect(sql).toContain("gin (search gin_trgm_ops)");
  });
});

describe("002 takes the purge off the request path", () => {
  const sql = read("002_rate_limit_window_index.sql");

  it("indexes the column the purge filters on", () => {
    // The primary key is (key, window_start); a predicate on window_start alone
    // cannot use it, so the purge was a sequential scan taking row locks.
    expect(sql).toContain("rate_limit_hits_window_idx");
    expect(sql).toContain("(window_start)");
  });

  it("exposes the purge as a schedulable function", () => {
    expect(sql).toContain("function public.purge_rate_limit_hits");
  });

  it("leaves check_rate_limit atomic", () => {
    // insert … on conflict … returning, in one statement.
    expect(sql).toContain("on conflict (key, window_start)");
    expect(sql).toContain("returning count into v_count");
  });
});

describe("every trigger is safe to re-run", () => {
  it("drops each trigger before creating it", () => {
    // `create trigger` has no `if not exists` before PostgreSQL 14.9, and
    // relying on the version would make re-running the directory a coin toss.
    const all = files.map(read).join("\n").toLowerCase();
    const created = [...all.matchAll(/create\s+trigger\s+(\w+)/g)].map((m) => m[1]);
    expect(created.length).toBeGreaterThan(0);
    for (const trigger of created) {
      expect(all, `${trigger} is created without being dropped first`).toContain(
        `drop trigger if exists ${trigger}`,
      );
    }
  });
});

describe("004 gives every account a profile it does not control", () => {
  const sql = read("004_auth_profiles.sql");

  it("keys the profile to the account and removes it with the account", () => {
    // One statement makes an erasure request a single delete rather than a
    // checklist, and makes an orphaned profile impossible.
    expect(sql).toContain("create table if not exists public.profiles");
    expect(sql).toMatch(/id\s+uuid primary key references auth\.users \(id\) on delete cascade/);
  });

  it("carries the fields the account area renders", () => {
    for (const column of ["email", "full_name", "avatar_url", "role", "created_at", "updated_at"]) {
      expect(sql, column).toContain(column);
    }
  });

  it("creates the profile in the database, not in the sign-up route", () => {
    // "Every authenticated user automatically receives a profile" is only true
    // if it also happens for an account created through the Supabase
    // dashboard, or by a provider, or by anything else that never runs our
    // code.
    expect(sql).toContain("create trigger on_auth_user_created");
    expect(sql).toContain("after insert on auth.users");
  });

  it("backfills accounts that existed before the table did", () => {
    expect(sql).toContain("from auth.users u");
    expect(sql).toContain("on conflict (id) do nothing");
  });

  it("keeps the duplicated email address in step with the account", () => {
    expect(sql).toContain("create trigger on_auth_user_email_changed");
    expect(sql).toContain("after update of email on auth.users");
  });

  it("constrains role to exactly the roles the application knows", () => {
    // The two must move together: a role added to one and not the other is
    // either a value the database rejects or one the application cannot read.
    const declared = sql.match(/check \(role in \(([^)]+)\)\)/)?.[1];
    expect(declared, "no check constraint on role").toBeTruthy();
    const sqlRoles = declared!.split(",").map((r) => r.trim().replace(/'/g, ""));
    expect(sqlRoles.sort()).toEqual([...ROLES].sort());
  });

  it("defaults a new profile to the least-privileged role", () => {
    expect(sql).toMatch(/role\s+text not null default 'user'/);
  });

  describe("a user cannot award themselves a role", () => {
    it("takes away the table-wide update privilege", () => {
      // A table-wide grant permits updating *any* column, and a column-level
      // revoke does not narrow it — column revokes only remove column grants.
      // So the whole grant goes and the editable columns come back.
      expect(sql).toContain("revoke update on public.profiles from authenticated");
      expect(sql).toContain("grant update (full_name, avatar_url) on public.profiles to authenticated");
    });

    it("grants no insert or delete, so no row can be forged or removed", () => {
      expect(sql).not.toMatch(/grant\s+insert[^;]*to authenticated/);
      expect(sql).not.toMatch(/grant\s+delete[^;]*to authenticated/);
    });

    it("keeps a trigger as the backstop if those grants are ever restored", () => {
      expect(sql).toContain("create trigger profiles_role_immutable");
      expect(sql).toContain("current_user in ('anon', 'authenticated')");
    });

    it("revokes everything from the anon role", () => {
      expect(sql).toContain("revoke all on public.profiles from anon");
    });
  });

  it("answers 'is this caller an administrator' without recursing", () => {
    // An RLS predicate that reads its own table re-enters the policy that
    // called it. Definer rights break the loop; the pinned search_path is
    // asserted for every such function above.
    expect(sql).toContain("create or replace function public.is_admin()");
    expect(sql).toContain("stable");
  });

  it("lets an administrator read every row and everybody else exactly one", () => {
    expect(sql).toContain("create policy profiles_select_own");
    expect(sql).toContain("create policy profiles_select_admin");
  });

  it("checks the row after an update as well as before it", () => {
    // `using` alone says which rows may be touched. Without `with check`, a
    // caller could take the row they are allowed to edit and hand the result
    // to somebody else's id.
    const update = sql.match(/create policy profiles_update_own[\s\S]*?;/)?.[0] ?? "";
    expect(update).toContain("using");
    expect(update).toContain("with check");
  });
});

describe("003 moves aggregation into Postgres", () => {
  const sql = read("003_aggregate_functions.sql");

  it("counts distinct sessions per step rather than returning rows", () => {
    expect(sql).toContain("function public.demo_funnel");
    expect(sql).toContain("count(distinct e.session_id)");
  });

  it("returns all four admin counts from one function", () => {
    expect(sql).toContain("function public.submission_stats");
    for (const column of ["lead", "contact", "subscribe", "last_7_days"]) {
      expect(sql, column).toContain(column);
    }
  });
});
