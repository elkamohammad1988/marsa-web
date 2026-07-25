-- 001_initial_schema.sql
--
-- Target: PostgreSQL 14+ behind PostgREST (Supabase works out of the box).
-- Apply with the runner in db/README.md, or paste into the Supabase SQL editor.
-- Every statement is idempotent, so re-running it is safe.
--
-- Security model: Row Level Security is ON with no policies, so the anon /
-- public key can read nothing. The app talks to this database only from server
-- code using the service-role key, which bypasses RLS. Never expose that key
-- to the browser.

-- Applied-migration ledger. Every migration records itself at the end, so a
-- database can report what it has rather than being guessed at (audit P4).
create table if not exists public.schema_migrations (
  version     text primary key,
  applied_at  timestamptz not null default now()
);

alter table public.schema_migrations enable row level security;

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------- submissions

create table if not exists public.submissions (
  id          text primary key,
  kind        text not null check (kind in ('lead', 'contact', 'subscribe')),
  created_at  timestamptz not null default now(),
  data        jsonb not null default '{}'::jsonb,
  meta        jsonb,
  -- Flattened copy of `data` values, written by the app, for cheap search.
  search      text not null default ''
);

create index if not exists submissions_created_at_idx
  on public.submissions (created_at desc);

create index if not exists submissions_kind_created_at_idx
  on public.submissions (kind, created_at desc);

-- Trigram index so `search ilike '%needle%'` in the admin stays fast.
create index if not exists submissions_search_trgm_idx
  on public.submissions using gin (search gin_trgm_ops);

alter table public.submissions enable row level security;

-- ------------------------------------------------------------- demo funnel

-- Anonymous first-party telemetry for the /demo flow. No PII: session_id is a
-- random per-visit id minted client-side. Aggregated by unique session per step.
create table if not exists public.demo_events (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  step        text not null check (step in ('start','kyc','iban','payout','convert','done')),
  created_at  timestamptz not null default now()
);

create index if not exists demo_events_created_at_idx
  on public.demo_events (created_at desc);

create index if not exists demo_events_step_session_idx
  on public.demo_events (step, session_id);

alter table public.demo_events enable row level security;

-- ------------------------------------------------------------- rate limiting

create table if not exists public.rate_limit_hits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limit_hits enable row level security;

-- Atomically records one hit and returns the remaining allowance.
-- A negative result means the caller is over the limit for this window.
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

  -- Occasional housekeeping instead of a cron job: cheap in aggregate.
  if random() < 0.01 then
    delete from public.rate_limit_hits where window_start < now() - interval '1 day';
  end if;

  return p_limit - v_count;
end;
$$;

insert into public.schema_migrations (version) values ('001')
  on conflict (version) do nothing;
