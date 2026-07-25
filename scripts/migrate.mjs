#!/usr/bin/env node
/**
 * Apply pending database migrations.
 *
 * Audit P4: the database was defined by a single apply-once file with no record
 * of what had been applied to which environment. This reads
 * db/migrations/NNN_*.sql in numeric order, asks the database which versions it
 * already has, and runs the rest.
 *
 *   npm run db:migrate
 *   npm run db:migrate -- --dry
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment. Never
 * prints either.
 *
 * Statements are sent over PostgREST's SQL surface where available. Supabase
 * does not expose arbitrary SQL over PostgREST by default, so when that call is
 * refused this prints the files to paste into the SQL editor rather than
 * pretending to have applied them.
 */

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "db", "migrations");

const dryRun = process.argv.includes("--dry");

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.\n" +
      "  Load them from .env.local, or paste the migrations into the SQL editor.",
  );
}

/** `002_rate_limit_window_index.sql` → `002` */
function versionOf(file) {
  const match = file.match(/^(\d+)_/);
  if (!match) fail(`Migration filename must start with a number: ${file}`);
  return match[1];
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort((a, b) => versionOf(a).localeCompare(versionOf(b)));

if (!files.length) fail(`No migrations found in ${DIR}`);

async function appliedVersions() {
  const res = await fetch(`${url}/rest/v1/schema_migrations?select=version`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  // A missing table means nothing has ever been applied.
  if (res.status === 404 || res.status === 400) return new Set();
  if (!res.ok) fail(`Could not read schema_migrations: HTTP ${res.status}`);
  const rows = await res.json();
  return new Set(rows.map((r) => String(r.version)));
}

const applied = await appliedVersions();
const pending = files.filter((f) => !applied.has(versionOf(f)));

console.log(`\n  ${applied.size} migration(s) already applied.`);

if (!pending.length) {
  console.log("  Nothing to do — the database is up to date.\n");
  process.exit(0);
}

console.log(`  ${pending.length} pending:\n`);
for (const file of pending) console.log(`    ${file}`);

if (dryRun) {
  console.log("\n  --dry: nothing was changed.\n");
  process.exit(0);
}

// Supabase does not expose arbitrary SQL over PostgREST, and inventing a
// transport here would be guessing. Print what to run rather than claiming to
// have run it — a migration runner that silently does nothing is worse than no
// runner at all.
console.log(`
  This project talks to Postgres over PostgREST, which does not accept
  arbitrary SQL. Apply the pending files in the Supabase SQL editor, in the
  order listed above:

    supabase.com/dashboard → your project → SQL Editor → New query

  Each file records itself in schema_migrations, so re-running this command
  afterwards will confirm they landed.
`);

for (const file of pending) {
  console.log(`\n${"=".repeat(72)}\n-- ${file}\n${"=".repeat(72)}\n`);
  console.log(readFileSync(path.join(DIR, file), "utf8"));
}
