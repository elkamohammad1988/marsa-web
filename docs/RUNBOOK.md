# Runbook — `marsa-web`

**For whoever is on the other end of an alert.** Every procedure below assumes
you have the hosting dashboard and the Supabase project, and nothing else.

This file answers three questions: *what is broken*, *what does that break for
a visitor*, and *what do I do now*. It does not explain the architecture — that
is [`README.md`](../README.md) and [`AUTHENTICATION.md`](../AUTHENTICATION.md).

---

## First: read `/api/health`

```bash
curl -s https://<your-host>/api/health | jq
```

It answers **200 `ok`** or **503 `degraded`**, and reports two booleans per
dependency and nothing else. That is deliberate (audit S2): the endpoint is
unauthenticated, so it must not describe the storage backend, the directory
layout, or the upstream provider's HTTP status to a stranger.

```json
{
  "status": "degraded",
  "checks": {
    "storage":       { "ok": false, "configured": false },
    "fx":            { "ok": true,  "configured": true  },
    "notifications": { "ok": true,  "configured": false },
    "admin":         { "ok": true,  "configured": true  },
    "database":      { "ok": true,  "configured": false }
  }
}
```

Read the pair, not the flag:

| `configured` | `ok` | Means |
|---|---|---|
| `false` | `false` | Not set up. Intentional on the public demo; an incident in production. |
| `true` | `false` | Set up and **failing right now**. Always an incident. |
| `true` | `true` | Working. |

**The real reason for any failure is never in this response.** It is in the
captured event, in the platform log, on the line whose `event` field names the
check that failed. That is the pairing to search for:

| Check | Search the log for |
|---|---|
| `storage` | `storage.health`, `storage.write`, `admin.submissions.unreadable` |
| `fx` | `health.fx`, `rates.latest`, `rates.history` |
| `notifications` | `notify.` |
| `database` | `storage.stats.degraded`, `rateLimit.degraded` |

Every log line is one JSON object with `event`, `severity`, `message`,
`context` and `timestamp`. `severity` is `error`, `warning` or `info` — `info`
is not a quiet error, it marks something that went *right* and is worth being
able to prove later, which today means an erasure.

---

## Playbooks

### `storage.configured: false` in production

**Visitor impact: total for the forms.** `/get-started`, `/contact` and the
newsletter refuse the submission rather than accepting one they cannot keep —
that refusal is audit finding B1 and is correct behaviour, not a second bug.
The operator sees `Storage: none · not configured` on `/admin`, above the
message naming the variables.

1. Set `SUPABASE_URL` **and** `SUPABASE_SERVICE_ROLE_KEY` in the host's
   environment. Both, or neither: half the pair is refused at boot by
   `validateEnvironment`, because half a pair is the shape that boots, serves
   traffic, looks healthy and quietly stores nothing.
2. Neither may carry a `NEXT_PUBLIC_` prefix. The service-role key bypasses Row
   Level Security; a `NEXT_PUBLIC_` prefix ships it to every browser. The
   environment validator refuses to start if it finds one.
3. Redeploy. Confirm `/api/health` reports `storage.configured: true`.

### `storage.ok: false` with `configured: true`

**Visitor impact: total for the forms, and the cause is upstream.**

1. Check the Supabase project is not paused — a free-tier project pauses after
   inactivity and every request then times out at 8 seconds.
2. Search the log for `storage.health`. A `PostgrestError` carries the HTTP
   status and up to 300 characters of the response body, which is where the
   real reason is.
3. `PGRST202 … function public.submission_stats … not found` means the
   migrations were never applied to this project. See
   [Applying migrations](#applying-migrations). The dashboard still renders —
   `stats()` falls back to four counts — so this degrades rather than breaks.
4. `no response within 8000ms` is a network or a paused project, not a schema
   problem.

**Recovering submissions that were refused.** Nothing is lost silently. Every
failed write logs the whole submission through `console.info` with a
`[submission:<kind>]` prefix, *before* throwing — deliberately through the
platform log rather than the error reporter, because the line contains personal
data and must not be forwarded to a third party. To recover:

```bash
# In the platform's log search, over the incident window:
[submission:lead]
```

Each match is one complete JSON record, ready to re-insert.

### `fx.ok: false`

**Visitor impact: contained.** The converter shows an error with a retry, the
ticker renders nothing, and the demo's conversion step degrades. No other page
is affected and no data is at risk.

1. The upstream is `api.frankfurter.dev` (European Central Bank data, key-less).
   Check it directly: `curl -s https://api.frankfurter.dev/v1/latest?base=EUR`.
2. Search the log for `rates.latest` or `rates.history`. The visitor is shown a
   fixed sentence and the real reason — provider identity, HTTP status, DNS
   failure, timeout — is in the captured event only.
3. There is nothing to do but wait, unless `FX_API_BASE` has been set to
   something wrong.

### `notifications.configured: false`

**Visitor impact: none.** Submissions are stored either way; email is a side
effect that can never block an intake. Set `RESEND_API_KEY` and `RESEND_FROM`
together — either alone disables mail with no signal at all, which is why the
environment validator rejects the half-configured pair.

### The admin area is locked out

`ADMIN_LOGIN_TIERS` allows 5 attempts per 15 minutes per address, 10 per hour,
20 per day, plus a global ceiling of 50 per 15 minutes across every caller.
The global ceiling is safe only because there is exactly one operator; tripping
it locks the door for that one person, who can wait.

If you are locked out and cannot wait, the shared limiter lives in Postgres:

```sql
-- Clears the bucket for every limiter, not just admin login.
select public.purge_rate_limit_hits(interval '0 seconds');
```

If the password itself is lost, set a new `ADMIN_PASSWORD` (16 characters
minimum) and redeploy.

### An admin session must be ended immediately

A stolen laptop, a session left open on a shared machine.

**Do not rotate `ADMIN_SESSION_SECRET` for this.** Rotating the secret asserts
the signing key may have leaked; this asserts a session may have. Conflating
them is what used to make revocation a redeploy.

1. Set `ADMIN_SESSION_VERSION` to any new value — a date reads better than a
   number, e.g. `2026-08-19`.
2. Restart. Every existing admin session is refused at its next request; the
   operator signs in again. The 8-hour expiry is unchanged.

### A GDPR erasure request

1. Sign in to `/admin`.
2. Find the record — the search box matches across every submitted value.
3. **Delete** in the last column. The endpoint answers 404 rather than
   redirecting if it removed nothing, so a success is a real success.
4. The deletion is recorded as `admin.submission.deleted` with the id and *not*
   the content, which is what lets you show later that the request was honoured
   without copying the personal data into a log.

Deletion is hard, not a flag. There is no `deleted_at` column to un-set.

### The whole site is down

1. `/api/health` unreachable at all → hosting platform, not this application.
2. Reachable but every page 500 → check the log for `app.render` (the root
   error boundary) and `global.render` (the layout boundary, which is the one
   that fires when the *layout* failed).
3. `EnvironmentError` at boot means a variable is present but wrong. The message
   names every problem at once, one line per variable. This is a refusal to
   start, not a crash — fix the named variables and redeploy.

---

## Applying migrations

Migrations are numbered, idempotent, and record themselves in
`public.schema_migrations`. Re-running one is safe.

```bash
# What the database actually has:
select version, applied_at from public.schema_migrations order by version;
```

```bash
# Apply everything missing:
npm run db:migrate
```

Or paste each file into the Supabase SQL editor in order. What each one is for:

| | |
|---|---|
| `001` | Tables, indexes, the rate limiter. RLS on, **no policies** — nothing is readable with the anon key. |
| `002` | Rate-limit window index and `purge_rate_limit_hits()`. |
| `003` | `submission_stats()` and `demo_funnel()` — aggregation in Postgres rather than over HTTP. |
| `004` | Customer accounts: `profiles`, its triggers, and the RLS policies. Supabase-specific. |
| `005` | Closes the EXECUTE grants `001`–`003` left open to the anon key. |
| `006` | `purge_demo_events()` — 90-day retention for the telemetry. |

**`005` is not optional.** Without it, anyone holding the project's anon key —
a key Supabase intends to be public — can call `check_rate_limit` and
`purge_rate_limit_hits`, which are a write and a delete running with the
owner's rights.

## Rollback

There is no database rollback script, and that is a decision rather than an
omission: every migration is additive, and a `down` migration that drops a
column is a way to lose data during an incident. To roll back a *deploy*, use
the host's previous deployment — the schema is forward-compatible with it.

The one exception is `006`, which only adds a function; dropping it is safe:

```sql
drop function if exists public.purge_demo_events(interval);
```

## Scheduled jobs

Neither is required for correctness — both tables have inline housekeeping —
but both are worth scheduling once traffic justifies it.

```sql
-- Requires the pg_cron extension.
select cron.schedule('purge-rate-limits', '0 3 * * *',
  $$select public.purge_rate_limit_hits(interval '1 day')$$);

select cron.schedule('purge-demo-events', '30 3 * * 0',
  $$select public.purge_demo_events(interval '90 days')$$);
```

Both return the number of rows removed, so a run that did nothing is
distinguishable from a run that never happened.

---

## Secret rotation

Five secrets. Rotating one should never require rotating another.

| Secret | Rotate when | Cost of rotating |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | It may have been exposed. It bypasses RLS entirely. | Redeploy. No user-visible effect. |
| `SUPABASE_ANON_KEY` | Rarely — it is public by design and carries no privilege. | Redeploy. |
| `AUTH_SESSION_SECRET` | It may have been exposed. It is the one value that would let anybody forge a session for any account. | **Every customer is signed out.** 32 characters minimum. |
| `ADMIN_SESSION_SECRET` | It may have been exposed. | Every admin session ends. 32 characters minimum. |
| `ADMIN_PASSWORD` | On a schedule, or on suspicion. | The operator signs in again. 16 characters minimum. |

To end admin sessions *without* rotating anything, bump
`ADMIN_SESSION_VERSION` — see [above](#an-admin-session-must-be-ended-immediately).

**Generate with a machine, not a keyboard:**

```bash
openssl rand -hex 32
```

**Preview and production must not share secrets.** A preview deployment is
reachable by anyone with the URL and is built from an unreviewed branch. Give
it its own `ADMIN_PASSWORD` and its own Supabase project, or give it none at
all and let the authenticated areas stay shut — which is what the public demo
does, and why it reports `degraded` honestly rather than pretending.

Nothing is rotated by editing a tracked file. Every secret lives in the host's
environment; `.env.local` is gitignored and `.env.example` holds only
placeholders. The repository is public.
