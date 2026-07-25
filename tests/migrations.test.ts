import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

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

  it("never creates a row level security policy", () => {
    // The whole model is "RLS on, zero policies", so the anon key can read
    // nothing. A policy would be the thing that quietly opens it up.
    const all = files.map(read).join("\n").toLowerCase();
    expect(all).not.toContain("create policy");
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
