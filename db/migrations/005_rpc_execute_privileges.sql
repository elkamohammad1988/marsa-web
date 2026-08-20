-- 005_rpc_execute_privileges.sql
--
-- Close the EXECUTE grants on the definer-rights functions that 001-003
-- created, so the anon key cannot call them.
--
-- Idempotent. Safe to re-run.
--
-- ---------------------------------------------------------------------------
-- What this is fixing
-- ---------------------------------------------------------------------------
-- PostgreSQL grants EXECUTE on a newly created function to PUBLIC, and Supabase
-- projects additionally carry default privileges that grant it to `anon` and
-- `authenticated`. Migration 004 noticed this and revoked it for `is_admin()`:
--
--     revoke execute on function public.is_admin() from public;
--     grant  execute on function public.is_admin() to authenticated;
--
-- The same reasoning was never applied to the four functions 001-003 added, and
-- for those it is not a latent problem the way it was for `is_admin()`. That one
-- answers `false` to an anonymous caller because `auth.uid()` is null. These four
-- take no account of who is calling, and they run with the *owner's* rights — so
-- the tables underneath, which are deliberately unreadable (RLS on, no policies),
-- are reachable through them by anybody holding the project's anon key. That key
-- is public by design: Supabase intends it to be shipped to browsers, and this
-- application ships it the moment SUPABASE_ANON_KEY is configured for the
-- account area.
--
-- What that allowed, concretely:
--
--   public.submission_stats()      exact counts of every stored lead, contact and
--                                  subscriber, plus the last-7-days volume — from
--                                  a table whose whole security model is that the
--                                  anon key can read nothing in it.
--   public.demo_funnel()           the same disclosure for the demo telemetry.
--   public.check_rate_limit(...)   a *write*, bypassing RLS. An anonymous caller
--                                  could inflate any bucket it could name and
--                                  deny service through it — `admin-login:global`
--                                  is a fixed string, so the operator could be
--                                  locked out of /admin indefinitely — and grow
--                                  rate_limit_hits without bound.
--   public.purge_rate_limit_hits() a *delete*, bypassing RLS. One call resets
--                                  every limiter in the system, which is the
--                                  cross-instance guarantee audit S1 exists for.
--
-- ---------------------------------------------------------------------------
-- Why it is written as a loop rather than eight plain statements
-- ---------------------------------------------------------------------------
-- Two portability facts, and being wrong about either turns a hardening
-- migration into one that fails half way and leaves the rest unapplied.
--
--   • `revoke ... on function` raises an error when the function does not
--     exist. 001-003 are meant to be applied first, but a database that skipped
--     one — or a stock PostgREST install that never had 004's Supabase-only
--     objects — must still get through this file.
--   • `anon`, `authenticated` and `service_role` are Supabase's roles. 001-003
--     are provider-neutral and run on any PostgREST front end, where naming a
--     role that does not exist is an error.
--
-- So each object and each role is checked before it is named. `to_regprocedure`
-- returns null rather than raising for an unknown signature, which is what makes
-- the check possible at all.
--
-- ---------------------------------------------------------------------------
-- Why service_role is granted back explicitly
-- ---------------------------------------------------------------------------
-- `service_role` has BYPASSRLS, and that is often mistaken for "may do
-- anything". It is not: BYPASSRLS turns off row-level policies and has no
-- bearing on function EXECUTE privileges. On a project without Supabase's
-- default privileges, `service_role` reaches these functions only through the
-- PUBLIC grant being revoked here — so revoking without this grant would break
-- the admin dashboard, the funnel page and the shared rate limiter, which are
-- the only callers and all of which authenticate with the service-role key.

do $$
declare
  target      text;
  client_role text;
  targets     text[] := array[
    'public.check_rate_limit(text, integer, integer)',
    'public.purge_rate_limit_hits(interval)',
    'public.demo_funnel()',
    'public.submission_stats()'
  ];
  -- The roles a browser can reach the database as. `authenticated` is included
  -- deliberately: a signed-in customer has no more business resetting the rate
  -- limiter or counting the operator's leads than an anonymous visitor does.
  client_roles text[] := array['anon', 'authenticated'];
begin
  foreach target in array targets loop
    if to_regprocedure(target) is null then
      raise notice 'skipping %, which does not exist in this database', target;
      continue;
    end if;

    execute format('revoke all on function %s from public', target);

    foreach client_role in array client_roles loop
      if exists (select 1 from pg_roles where rolname = client_role) then
        execute format('revoke all on function %s from %I', target, client_role);
      end if;
    end loop;

    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', target);
    end if;
  end loop;
end
$$;

insert into public.schema_migrations (version) values ('005')
  on conflict (version) do nothing;
