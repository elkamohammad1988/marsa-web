# Authentication

Customer accounts for Marsa: Supabase Auth over HTTP, an HMAC-signed
`httpOnly` session cookie, and a role model enforced in Postgres.

This document is the architecture, the setup, and the parts that need a human.
For the admin area — a separate, single-operator password boundary that this
does **not** replace — see `lib/admin-auth.ts`.

---

## The shape of it

```
components/auth/          sign-in, registration, recovery forms + shared hook
components/account/       profile form, sign-out
app/(auth)/               /login /register /forgot-password /reset-password /verify-email
app/account/              the signed-in area; /account/admin is role-gated
app/auth/confirm/         where every link in a Supabase email lands
app/api/auth/             register · login · logout · forgot-password · resend-verification
app/api/account/          profile · password
lib/
  auth-config.ts          endpoints + keys, or null; refuses a weak secret
  gotrue.ts               the Supabase Auth REST client (no SDK)
  auth-session.ts         the signed session envelope — Edge-safe
  auth.ts                 getSession / requireSession / requirePermission
  auth-roles.ts           roles, permissions, the grant table
  auth-routes.ts          the route policy, safeRedirect, notice codes
  profiles.ts             profile reads and writes, always as the user
  api-auth.ts             the preamble every auth endpoint shares
  signed-cookie.ts        HMAC + constant-time compare, shared with the admin session
middleware.ts             both gates: admin, and account
db/migrations/004_auth_profiles.sql
```

---

## Four decisions, and why

### 1. No Supabase SDK

`lib/gotrue.ts` speaks to the Auth REST API with `fetch`, in the same shape as
the `lib/postgrest.ts` that has been talking to the database since the start.

The deciding reason is **the tokens never reach the browser**. `@supabase/ssr`
keeps the session in cookies its browser client is meant to read, so they
cannot be `httpOnly`. Nothing here authenticates from the browser — every call
is a route handler or a server component — so the cookie is `httpOnly`, and an
XSS bug cannot read the session.

Two smaller reasons: `@supabase/supabase-js` brings a second PostgREST client
that would sit beside the existing one with different timeout, error and
escaping behaviour; and the README's "four runtime dependencies" is a claim,
which this repository keeps true.

The trade is real: this is code we own, against an API we do not control. It is
eight endpoints, no state, no refresh scheduling, no storage adapter — and
every one is exercised in `tests/gotrue.test.ts`.

### 2. Our own signed envelope around Supabase's tokens

The cookie carries `{ userId, email, role, accessToken, refreshToken,
accessExpiresAt, expiresAt }`, base64url-encoded and signed with
HMAC-SHA256 under `AUTH_SESSION_SECRET`.

Middleware has to answer "signed in, and as what role" before every protected
page, on the Edge runtime, without a network call. Verifying Supabase's own JWT
there would mean either putting its signing secret in the environment — a
secret whose disclosure forges *any* user — or fetching a JWKS and implementing
ES256 verification. An HMAC over our own payload is one `crypto.subtle` call,
uses a secret that signs nothing else, and reuses the primitive the admin
session has run on since audit S5.

What it gives up, stated plainly: a session Supabase has revoked still verifies
here until its access-token expiry passes — at most an hour. That is the same
window a verified Supabase JWT would give, because a JWT cannot be revoked
mid-life either. What closes it is that every read of real data goes to
Postgres with the access token attached, so a revoked session gets an
authenticated-looking page and no data, and the refresh that follows fails and
clears the cookie.

Two clocks, deliberately. `accessExpiresAt` is Supabase's hour and drives
renewal. `expiresAt` is an absolute 30-day ceiling that renewal does **not**
extend — without it, a session in daily use never ends and a captured refresh
token is good forever.

### 3. Renewal happens in middleware

A server component cannot set a cookie. Middleware is the only place in a
request that can both notice an access token is expiring and hand the
replacement back — so renewal anywhere else would mean sessions that silently
stop working an hour after sign-in.

The renewed cookie is written onto the request as well as the response
(`NextResponse.next({ request })`). Without that, the page rendering *this*
request still reads the old cookie — and after a long absence that token is
already expired, so the first page someone sees on returning fails to load any
data, once, for no visible reason.

Renewal also re-reads the role, so a change of role takes effect within an hour
rather than waiting out the 30-day session.

**A failed renewal is not automatically a sign-out.** Two very different
things arrive at the same `catch`, and treating them alike is an outage. GoTrue
*rejecting* the token — spent, revoked, past the timebox — comes back as a 4xx
and is final, so the cookie goes. A timeout, a refused connection or a 5xx says
nothing about the session; clearing on those would sign out every visitor whose
access token happened to be inside the 60-second renewal window, turning an
incident measured in seconds at Supabase into one every customer notices. The
session is kept, the request proceeds on the credential it already holds, and
the next request tries again.

### 4. The database decides who may read what

`profiles` has Row Level Security with policies scoped to `authenticated` and
constrained by `auth.uid()` or `is_admin()`. Every profile read and write in
`lib/profiles.ts` is made with the **user's own access token**, never the
service-role key.

So `listProfiles` is written as "select every profile" with no role filter, and
returns the whole directory to an administrator and exactly one row to everyone
else. If the role in a session cookie were ever wrong, `/account/admin` would
open and show one row.

Migrations 001–003 deliberately had **zero** policies — correct while every row
belonged to the operator. The property that rule protected is kept and stated
more precisely: no policy grants anything to `anon` or `public`, and every
policy is constrained by the caller's identity. `tests/migrations.test.ts`
asserts exactly that.

**What this section is, and is not.** Everything above describes how migration
`004` is *written* to behave, verified by reading the SQL and by unit tests that
run `lib/profiles.ts` against a stubbed PostgREST. It is **not** a result
measured against a running Postgres: no Supabase project is connected to this
build, which is why `/api/health` reports `database: configured:false` and why
the deployed demo has no clickable sign-in. The policies are prepared
infrastructure — reviewed and tested, applied nowhere. Read the reasoning above
as a design under test, and re-verify it against a live database before relying
on it in a product that holds real user records.

---

## The flows

### Registration

```
POST /api/auth/register
  ↓ same-origin check · rate limit (email ceiling) · shared validation
  ↓ GoTrue POST /signup?redirect_to=<site>/auth/confirm
  ↓ trigger on auth.users INSERT → public.profiles row, role 'user'
  → { ok, next: "/verify-email?email=…" }        (confirmation required)
  → { ok, next: "/account" } + session cookie    (confirmation switched off)
```

Both outcomes are handled rather than assumed: which one happens is a Supabase
dashboard setting that can change without a deploy.

The response is identical whether or not the address already has an account.
GoTrue arranges half of that by returning a decoy user with no identities; this
route completes it by rendering the same outcome either way.

### Email confirmation and password recovery

```
email link → GET /auth/confirm?token_hash=…&type=…[&next=…]
  ↓ GoTrue POST /verify  { type, token_hash }
  ↓ read role from profiles
  → 303 to next (default /account) + session cookie
```

Both flows land on the same route, distinguished by `type`. `next` is reduced
to a same-origin path by `safeRedirect` even though the link came from our own
template — a link is forwardable, and `next` is whoever forwards it.

### Sign-in

```
POST /api/auth/login
  ↓ same-origin check
  ↓ rate limit per address (3 escalating tiers + global ceiling)
  ↓ shared validation
  ↓ rate limit per account (HMAC of the address, so the limiter stores no email)
  ↓ GoTrue POST /token?grant_type=password
  ↓ read role from profiles
  → { ok, next } + session cookie
```

Every credential failure gives one sentence. GoTrue distinguishes "no such
user" from "wrong password" from "email not confirmed"; relaying any of it
would make this the account-enumeration endpoint for the site. The sign-in page
therefore carries a permanent "need a new confirmation email?" link, so the one
case a person can act on is reachable without anyone being told which case they
are in.

### Sign-out

A real `<form method="post">`, so it works before hydration and with
JavaScript disabled — signing out is the control where "it did nothing" is
least acceptable. The cookie is cleared whether or not revoking the refresh
token upstream succeeds.

---

## Roles

Two today: `user` and `admin`. **No component or route compares against a role
name** — they ask whether a role carries a permission, and the answer comes
from one table in `lib/auth-roles.ts`.

| Permission | user | admin |
|---|:---:|:---:|
| `profile:read` | ✓ | ✓ |
| `profile:write` | ✓ | ✓ |
| `accounts:read` | | ✓ |

Adding a role is a row in `ROLE_PERMISSIONS` and a value in the `role` check
constraint (as migration 005). `tests/migrations.test.ts` asserts the two lists
agree, so they cannot drift.

A role is **granted in the database and nowhere else**:

- `role` is a column, not user metadata — metadata is writable by the user it
  describes, which is the classic way an account system grows a privilege
  escalation.
- `authenticated` holds no `UPDATE` privilege on that column. The table-wide
  grant is revoked and only `(full_name, avatar_url)` is granted back — a
  column-level revoke against a table-wide grant does nothing, which is the
  detail that makes this work.
- A trigger refuses a role change from `anon` or `authenticated` as a backstop
  if those grants are ever restored.

To promote someone, in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

---

## Setup

### 1. Environment

```sh
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<the anon / publishable key>
AUTH_SESSION_SECRET=<64 hex characters: openssl rand -hex 32>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`SUPABASE_ANON_KEY`, not the service-role key. The service-role key bypasses
RLS, which is exactly wrong here: every profile read must be made *as the user*
so the database is what decides whose row they see. `lib/auth-config.ts` never
reads it.

With any of the three missing, every auth page renders a setup panel instead of
a form and the account area stays closed. With a secret shorter than 32
characters, the same — reported through `captureException`, because an area
that silently stays shut is the failure that looks like nothing.

### 2. Apply the migration

```sh
npm run db:migrate -- --dry   # lists what would run
```

Then paste `db/migrations/004_auth_profiles.sql` into the Supabase SQL editor.
It is idempotent and records itself in `schema_migrations`.

Note that 004 requires migrations 001–003 to have been applied first: it writes
to the `schema_migrations` table that 001 creates.

### 3. Two Supabase dashboard settings — these cannot be set from code

**a. Redirect allow-list.** *Authentication → URL Configuration → Redirect
URLs*. Add:

```
http://localhost:3000/auth/confirm
https://<your production origin>/auth/confirm
```

Without these, Supabase refuses the `redirect_to` the app sends and the links
in its emails go to the site root.

**b. Email templates.** *Authentication → Email Templates*. In **Confirm
signup** and **Reset password**, replace the `{{ .ConfirmationURL }}` link
with:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

(the first for Confirm signup, the second for Reset password.)

This is the one piece of setup with a real architectural reason behind it.
`{{ .ConfirmationURL }}` sends the reader to GoTrue's own `/verify`, which
bounces them back with the tokens in the URL **fragment** — and a fragment is
never sent to a server. A server-rendered app cannot see it, so completing the
flow would need client JavaScript to read `location.hash` and post the tokens
back, putting a credential into the page, into browser history, and into any
`Referer` that page later sends. `{{ .TokenHash }}` moves the whole exchange to
the server.

### 4. Confirm it works

Register at `/register`, follow the link in the email, and you should land on
`/account` signed in. Then:

```sql
-- every profile is locked down to its owner
select tablename, policyname, roles, cmd
from pg_policies where tablename = 'profiles';
```

Every row must show `{authenticated}` — never `{anon}` or `{public}`.

---

## Security notes

| Concern | Where it is handled |
|---|---|
| Unauthorised access | `middleware.ts` route policy (deny by default under a protected prefix) + `requireSession` in each layout + RLS in the database |
| Session forgery | HMAC-SHA256 over the envelope, constant-time compare (`lib/signed-cookie.ts`) |
| Session leak via XSS | `httpOnly` — no script can read the cookie; no Supabase token exists in browser JavaScript |
| Insecure cookies | `secure` in production, `SameSite=Lax`, `Path=/`, `Max-Age` tied to the absolute session expiry |
| CSRF | `SameSite=Lax` plus an explicit `Sec-Fetch-Site` / `Origin` check on every state-changing endpoint (`lib/same-origin.ts`) |
| Privilege escalation | `role` is a database column with no `UPDATE` privilege for `authenticated`, plus a trigger backstop; the session role is never authoritative for data |
| Open redirect | `safeRedirect` — path-only, rejecting `//`, `\`, control characters and over-long values |
| Account enumeration | Registration, recovery and re-send answer identically for known and unknown addresses; sign-in gives one sentence for every credential failure |
| Credential stuffing | Escalating per-address tiers, per-account tiers keyed by an HMAC of the address, and global ceilings (`lib/api-rate-limit.ts`) |
| Host-header injection | Email links are built from the configured site origin, never from the request's `Host` |
| Reflected content | Sign-in notices are looked up from a closed set; the page never renders text from the URL |
| Weak passwords | 12 characters minimum, 72 bytes maximum (bcrypt's real ceiling), never the account's own address |
| Cached credentials | `attachSession` and `detachSession` set `Cache-Control: no-store`, so **every** response carrying a session cookie is unstorable by construction rather than by each caller remembering |
| Personal data in logs | `lib/observability.ts` redacts an event's context but not the error's own message, and GoTrue's messages are built from a response we do not control — so the client strips anything address-shaped before the error is constructed |
| Upstream amplification | `/auth/confirm` is unauthenticated and calls Supabase on every hit, so it is rate-limited per address like the rest |

### Rate limiting, and the ceiling that is not there

Three shapes, and one deliberate omission.

- **Per address**, in escalating tiers — a burst trips the short window, a
  grinder trips a longer one. Stops one machine working through a list.
- **Per account**, keyed by an HMAC of the address so the limiter table never
  holds a customer's email. Stops a distributed attempt on one known account,
  which trips no per-address tier at all, and caps mail to one inbox.
- **No ceiling shared by all callers.** This is the omission, and it is the
  point. A global limit is only safe on a door with a single user: the admin
  login has one, because tripping it inconveniences the one operator who can
  wait fifteen minutes. On a public endpoint the same limit is a switch any
  anonymous caller can throw to stop everybody else — `auth-signin:global` at
  200 per 15 minutes meant roughly fourteen requests a minute would keep the
  entire customer base locked out indefinitely, and the registration ceiling
  was shared with password recovery, so one burst blocked both.

  The residual risk is a distributed attacker burning outbound email quota
  across many addresses. Supabase rate-limits its own sending, which is the
  right place for that ceiling: it is the resource being protected, and
  exhausting it degrades email rather than blocking every sign-in.

### Deliberately not built

- **Multi-factor authentication.** Supabase supports TOTP enrolment; adding it
  is a second milestone's worth of enrolment, recovery-code and
  step-up-challenge work, and half of it would be worse than none.
- **OAuth providers.** `profiles.avatar_url` and the metadata plumbing are in
  place for one, but no provider is wired.
- **Email change.** It is a credential change needing its own re-confirmation
  flow, not a profile edit; `/api/account/profile` deliberately has no field
  for it.
- **Rendering a remote avatar.** The column exists and any provider that
  supplies one will populate it, but the Content-Security-Policy allows images
  from `'self'` and `data:` only, so a remote avatar would be blocked by the
  browser. Widening the CSP for third-party image hosts is a real trade and the
  maintainer's call; the account page shows initials.
