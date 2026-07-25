-- 002_rate_limit_window_index.sql
--
-- Audit B7: rate-limit housekeeping ran an unindexed full-table DELETE inside
-- the request path.
--
-- The primary key on public.rate_limit_hits is (key, window_start). A predicate
-- on window_start alone cannot use a composite index whose leading column is
-- key, so the purge inside check_rate_limit() was a sequential scan taking row
-- locks — executed on 1% of calls, which means on 1% of form submissions, while
-- a visitor waited for the response. "Cheap in aggregate" held while the table
-- was small and stopped holding exactly when the site got traffic.
--
-- Idempotent. Safe to re-run.

create index if not exists rate_limit_hits_window_idx
  on public.rate_limit_hits (window_start);

-- ------------------------------------------------------------- purge, split out

-- Standalone so it can be scheduled (pg_cron, or a Supabase scheduled job)
-- instead of running in a visitor's critical path. Returns the number of rows
-- removed so a scheduled run can be observed rather than assumed.
create or replace function public.purge_rate_limit_hits(
  p_older_than interval default interval '1 day'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  delete from public.rate_limit_hits where window_start < now() - p_older_than;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- --------------------------------------------------------- limiter, rewritten

-- Same contract as 001: record one hit, return the remaining allowance, negative
-- when over the limit. Two changes.
--
-- First, the inline purge now runs on 0.1% of calls rather than 1%, and the
-- index above turns it from a sequential scan into a range scan.
--
-- Second, it is kept at all rather than removed outright. The audit preferred
-- moving it to pg_cron entirely, and purge_rate_limit_hits() above exists
-- precisely so that can be scheduled. But leaving *no* inline purge makes the
-- table's growth depend on someone remembering to schedule a job, and an
-- unbounded table is a worse failure than an indexed range scan on one call in
-- a thousand. Once the scheduled job is running, this costs effectively nothing.
create or replace function public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count  integer;
begin
  if p_window_seconds is null or p_window_seconds < 1 then
    p_window_seconds := 60;
  end if;

  -- Align to a fixed window so concurrent callers share the same bucket.
  v_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limit_hits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start)
    do update set count = r.count + 1
  returning count into v_count;

  if random() < 0.001 then
    perform public.purge_rate_limit_hits();
  end if;

  return p_limit - v_count;
end;
$$;

insert into public.schema_migrations (version) values ('002')
  on conflict (version) do nothing;
