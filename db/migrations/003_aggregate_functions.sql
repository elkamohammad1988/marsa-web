-- 003_aggregate_functions.sql
--
-- Audit B3 and B4: two aggregations that were being done in Node over rows
-- pulled across HTTP, when Postgres can answer both in one round trip.
--
-- Idempotent. Safe to re-run.

-- ------------------------------------------------------------------ B3 funnel

-- PostgresDemoAnalyticsStore.funnel() issued
--   select session_id,step,created_at order by created_at desc limit 20000
-- and aggregated in Node. Both consuming pages are force-dynamic, so that ran
-- on every view with no caching.
--
-- The correctness problem was worse than the performance one. At 20,001 events
-- the query keeps the most RECENT 20,000, which drops the earliest sessions'
-- 'start' rows while retaining their later steps. `starts` then undercounts and
-- completionRate — completions / starts — can exceed 100%. Silently.
--
-- Counting distinct sessions per step in Postgres is exact at any volume, and
-- the (step, session_id) index from 001 already supports it.
create or replace function public.demo_funnel()
returns table (step text, sessions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select e.step, count(distinct e.session_id) as sessions
  from public.demo_events e
  group by e.step;
$$;

-- ------------------------------------------------------------ B4 admin stats

-- SubmissionStore.stats() fired four independent HEAD count queries and list()
-- was a fifth. Promise.all made wall-clock one round trip rather than five, but
-- it was still five TLS handshakes and five PostgREST invocations per render of
-- a force-dynamic page — and it is the shape that becomes an N+1 the moment
-- someone adds per-row detail.
--
-- One row, four numbers, one round trip. Counted with FILTER rather than four
-- scans, so the table is read once.
create or replace function public.submission_stats()
returns table (
  lead        bigint,
  contact     bigint,
  subscribe   bigint,
  last_7_days bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where s.kind = 'lead')                          as lead,
    count(*) filter (where s.kind = 'contact')                       as contact,
    count(*) filter (where s.kind = 'subscribe')                     as subscribe,
    count(*) filter (where s.created_at >= now() - interval '7 days') as last_7_days
  from public.submissions s;
$$;

insert into public.schema_migrations (version) values ('003')
  on conflict (version) do nothing;
