# Database

PostgreSQL 14+ behind PostgREST. Supabase works out of the box.

## Migrations

`db/migrations/NNN_description.sql`, applied in ascending numeric order.

| Version | What it does |
|---|---|
| `001_initial_schema.sql` | `submissions`, `demo_events`, `rate_limit_hits`, their indexes, RLS, `check_rate_limit()`, and the `schema_migrations` ledger |
| `002_rate_limit_window_index.sql` | Index on `rate_limit_hits(window_start)`; splits the purge into `purge_rate_limit_hits()` and takes it off the hot path (audit B7) |
| `003_aggregate_functions.sql` | `demo_funnel()` and `submission_stats()` — aggregation in Postgres rather than in Node over rows pulled across HTTP (audit B3, B4) |

Before this existed there was one apply-once file with no record of what had
been applied where (audit P4). Every `create table if not exists` is safe to
re-run, but that same idempotency means the file could not express a *change* —
adding a column or a constraint to a live table had no home.

### Rules

- **Migrations are append-only.** Never edit a file that has been applied
  anywhere; add the next number instead.
- **Every migration is idempotent.** `create table if not exists`,
  `create index if not exists`, `create or replace function`. Re-running the
  whole directory must be a no-op.
- **Every migration records itself**, ending with an `insert` into
  `schema_migrations` guarded by `on conflict do nothing`. That makes the ledger
  self-maintaining and correct even for a migration applied by hand before the
  runner existed.

### Applying them

```sh
# Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment.
npm run db:migrate           # apply everything not yet recorded
npm run db:migrate -- --dry  # list what would run, change nothing
```

Or paste each file into the Supabase SQL editor in numeric order — the ledger is
maintained either way, because each file records itself.

### Checking what is applied

```sql
select version, applied_at from public.schema_migrations order by version;
```

## Verifying the security model

RLS is enabled with **no policies** on every table, so the anon key can read
nothing. The app reaches the database only from server code using the
service-role key, which bypasses RLS.

```sql
select
  c.relname               as table_name,
  c.relrowsecurity        as rls_enabled,
  count(p.polname)        as policy_count,
  (c.relrowsecurity and count(p.polname) = 0) as locked_down
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('submissions', 'demo_events', 'rate_limit_hits', 'schema_migrations')
group by c.relname, c.relrowsecurity
order by c.relname;
```

Every row must report `locked_down = true`.

## Scheduled maintenance

`purge_rate_limit_hits()` should be scheduled rather than relied on
opportunistically. `check_rate_limit()` still calls it on roughly 0.1% of
invocations as a backstop, so the table cannot grow without bound if nobody
schedules it — but that call, however cheap, sits in a visitor's request.

With `pg_cron` available:

```sql
create extension if not exists pg_cron;
select cron.schedule('purge-rate-limit-hits', '17 * * * *',
                     $$select public.purge_rate_limit_hits()$$);
```
