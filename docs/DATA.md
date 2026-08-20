# Data — what is collected, where it lives, and how to remove it

**Scope: every piece of personal data this application can hold.** If something
is not on this page, the application does not store it. That is a claim the
repository is meant to make checkable, so each row below names the code that
does the storing.

Written for two readers: the operator answering a subject access or erasure
request, and anyone auditing whether the site's privacy copy is true.

---

## What is collected

| What | Where it comes from | Stored in | Written by |
|---|---|---|---|
| Name, email, country, account type | `/get-started` | `public.submissions` (`kind = 'lead'`) | [`lib/api-forms.ts`](../lib/api-forms.ts) |
| Name, email, topic, message | `/contact` | `public.submissions` (`kind = 'contact'`) | same |
| Email address | Newsletter form | **nothing** — see below | same |
| Email address, password hash | `/register` | Supabase `auth.users` | Supabase GoTrue |
| Email address, display name, role | a profile row per account | `public.profiles` | trigger in [`004`](../db/migrations/004_auth_profiles.sql) |
| A random per-visit id, a step name, a timestamp | `/demo` | `public.demo_events` | [`lib/analytics.ts`](../lib/analytics.ts) |
| A hashed rate-limit key | every rate-limited request | `public.rate_limit_hits` | [`lib/rate-limit.ts`](../lib/rate-limit.ts) |

### The newsletter stores nothing

The newsletter form validates the address, tells the reader plainly that
nothing was kept, and discards it. There is no mailing list, because this is a
concept build and there is no company to send from. Holding addresses for a
newsletter nobody can send would be collecting personal data under a promise
nobody could keep. [`tests/forms-collect-nothing.test.ts`](../tests/forms-collect-nothing.test.ts)
fails if that ever changes silently.

### `demo_events` is not personal data

The session id is minted in the browser once per visit and stored nowhere — not
in a cookie, not in `localStorage`, not on the server beside anything
identifying. It cannot be joined to a person, to a previous visit, or to
another table. The events are skipped entirely under Do Not Track.

This is the reason the site needs no cookie banner: there is no first-party
analytics cookie and no third-party tracker of any kind. No tag manager, no
analytics SDK, no pixel.

### What is deliberately *not* stored

- **No IP addresses.** The rate limiter hashes the caller's address with a
  secret and keeps only the hash, so a bucket cannot be read back into an
  address.
- **No passwords.** Supabase holds the hash; this application never sees a
  password after the request that set it.
- **No payment data.** There are no payments — the financial product is
  simulated.
- **No third-party analytics.** Fonts are self-hosted at build time, so not even
  a font request leaves the visitor's browser.

---

## Where it lives

**Production:** one Supabase Postgres project. The application reaches it over
HTTPS via PostgREST; there is no direct database connection.

**Development:** newline-delimited JSON under `.data/`, described in
[`.data/README.md`](../.data/README.md). `createStore()` refuses to build this
store when `NODE_ENV=production` — silently degrading to it is how leads went
missing before audit B1.

**Backups:** whatever the Supabase project's Point-in-Time Recovery is set to.
A restore brings deleted rows back, so an erasure is not complete until it has
passed out of the backup window. Say so when answering a request.

---

## Who can read it

| Table | `anon` key | Signed-in customer | Operator |
|---|---|---|---|
| `submissions` | nothing | nothing | everything, via `/admin` |
| `demo_events` | nothing | nothing | aggregate only, via `/admin/funnel` |
| `rate_limit_hits` | nothing | nothing | — |
| `profiles` | nothing | **their own row only** | every row, if their role is `admin` |

"Nothing" is enforced by Postgres, not by the application. Every table has Row
Level Security enabled. `submissions`, `demo_events` and `rate_limit_hits` have
**no policies at all**, which makes them unreadable with the anon key whatever
query is sent; the application reads them with the service-role key from server
code only. `profiles` has policies, and every one is `to authenticated` and
constrained by `auth.uid()` or `is_admin()` —
[`tests/migrations.test.ts`](../tests/migrations.test.ts) fails if a policy ever
grants anything to `anon` or `public`.

A customer cannot read another customer's profile even if a route handler asks
for it. That is the property RLS is there for, and it is why authentication
uses the anon key plus the user's own token rather than the service-role key.

**`/admin` is one shared password.** There is one operator. Access is
`ADMIN_PASSWORD` plus an HMAC-signed 8-hour session cookie, rate-limited
against guessing at five attempts per fifteen minutes.

---

## How long it is kept

| Table | Retention | Enforced by |
|---|---|---|
| `demo_events` | **90 days** | `purge_demo_events()` — [`006`](../db/migrations/006_demo_event_retention.sql) |
| `rate_limit_hits` | **1 day** | `purge_rate_limit_hits()` — [`002`](../db/migrations/002_rate_limit_window_index.sql), plus inline housekeeping |
| `submissions` | **not set** | — |
| `profiles`, `auth.users` | until the account is deleted | cascade from `auth.users` |

**`submissions` has no retention period, and that is not an oversight.** How
long an operator may keep a name and an email address someone sent expecting a
reply is a legal question about stated purpose and legitimate interest, not an
engineering one. Whoever writes that number has to be the person entitled to
choose it. The mechanism is ready — one function mirroring
`purge_demo_events()` — and [`tests/data-retention.test.ts`](../tests/data-retention.test.ts)
asserts that nobody has quietly invented a period in the meantime.

`demo_events` gets a period without asking anybody because it holds no person:
the raw rows have no value once `demo_funnel()` has counted them, so 90 days is
garbage collection, not privacy policy.

---

## Answering a request

### Erasure (GDPR Article 17)

**A form submission.** `/admin` → search for the address → **Delete**. The
endpoint answers 404 rather than redirecting if it removed nothing, so a
success is a real success. The deletion is recorded as
`admin.submission.deleted` with the id and never the content — which is what
lets you evidence the request without copying the data into a log.

Deletion is hard. There is no `deleted_at` flag whose filtering a future query
might forget.

**A customer account.** Delete the user in the Supabase dashboard. `profiles.id`
is a foreign key to `auth.users` with `on delete cascade`, so the profile goes
with it in the same statement — the whole reason the schema is shaped that way.

**Both.** They are separate stores and a person may be in both. Search
`/admin` *and* the Supabase user list.

Then check the backup window: PITR will still hold the row until it passes out
of retention.

### Access (Article 15)

`/admin` → search → **View payload** shows the complete stored record. For an
account, the profile row is everything this application holds; `auth.users`
holds the address, the confirmation timestamps and the password hash.

`/api/admin/export?q=<address>` gives the same thing as CSV.

### Rectification (Article 16)

A customer changes their own name at `/account`. The `authenticated` database
role holds `update` on `full_name` and `avatar_url` and on no other column, so
a request to change a role fails at Postgres rather than at a check in the
application.

---

## If the data has already leaked

The repository is **public**. Treat any personal data that reaches a tracked
file as disclosed.

1. `.data/*` is gitignored with only `README.md` re-included, and
   [`tests/data-retention.test.ts`](../tests/data-retention.test.ts) asks git
   itself whether each store file is ignored — reading the ignore rules and
   reasoning about them is exactly how this goes wrong, because an ignored
   *directory* is one git never descends into and a negation inside it silently
   does nothing.
2. If a `.jsonl` file was committed, removing it in a later commit does not
   remove it from history. That is a history rewrite and a force-push, which is
   the maintainer's call, not an automatic remedy.
3. Secrets are a separate incident: see
   [Secret rotation](./RUNBOOK.md#secret-rotation).
