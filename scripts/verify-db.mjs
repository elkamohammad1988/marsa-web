#!/usr/bin/env node
/**
 * Report what a database actually contains, without changing anything.
 *
 *   npm run db:verify
 *
 * ── Why this exists ────────────────────────────────────────────────────────
 * `npm run db:migrate -- --dry` answers from `schema_migrations`, and that
 * ledger is only trustworthy once the migration system has been the sole way
 * the schema ever changed. On a project whose first schema was applied from a
 * single `schema.sql` before the ledger existed, it reports "0 applied, 6
 * pending" for a database that plainly has tables in it — which is misleading
 * in the more dangerous direction, because it makes a half-migrated database
 * look untouched.
 *
 * So this asks the database what it *has* rather than what it remembers being
 * given: which tables PostgREST exposes, which functions it exposes, and
 * therefore which migrations have really landed.
 *
 * ── Strictly read-only ─────────────────────────────────────────────────────
 * One `GET` for the OpenAPI description PostgREST publishes at its root. No
 * row is read, no function is called, nothing is written. That matters: half
 * the functions below *mutate* — `check_rate_limit` inserts, and
 * `purge_rate_limit_hits` deletes — so probing them by invocation would mean a
 * verification tool with side effects on production.
 *
 * Never prints a URL or a key.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "db", "migrations");

/**
 * What each migration adds, as objects PostgREST can be asked about.
 *
 * Derived from the SQL by hand rather than parsed from it, deliberately: a
 * parser would agree with a migration that is wrong about itself, and the
 * point of a verifier is to be an independent statement of what should be
 * there. `tests/migrations.test.ts` asserts this list stays in step with the
 * files.
 */
const EXPECTED = {
  "001": {
    file: "001_initial_schema.sql",
    tables: ["schema_migrations", "submissions", "demo_events", "rate_limit_hits"],
    functions: ["check_rate_limit"],
    why: "the three tables, the migration ledger, and the shared rate limiter",
  },
  "002": {
    file: "002_rate_limit_window_index.sql",
    tables: [],
    functions: ["purge_rate_limit_hits"],
    why: "the rate-limit window index and its purge",
  },
  "003": {
    file: "003_aggregate_functions.sql",
    tables: [],
    functions: ["submission_stats", "demo_funnel"],
    why: "aggregation in Postgres instead of over HTTP (audit B3, B4)",
  },
  "004": {
    file: "004_auth_profiles.sql",
    tables: ["profiles"],
    functions: ["is_admin"],
    why: "customer accounts, their RLS policies, and the role check",
  },
  "005": {
    file: "005_rpc_execute_privileges.sql",
    tables: [],
    functions: [],
    why: "closes the EXECUTE grants 001-003 left open to the public anon key",
    // Nothing new to see: it only revokes privileges. Its application is
    // recorded in the ledger, which is the sole evidence available over
    // PostgREST — see the note printed below.
    privilegeOnly: true,
  },
  "006": {
    file: "006_demo_event_retention.sql",
    tables: [],
    functions: ["purge_demo_events"],
    why: "90-day retention for demo telemetry",
  },
};

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "  Load them from .env.local:  set -a; . ./.env.local; set +a; npm run db:verify",
  );
}

/** Tables and RPCs PostgREST currently exposes, from its own description. */
async function describeSchema() {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      accept: "application/openapi+json",
    },
    cache: "no-store",
  });
  if (!res.ok) fail(`Could not read the PostgREST schema description: HTTP ${res.status}`);

  const body = await res.json();
  const paths = Object.keys(body.paths ?? {});
  return {
    tables: new Set(paths.filter((p) => p !== "/" && !p.startsWith("/rpc/")).map((p) => p.slice(1))),
    functions: new Set(paths.filter((p) => p.startsWith("/rpc/")).map((p) => p.slice(5))),
  };
}

/** The ledger's own opinion, or null when the table is not there to ask. */
async function ledgerVersions() {
  const res = await fetch(`${url}/rest/v1/schema_migrations?select=version`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return new Set(rows.map((r) => String(r.version)));
}

const onDisk = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const unknown = onDisk.filter((f) => !EXPECTED[f.slice(0, 3)]);
if (unknown.length) {
  fail(
    `These migrations are not described in scripts/verify-db.mjs: ${unknown.join(", ")}.\n` +
      "  Add them to EXPECTED so the verifier can check for them.",
  );
}

const schema = await describeSchema();
const ledger = await ledgerVersions();

console.log("\n  Live database — what it actually contains\n");

let missingAny = false;
const results = [];

for (const version of Object.keys(EXPECTED).sort()) {
  const spec = EXPECTED[version];
  const missingTables = spec.tables.filter((t) => !schema.tables.has(t));
  const missingFunctions = spec.functions.filter((f) => !schema.functions.has(f));
  const inLedger = ledger?.has(version) ?? false;

  // A privilege-only migration adds no object, so the ledger is the only
  // evidence PostgREST can offer. Reported as unknown rather than as applied:
  // claiming otherwise would be inventing success.
  const state = spec.privilegeOnly
    ? inLedger
      ? "applied"
      : "unverifiable"
    : missingTables.length || missingFunctions.length
      ? "missing"
      : "applied";

  if (state !== "applied") missingAny = true;
  results.push({ version, spec, state, missingTables, missingFunctions, inLedger });

  const mark = state === "applied" ? "OK     " : state === "missing" ? "MISSING" : "UNKNOWN";
  console.log(`  ${mark}  ${version}  ${spec.why}`);
  if (missingTables.length) console.log(`           tables absent:    ${missingTables.join(", ")}`);
  if (missingFunctions.length)
    console.log(`           functions absent: ${missingFunctions.join(", ")}`);
  if (state === "unverifiable") {
    console.log("           revokes privileges only, so nothing new to look for.");
    console.log("           Not in the ledger, so it cannot be confirmed from here.");
  }
}

console.log("");

if (ledger === null) {
  console.log(
    "  The schema_migrations ledger does not exist. This database was built\n" +
      "  before the migration system, so `db:migrate --dry` will report every\n" +
      "  migration as pending regardless of what is really there. Trust the\n" +
      "  lines above, and re-run this after applying 001 to get a ledger.\n",
  );
} else {
  const claimed = [...ledger].sort().join(", ") || "(empty)";
  console.log(`  Ledger says applied: ${claimed}\n`);
  for (const r of results) {
    if (r.state === "missing" && r.inLedger) {
      console.log(
        `  WARNING  ${r.version} is recorded in the ledger but its objects are absent.\n` +
          "           Something dropped them, or the migration failed part way.\n",
      );
    }
  }
}

if (missingAny) {
  console.log("  To apply what is missing, in order:\n");
  for (const r of results) {
    if (r.state === "applied") continue;
    console.log(`    db/migrations/${r.spec.file}`);
  }
  console.log(
    "\n  Every file is idempotent, so applying one that is already there is safe.\n" +
      "  See docs/RUNBOOK.md -> Applying migrations for the exact procedure.\n",
  );

  // A non-zero exit so this can gate a deploy script. `npm run db:verify` is a
  // check, and a check that always succeeds is not one.
  process.exitCode = 1;
} else {
  console.log("  Every migration's objects are present.\n");
}

/*
 * Let the process end on its own, having set `exitCode` — never `process.exit()`.
 *
 * Node's `fetch` keeps its sockets in a pool, and calling `process.exit()` while
 * one is still open makes libuv abort on Windows with
 * `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`. That abort replaces
 * the exit code this script just decided, so a script whose whole job is to
 * report a verdict would report the wrong one. Releasing the sockets first lets
 * the event loop drain and the chosen code stand.
 */
const dispatcher = globalThis[Symbol.for("undici.globalDispatcher.1")];
await dispatcher?.close?.().catch(() => {});
