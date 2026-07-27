-- 004_auth_profiles.sql
--
-- Customer accounts: one profile row per authenticated user, the role that
-- drives authorisation, and the Row Level Security that decides — in the
-- database, not in the application — who may read which row.
--
-- Target: Supabase specifically, unlike 001-003. It reads `auth.users` and
-- calls `auth.uid()`, both of which are Supabase's auth schema rather than
-- stock PostgREST. That is the point: authentication is the one place where
-- being provider-neutral would mean reimplementing a credential store.
--
-- Idempotent. Safe to re-run.
--
-- ---------------------------------------------------------------------------
-- Why this migration adds RLS *policies*, when 001-003 deliberately had none
-- ---------------------------------------------------------------------------
-- The rule so far was "RLS on, zero policies": every table is unreadable to
-- the anon key, and the application reaches the database only from server code
-- holding the service-role key, which bypasses RLS entirely. That is correct
-- when every row belongs to the operator — a form submission has no owner but
-- the business.
--
-- A profile does have an owner, and the difference matters. With the old model
-- the only thing standing between one customer's row and another's would be a
-- filter in a route handler, and a filter is something a future handler can
-- forget. With policies, the database refuses: a signed-in user's token yields
-- their row and nothing else, whatever query the application sends. The
-- application's own checks become defence in depth rather than the boundary.
--
-- So the property the old rule protected is kept and stated more precisely:
-- **no policy grants anything to `anon` or `public`.** Every policy below is
-- `to authenticated` and every one is constrained by `auth.uid()` or by
-- `is_admin()`. tests/migrations.test.ts asserts exactly that.

-- ------------------------------------------------------------------ profiles

-- `id` is the primary key and a foreign key to auth.users in one, so a profile
-- cannot exist without an account and cannot outlive one: deleting a user
-- deletes their profile, which is what makes an erasure request a single
-- statement rather than a checklist.
--
-- `email` is the one field duplicated from auth.users. The auth schema is not
-- exposed over PostgREST — by design, and rightly — so an administrator
-- listing accounts has no other way to see who they are. The two triggers
-- below keep the copy correct; nothing in the application writes it.
--
-- `role` is here rather than in the user's metadata because metadata is
-- writable by the user it describes. A role a user can set is not a role.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  full_name   text,
  -- Reserved for identity providers that supply one. Nothing in this build
  -- writes it and nothing renders it: the Content-Security-Policy allows
  -- images from 'self' and data: only, so a remote avatar would be blocked by
  -- the browser. Widening the CSP for third-party image origins is a real
  -- trade and the maintainer's call, so the column waits rather than the
  -- policy being loosened for a feature nobody asked for.
  avatar_url  text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The administrator's account list orders by this.
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

alter table public.profiles enable row level security;

-- ------------------------------------------------------------------ triggers

-- Every authenticated user automatically receives a profile. Doing this in the
-- database rather than in the sign-up route handler is what makes "automatic"
-- true: a profile then exists for an account created through the Supabase
-- dashboard, through a future OAuth provider, or through a password recovery
-- that predates this table — none of which run our code.
--
-- Definer rights, because the trigger fires while the caller is still
-- unauthenticated and `authenticated` has no insert privilege on profiles (nor
-- should it: that privilege is how a user would insert their own row with the
-- role of their choosing).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Keeps the duplicated address correct. Without this, changing an email in
-- Supabase leaves the administrator's account list showing the old one — a
-- stale copy that looks authoritative, which is worse than no copy.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = coalesce(new.email, '')
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email();

-- `updated_at` is maintained here rather than sent by the client, so it means
-- "when this row last changed" instead of "what the client claimed".
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row
  execute function public.touch_updated_at();

-- ------------------------------------------------------- privilege escalation

-- The column privileges below are the real guard, and this is the backstop for
-- the day somebody re-applies Supabase's default grants and quietly restores
-- table-wide UPDATE. A role a user can award themselves is not a role, and
-- this is the single statement that would let them.
--
-- Phrased as "no client-facing database role may change it" rather than as a
-- list of privileged roles, so that a new client role does not arrive
-- permitted by omission. Changing a role stays an operator action: an UPDATE
-- in the SQL editor, which connects as the owner.
create or replace function public.enforce_profile_role_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') then
    raise exception 'profiles.role may not be changed by %', current_user
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_immutable on public.profiles;
create trigger profiles_role_immutable
  before update on public.profiles
  for each row
  execute function public.enforce_profile_role_immutable();

-- ---------------------------------------------------------------- privileges

-- A table-wide UPDATE grant permits updating *any* column, and revoking one
-- column from it does nothing — column-level revokes only remove column-level
-- grants. So the table-wide grant goes and two columns come back. This is the
-- statement that makes `role` unwritable from a browser session.
revoke all on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- No insert and no delete grant, and no policy for either: profiles are
-- created by the trigger above and removed by the cascade from auth.users.

-- ---------------------------------------------------------------- policies

-- Definer rights so that a policy on profiles may call it without re-entering
-- the policy that called it — an RLS predicate that reads its own table
-- recurses until the server gives up. `stable` so the planner evaluates it
-- once per statement rather than once per row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- `(select auth.uid())` rather than a bare call: wrapping it lets the planner
-- evaluate it once for the statement instead of once per row.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
  on public.profiles
  for select
  to authenticated
  using (public.is_admin());

-- Permissive policies are OR-ed, so an administrator reads every row and
-- everybody else reads exactly one.

-- `with check` as well as `using`: without it a user could pass the row they
-- are allowed to edit into the update and hand the result to somebody else's
-- id. The two clauses answer different questions — which rows may I touch, and
-- what may they look like afterwards.
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ------------------------------------------------------------------ backfill

-- Accounts that existed before this table did. Without it, anyone who signed
-- up earlier has an account and no profile, and every profile read returns
-- nothing for them — an empty page with no error, which is the hardest kind of
-- bug to be told about.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'full_name', '')), ''),
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'avatar_url', '')), '')
from auth.users u
on conflict (id) do nothing;

insert into public.schema_migrations (version) values ('004')
  on conflict (version) do nothing;
