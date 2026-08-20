-- 006_demo_event_retention.sql
--
-- Retention for `demo_events`, and the erasure index the admin delete needs.
--
-- Idempotent. Safe to re-run.
--
-- ---------------------------------------------------------------------------
-- Why demo_events has a retention period and submissions does not
-- ---------------------------------------------------------------------------
-- The two tables hold different things and the difference decides the policy.
--
-- `submissions` holds names, email addresses and messages that people sent
-- deliberately, expecting a reply. How long the operator may keep them is a
-- legal question about legitimate interest and stated purpose, not an
-- engineering one, and it is open as PROJECT-PLAN H12. Nothing here answers it:
-- guessing a number and enforcing it in SQL would be a decision made by
-- whoever happened to write the migration.
--
-- `demo_events` holds a step name, a timestamp, and a random id the client
-- mints per visit and never stores. There is no person in it — no address, no
-- fingerprint, nothing that survives a page reload — which is why the demo
-- funnel needs no cookie banner. That also means the raw rows have no value
-- once they have been counted: `demo_funnel()` aggregates them, and an
-- aggregate does not get better for having last year's rows underneath it.
--
-- So this is not a privacy period, it is a garbage collection policy, and it
-- can be set here without asking anybody. 90 days is chosen to be longer than
-- any window the funnel page shows and long enough to compare a quarter
-- against the one before it.

-- --------------------------------------------------------------- the purge

-- Mirrors `purge_rate_limit_hits` from 002 deliberately: same shape, same
-- default-plus-override argument, same integer return. An operator who has
-- scheduled one already knows how to schedule this.
--
-- The interval is an argument with a default rather than a constant in the
-- body, so a shorter period is a change to the schedule and not a change to
-- the schema. `returns integer` so a scheduled run can be observed — a purge
-- that reports nothing is indistinguishable from a purge that never ran.
create or replace function public.purge_demo_events(
  p_older_than interval default interval '90 days'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.demo_events where created_at < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- `demo_events_created_at_idx` from 001 already covers the range scan this
-- does, so no index is added for it.

-- ------------------------------------------------- privileges on the purge

-- The same reasoning as 005, applied to the function that file could not know
-- about. PostgreSQL grants EXECUTE on a new function to PUBLIC, and this one
-- runs with the owner's rights and *deletes*. Left open, the project's anon key
-- — which Supabase intends to be shipped to browsers — would let anybody erase
-- the operator's telemetry, and `purge_demo_events('0 seconds')` erases all of
-- it in one call.
--
-- Written with the same existence checks as 005 so that a stock PostgREST
-- install, which has none of Supabase's roles, still applies this file.
do $$
declare
  client_role text;
  target      text := 'public.purge_demo_events(interval)';
begin
  execute format('revoke all on function %s from public', target);

  foreach client_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = client_role) then
      execute format('revoke all on function %s from %I', target, client_role);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute format('grant execute on function %s to service_role', target);
  end if;
end
$$;

-- ------------------------------------------------------- erasure by primary key

-- `submissions.id` is the primary key, so the index the admin erasure needs is
-- already there. This is a comment rather than a statement so that the absence
-- is a recorded decision instead of an oversight: `delete from submissions
-- where id = $1` is an index scan on the primary key and needs nothing added.

comment on function public.purge_demo_events(interval) is
  'Deletes demo_events older than the given interval (default 90 days). '
  'Returns the number of rows removed. Schedule with pg_cron; see docs/DATA.md.';

insert into public.schema_migrations (version) values ('006')
  on conflict (version) do nothing;
