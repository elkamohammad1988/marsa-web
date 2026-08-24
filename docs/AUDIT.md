# Production Audit — `marsa-web`

**Scope:** the whole repository — then an un-versioned local working directory
named `figma`, which is finding P1 below and the reason this audit exists.
**Date:** 2026-07-25.
**Mode:** read-only. No file in the project was modified except the creation of this document.

**How findings were verified.** Every citation below points at code that was read in
full. Where a claim was checkable, it was checked rather than assumed:

| Check | Command | Result |
|---|---|---|
| Unit tests | `npx vitest run` | **94 passed / 94**, 10 files, 923 ms |
| Types | `npx tsc --noEmit` | **clean**, exit 0 |
| Lint | `npx next lint` | **0 warnings, 0 errors** (with a deprecation notice) |
| Prod dependencies | `npm audit --omit=dev` | **0 vulnerabilities** |
| Full dependency tree | `npm audit` | **13 high** — all in the ESLint 8 dev chain |
| Version control | `git rev-parse --is-inside-work-tree` | **fatal: not a git repository** |
| Asset integrity | `md5sum public/images/*.png` | 17 files, **6 unique images** |
| Contrast ratios | WCAG 2.x relative-luminance formula, computed by hand | see F2 |

Findings are grouped by axis and sorted by severity within each axis. Areas that
are already in good shape are called out in one line rather than padded into
problems.

---

## Step 1 — Inventory

### Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15.5.21, App Router + React Server Components | `package.json:15` |
| UI | React 19.2.6 | |
| Language | TypeScript 5.9.3, `strict: true`, `noEmit` | `tsconfig.json` — no `any` in the codebase |
| Package manager | npm (lockfile v3, `package-lock.json`, 274 KB) | |
| Styling | Tailwind CSS 3.4.17 + PostCSS + Autoprefixer | tokens as CSS custom properties |
| Charts | Recharts 2.15.4 | the only heavy runtime dep, lazily loaded |
| Database | PostgreSQL via PostgREST/Supabase, spoken over **HTTP** (no TCP driver) | `lib/postgrest.ts` |
| Fallback storage | newline-delimited JSON under `DATA_DIR` (default `.data/`) | `lib/storage.ts:95` |
| Tests | Vitest 4.1.10, node environment, `tests/**/*.test.ts` | `vitest.config.ts` |
| Lint | ESLint 8.57.1 + `eslint-config-next` (`next/core-web-vitals`) | `.eslintrc.json` |
| Hosting | Vercel — project `nowe-seo-site` | `.vercel/project.json` |
| CI | **none** | no `.github/`, no `.gitlab-ci.yml`, no `Jenkinsfile` |

Runtime dependencies total four: `next`, `react`, `react-dom`, `recharts`.
Everything else — Postgres access, HMAC session signing, CSV, IBAN validation,
rate limiting, email — is first-party code. That is a deliberate and well-executed
constraint.

### Directory structure

| Path | Responsibility |
|---|---|
| `app/` | App Router: 30+ marketing/tool/legal/blog routes, 9 API route handlers, the `/admin` area, `/demo`, plus `robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, `error.tsx`, `not-found.tsx` |
| `components/` | Presentation only, split into `ui/` (primitives), `sections/` (page blocks), `forms/`, `layout/`, `admin/`, `demo/`, `tools/`, `icons/` |
| `lib/` | All business logic and I/O: FX, storage, analytics, validation, auth, rate limiting, CSV, IBAN, SEO/schema, site + legal config |
| `db/` | `schema.sql` — three tables plus the `check_rate_limit()` function |
| `tests/` | 10 Vitest files, 951 lines, pure-logic units |
| `styles/` | `globals.css` — the entire design-token layer and utility classes |
| `scripts/` | `capture.mjs`, `render-icon.mjs` — local tooling, not part of the build |
| `public/` | 17 PNGs (2.2 MB) — see F1 and F9 |
| `.data/` | Local JSONL submission store; gitignored |
| `portfolio-screenshots/` | README/case-study imagery |

### Entry points, routing and data flow

**Rendering entry point** — `app/layout.tsx` wraps every route with `Navbar`,
`Footer`, `CookieConsent`, the organisation/website JSON-LD, a skip link, and a
pre-paint inline theme script (`app/layout.tsx:57`).

**Three data flows exist.**

1. **Form intake** (the only write path from the public internet)

   `GetStartedForm` / `ContactForm` / `NewsletterForm`
   → client-side `validate*()` from `lib/validation.ts` for instant feedback
   → `useFormSubmit` POSTs JSON (`components/forms/useSubmit.ts:33`)
   → `POST /api/leads` | `/api/contact` | `/api/subscribe`, each a 7-line wrapper
   → **`handleFormPost()`** (`lib/api-forms.ts`), which is the whole pipeline:
     shared rate limit → honeypot → **server-side re-validation (source of truth)**
     → `getStore().save()` → `notifySubmission()`
   → `PostgresSubmissionStore` (falls back to `FileSubmissionStore` on DB error)
   → Resend REST call, after storage, failure swallowed.

2. **FX reads**

   `RateTicker` (server component) calls `getRates()` directly.
   `CurrencyConverter` / `DemoFlow` (client) call `GET /api/rates` and
   `GET /api/rates/history`, which call `lib/fx.ts` → Frankfurter (ECB data),
   cached for an hour by the Next fetch cache and by `s-maxage=3600` at the edge.

3. **Admin reads**

   `POST /api/admin/login` → HMAC-signed cookie → `/admin`, `/admin/funnel`,
   `/demo/stats`, `GET /api/admin/export` each independently call
   `isAdminRequest()` → `SubmissionStore.list()/stats()` or
   `DemoAnalyticsStore.funnel()`.

**Telemetry**: `DemoFlow` fires `POST /api/demo/events` once per funnel step per
visit, with a random per-visit id, skipped under Do Not Track.

### Third-party services

| Service | Purpose | Auth | Failure mode |
|---|---|---|---|
| Frankfurter (`api.frankfurter.dev`) | ECB reference rates | key-less | ticker renders nothing; converter shows an error + retry |
| Supabase / PostgREST | submissions, demo events, shared rate limit | service-role key | falls back to the file store, logs |
| Resend | submission notification email | API key | logged, never fatal |
| Vercel | hosting | platform | — |
| Google Fonts | Inter + Space Grotesk | via `next/font`, **self-hosted at build**, no runtime request | — |

No analytics SDK, no tag manager, no third-party trackers of any kind. That is a
real and deliberate strength.

### Tests, linting, CI — current state

- **Tests**: 94 passing, covering `admin-auth`, `analytics`, `blog`, `csv`,
  `demo`, `fx`, `iban`, `notify`, `pagination`, `storage`. Pure-logic only — no
  component tests, no end-to-end tests. **`lib/validation.ts`, `lib/api-forms.ts`,
  `lib/rate-limit.ts` and `lib/postgrest.ts` have no tests at all** (see P5).
- **Lint**: clean. Config is minimal (`next/core-web-vitals` + `no-img-element`
  raised to error). `next lint` is deprecated and disappears in Next 16.
- **CI**: none. Every check above is manual.

---

## Step 2 — Findings

## SECURITY

### S1 — Admin login is rate-limited per-instance only, guarding an 8-character shared password · **High**

`app/api/admin/login/route.ts:22` · `lib/admin-auth.ts:26` · `lib/rate-limit.ts:19`

The login route uses `rateLimit` (in-memory), not `rateLimitShared` (Postgres-backed)
— the opposite of the three public form endpoints, which all use the shared limiter
via `lib/api-forms.ts:25`. The in-memory buckets live in a module-level `Map`
(`lib/rate-limit.ts:19`), so on Vercel each concurrent lambda instance enforces its
own 5-per-minute window. Concurrency is attacker-controllable, so the effective
ceiling is 5/min × instances, not 5/min.

The code comment at `app/api/admin/login/route.ts:15-19` argues in-memory is right
"because it must keep working even when the database is the thing that is broken."
That property is real, but `rateLimitShared` already provides it: on any RPC
failure it logs and returns the in-memory result (`lib/rate-limit.ts:63-69`). You
get both guarantees by using the shared limiter here.

Compounding it: the minimum password is 8 characters (`lib/admin-auth.ts:26`),
there is no lockout, no second factor, and one shared credential protects the
name, email, country and company of every person who ever filled in a form.

**Why it matters:** a single guessed password is a full PII breach with GDPR
notification consequences.

**Fix:** switch to `rateLimitShared` with a tighter window (5 per 15 minutes),
add a persisted failure counter with exponential backoff keyed on IP *and* a
global counter, raise the minimum length to 16, and document rotation.

---

### S2 — `/api/health` is unauthenticated and returns internal paths and raw database errors · **High**

`app/api/health/route.ts:19` · `lib/storage.ts:167,262` · `lib/postgrest.ts:64-67`

The endpoint has no auth check. Its `detail` strings are not sanitised:

- `lib/storage.ts:167` returns `` `writing to ${DATA_DIR}` `` — the absolute
  server filesystem path.
- `lib/storage.ts:262` returns `err.message` from a `PostgrestError`, which
  `lib/postgrest.ts:64-67` builds as
  `` `PostgREST ${status} on ${path}: ${body.slice(0, 300)}` `` — HTTP status,
  table name, and up to 300 characters of the upstream response body, which for
  Postgres errors includes column names, constraint names and hints.
- The FX check surfaces upstream status codes the same way.

`robots.ts:10` disallows `/api/`, which stops crawlers but not attackers.

**Why it matters:** free reconnaissance. It confirms the storage backend,
directory layout and schema before an attacker has authenticated to anything.

**Fix:** return only `{ status, checks: { <name>: { ok, configured } } }` to
anonymous callers, and gate the `detail` strings behind `isAdminRequest()` or a
`HEALTH_TOKEN` header for the uptime monitor.

---

### S3 — The Content-Security-Policy provides no XSS mitigation · **Medium**

`next.config.ts:28-31`

The policy is `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'`.
There is no `default-src`, `script-src`, `connect-src`, `img-src` or `style-src`,
so any injected script would execute freely. The comment explains the tradeoff
honestly — a `script-src` would break the inline theme script (`app/layout.tsx:67`)
and the JSON-LD blocks (`components/JsonLd.tsx:7`) without a nonce.

Two smaller points in the same block: `X-Frame-Options: SAMEORIGIN`
(`next.config.ts:14`) contradicts `frame-ancestors 'none'`. Modern browsers
honour the stricter CSP directive, so behaviour is correct, but the header pair
is inconsistent and will confuse the next reader.

**Why it matters:** the site's own XSS surface is currently small (React escapes
everything; both `dangerouslySetInnerHTML` uses are safe), but CSP is the layer
that contains a future mistake — and it also blocks injected third-party script
from exfiltrating form data on the very pages that collect PII.

**Fix:** the theme script is a compile-time constant, so a static
`'sha256-…'` covers it. Add
`default-src 'self'; script-src 'self' 'sha256-<hash>'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'`,
verify the JSON-LD blocks still validate (non-executable script types are treated
inconsistently across browsers — if they trip, move them to a nonce set in
middleware), and align `X-Frame-Options` to `DENY`.

---

### S4 — The `/demo/stats` share token is brute-forceable and leaks through logs · **Medium**

`app/demo/stats/page.tsx:27-34`

The comparison is correct — `safeEqual` is constant-time and a miss returns
`notFound()` rather than a distinguishable 401. But there is **no rate limit on
this page**, so an attacker gets unlimited guesses at `DEMO_STATS_TOKEN`. And
because the token travels in the query string it lands in Vercel access logs, CDN
logs, browser history, and the `Referer` header of any outbound link on the page.

**Why it matters:** the funnel exposes business telemetry (conversion rates,
drop-off) that a competitor or an investor-diligence counterparty would find
useful.

**Fix:** rate-limit the route with `rateLimitShared`, and exchange the token for
an httpOnly cookie on first use so it appears in exactly one log line instead of
every one.

---

### S5 — No `middleware.ts`: admin authorisation is opt-in per route · **Medium**

`app/admin/page.tsx:65` · `app/admin/funnel/page.tsx:20` · `app/api/admin/export/route.ts:11` · `app/demo/stats/page.tsx:33`

Every protected route calls `isAdminRequest()` itself. All four current call sites
are correct — this is not a live vulnerability. But the pattern is deny-by-omission:
a new file at `app/admin/anything/page.tsx` that forgets the call is silently
world-readable, and nothing in the type system, the linter or the tests would
catch it.

**Why it matters:** the failure mode is a page that quietly serves lead PII to
anyone who guesses the URL, with no error and no log line.

**Fix:** add `middleware.ts` with `matcher: ['/admin/:path*', '/api/admin/:path*']`
that verifies the session cookie signature and redirects/401s otherwise. Keep the
in-route checks as defence in depth.

---

### S6 — The public FX proxy endpoints have no rate limiting · **Medium**

`app/api/rates/route.ts:4` · `app/api/rates/history/route.ts:4`

Neither handler calls any limiter. Inputs are correctly allowlisted
(`lib/fx.ts:186,235` reject unsupported currencies; `isRangeId` constrains the
range), so there is no SSRF — but 30 currencies × 30 currencies × 6 ranges =
5,400 distinct cache keys an attacker can enumerate, each forcing a fresh upstream
request to a free, key-less, fair-use API from your egress IP, plus a billable
function invocation.

**Why it matters:** the FX provider is the dependency behind the homepage ticker,
the converter and the demo's headline feature. Getting your IP throttled degrades
three surfaces at once, and `RateTicker` responds by rendering nothing at all
(`components/sections/RateTicker.tsx:37`).

**Fix:** `rateLimitShared(clientKey(request.headers, 'rates'), { limit: 60, windowMs: 60_000 })`
on both routes. The generous limit costs legitimate users nothing.

---

### S7 — "Reject non-essential" has no effect on the demo telemetry · **Medium**

`components/CookieConsent.tsx:10-16,29-37` · `components/demo/DemoFlow.tsx:119-130`

The banner records the decision to localStorage and dispatches a
`marsa:cookie-consent` event. A repository-wide grep finds exactly one occurrence
of that event name — the `dispatchEvent` call itself. **Nothing listens.**
`DemoFlow` posts funnel events gated only on `navigator.doNotTrack`
(`components/demo/DemoFlow.tsx:123`), so a visitor who explicitly rejects
non-essential processing is still tracked through the funnel.

The telemetry itself is genuinely privacy-respecting — anonymous, cookieless,
disclosed in the sandbox banner (`components/demo/DemoFlow.tsx:228-229`). The
problem is the mismatch between what the UI promises and what the code does.

**Why it matters:** offering a rejection control that does nothing is worse than
offering none, both ethically and under GDPR Art. 7(3).

**Fix:** read `localStorage.getItem('marsa-cookie-consent')` in the DemoFlow
effect and skip the POST when it is `"rejected"`. See F7 for the broader question
of whether this banner should exist at all.

---

### S8 — `escapeLike` misses PostgREST's `*` wildcard · **Low**

`lib/postgrest.ts:143-145` · `lib/storage.ts:235-237`

The escape strips `%_,()` but not `*`, which is the wildcard PostgREST translates
into `%` for `ilike` filters. An admin searching for `acme*corp` gets a wildcard
match instead of a literal one. There is no injection risk — `encodeURIComponent`
at `lib/storage.ts:236` neutralises `&` and `=`, so no extra query parameters can
be smuggled in — only surprising results.

**Fix:** `value.replace(/[%_,()*]/g, " ")`.

---

### S9 — Cross-site forced admin logout · **Low**

`app/api/admin/logout/route.ts:8`

The route accepts any POST with no origin or CSRF check. `SameSite=Lax` prevents
the session cookie being *sent* cross-site, but the response's `Set-Cookie`
clearing the session is still honoured, so a malicious page can log an admin out.

**Why it matters:** nuisance only — no data is exposed and no state is altered
beyond ending a session.

**Fix:** reject when `Sec-Fetch-Site` is `cross-site`, or check `Origin` against
the request host.

---

### S10 — Submission identifiers use `Math.random()` · **Low**

`lib/storage.ts:288`

`newId()` returns `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`.
These are primary keys and are shown to recipients as "Reference" in notification
emails (`lib/notify.ts:48`). The timestamp prefix already discloses ordering, so
the practical leak is small, and collision probability is negligible.

**Fix:** `crypto.randomUUID()` — already used elsewhere in the codebase
(`components/demo/DemoFlow.tsx:96`), zero cost, removes the question entirely.

---

### Already solid — security

- **Server-side validation is genuinely the source of truth.** `lib/api-forms.ts:50`
  re-runs the same validator the client ran; nothing from the request body reaches
  storage without passing it.
- **No SQL string building anywhere.** PostgREST filters are assembled from
  allowlisted enum values plus `encodeURIComponent` (`lib/storage.ts:225-239`).
- **No secrets in the repo.** No `.env` or `.env.local` exists; `.gitignore:32-33`
  covers them; `.env.example` contains placeholders only and explicitly warns
  against prefixing the service-role key with `NEXT_PUBLIC_` (`.env.example:32-35`).
  No `NEXT_PUBLIC_` variable holds anything sensitive.
- **XSS surface is two lines, both safe.** `app/layout.tsx:67` injects a
  compile-time constant; `components/JsonLd.tsx:6` escapes `<` before serialising.
- **Session cookie handling is correct**: httpOnly, `SameSite=Lax`, `Secure` in
  production, HMAC-SHA256 over the expiry, constant-time verification
  (`lib/admin-auth.ts:55-90,114-122`).
- **CSV export is formula-injection safe** and RFC 4180 correct (`lib/csv.ts:14-21`).
- **Row Level Security is enabled with no policies** on all three tables, so the
  anon key can read nothing (`db/schema.sql:36,55,66`).
- **Production dependency tree is clean**: `npm audit --omit=dev` → 0 vulnerabilities.

---

## BACKEND QUALITY

### B1 — The zero-config production deploy silently discards every lead · **High**

`lib/storage.ts:270-276,99-115` · `lib/api-forms.ts:66-71` · `components/forms/useSubmit.ts:43-46`

`createStore()` returns `FileSubmissionStore` whenever `SUPABASE_URL` or
`SUPABASE_SERVICE_ROLE_KEY` is missing. On Vercel the filesystem is read-only, so
`fs.mkdir`/`fs.appendFile` throw, and the catch at `lib/storage.ts:105-114` writes
the submission to `console.info` and returns `{ persisted: false }`.

`handleFormPost` passes `persisted` back to the client (`lib/api-forms.ts:71`),
but `useFormSubmit` checks only `res.ok` (`components/forms/useSubmit.ts:43-46`),
so the visitor sees the full success screen — "Application received… our
onboarding team will email you within one business day"
(`components/forms/GetStartedForm.tsx:38-51`) — for a lead that exists only in a
log line that rotates away.

The system *does* signal this honestly in two places: the admin banner reads
"local files — set SUPABASE_URL to persist" (`app/admin/page.tsx:109`) and
`/api/health` returns 503. But nothing prevents shipping in that state, and the
person harmed is the applicant who never hears back.

**Fix:** two changes. (1) Refuse to start, or fail the build, when
`NODE_ENV === 'production'` and no durable store is configured. (2) When
`persisted` is false, show a degraded success message that asks the user to email
support as a fallback, rather than promising a callback.

---

### B2 — No structured logging, no error tracking, no correlation IDs · **High**

`app/error.tsx:15-16` · `lib/storage.ts:108,217` · `lib/notify.ts:86` · `lib/rate-limit.ts:64`

Ten `console.*` calls across `app/` and `lib/` are the entire observability
story. `app/error.tsx:15-16` states the gap outright: *"Surface the error to
logs/monitoring. Swap console for your provider."*

The three most important failures in the system are all deliberately swallowed:
a storage write that failed (`lib/storage.ts:108`), a database insert that fell
back to disk (`lib/storage.ts:217`), an email that never sent
(`lib/notify.ts:86`), and a rate limiter running degraded
(`lib/rate-limit.ts:64`). Each is the *right* runtime behaviour — none should
break the user's request — but each is also invisible unless a human is reading
raw platform logs at the moment it happens.

**Why it matters:** combined with P3, the detection path for "we have been
silently losing leads for a week" is a customer complaint.

**Fix:** add Sentry (or equivalent) and `captureException` at those four sites
plus `app/error.tsx`; attach a request ID generated in middleware; alert on
`/api/health` returning 503.

---

### B3 — Funnel aggregation transfers up to 20,000 rows per page view and silently truncates beyond that · **Medium**

`lib/analytics.ts:111,178-187` · `app/admin/funnel/page.tsx:26` · `app/demo/stats/page.tsx:39`

`PostgresDemoAnalyticsStore.funnel()` issues
`select=session_id,step,created_at&order=created_at.desc&limit=20000`, pulls the
rows over HTTP, and aggregates them in Node with `computeFunnel()`. Both consuming
pages are `force-dynamic`, so this runs on every view with no caching.

The correctness problem is worse than the performance one: at 20,001 events the
query keeps the *most recent* 20,000, which drops the earliest sessions'
`start` events while retaining their later steps. `starts` then undercounts, and
`completionRate` — computed as `completions / starts` at `lib/analytics.ts:100` —
can exceed 100%. The truncation is silent.

**Fix:** move the aggregation into Postgres —
`select step, count(distinct session_id) from demo_events group by step` behind an
RPC. It is one round trip, exact at any volume, and the `(step, session_id)`
index at `db/schema.sql:52-53` already supports it.

---

### B4 — The admin dashboard makes five separate HTTP round trips to the database per render · **Medium**

`lib/storage.ts:242-255` · `app/admin/page.tsx:81-84`

`stats()` fires four independent `HEAD` count queries (`lead`, `contact`,
`subscribe`, `last-7-days`), and `list()` is a fifth. `app/admin/page.tsx:81-84`
runs them concurrently via `Promise.all`, so wall-clock is one round trip rather
than five — but it is still five TLS handshakes and five PostgREST invocations
per page view, and the page is `force-dynamic`.

**Why it matters:** low user impact today (one operator, small dataset); it
matters as an architectural precedent, and it is the shape that becomes an N+1
when someone adds per-row detail.

**Fix:** a single `submission_stats()` Postgres function returning all four
numbers, or PostgREST's aggregate support.

---

### B5 — Both file stores read and sort the entire dataset on every request · **Medium**

`lib/storage.ts:135-151` · `lib/analytics.ts:132-152`

`FileSubmissionStore.readAll()` reads all three JSONL files completely into
memory, `JSON.parse`s every line, sorts the whole array, and only then slices for
pagination (`lib/storage.ts:150`). `FileDemoAnalyticsStore.readAll()` does the
same for demo events. This is the **default** provider when no database is
configured.

The per-line try/catch that skips corrupt lines (`lib/storage.ts:126-128`) is a
nice touch — a partial write can't take the admin page down.

**Fix:** acceptable as a development fallback, but bound it: read the trailing
N bytes rather than the whole file, and document in `README.md` that the file
store is not a production path.

---

### B6 — `lib/analytics.ts` duplicates ~60 lines of `lib/storage.ts` · **Medium**

`lib/analytics.ts:106-207` vs `lib/storage.ts:72,95-172,267-283`

Duplicated verbatim or near-verbatim: the `DATA_DIR` resolution
(`storage.ts:72` / `analytics.ts:108`), the mkdir-then-append JSONL write, the
read-split-filter-parse-skip-corrupt loop, the "Postgres class holding a file
fallback" shape, the `createXStore(env)` provider selector, and the lazy
module-level singleton. The comment at `lib/analytics.ts:20-22` acknowledges the
mirroring as intentional.

**Why it matters:** the duplication is stable today, but every future change —
adding retention, switching the fallback to blob storage, adding a write buffer —
has to be made twice, and the second one will eventually be forgotten.

**Fix:** extract `JsonlStore<T>` (path, append, readAll) and
`pickProvider(env, makePg, makeFile)`. Each module then contains only its schema
and its aggregation — perhaps 40 lines each.

---

### B7 — Rate-limit housekeeping runs an unindexed full-table DELETE inside the request path · **Medium**

`db/schema.sql:99-101`

```sql
if random() < 0.01 then
  delete from public.rate_limit_hits where window_start < now() - interval '1 day';
end if;
```

The primary key is `(key, window_start)` (`db/schema.sql:63`). A predicate on
`window_start` alone cannot use a composite index whose leading column is `key`,
so this is a sequential scan taking row locks — executed on 1% of calls, which
means on 1% of *form submissions*, while a user waits for the response. The
comment calls it "cheap in aggregate"; that holds while the table is small and
stops holding exactly when the site gets traffic.

**Fix:** `create index if not exists rate_limit_hits_window_idx on public.rate_limit_hits (window_start);`
and preferably move the purge to `pg_cron` so it never sits in a user's critical
path.

---

### B8 — No environment validation; misconfiguration degrades silently · **Medium**

`lib/postgrest.ts:24-31` · `lib/storage.ts:270-276` · `lib/admin-auth.ts:20-33` · `lib/notify.ts:23-30`

Every configuration read is a presence check with a silent fallback. A typo in
`SUPABASE_URL` (or setting only one of the pair) drops you to the file store with
no warning. An `ADMIN_PASSWORD` under 8 characters disables the entire admin area
with a single `console.error` (`lib/admin-auth.ts:27-30`). A missing `RESEND_FROM`
disables notifications silently.

Each individual fallback is defensible. In aggregate they mean a
production deploy can be misconfigured in four different ways and still boot,
serve traffic, and look healthy on every page except `/api/health`.

**Fix:** a `lib/env.ts` that parses the environment once at module load, validates
shapes (URL parses, key length, sender is an email), and **throws in production**
for anything half-configured — a partially-set pair should be a hard error, not a
downgrade.

---

### B9 — Abort timeouts do not cover response-body reads · **Low**

`lib/postgrest.ts:48-77` · `lib/fx.ts:158-171`

Both helpers set an 8-second `AbortController` timeout and clear it in `finally`.
`finally` runs when `fetch()` resolves — that is, when *headers* arrive. The
callers then `await res.json()` / `res.text()` outside the guarded scope
(`lib/postgrest.ts:90,110,138`; `lib/fx.ts:194,220,254`), so a stalled response
body can hang well past the intended ceiling.

**Fix:** read the body inside the `try`, or use `AbortSignal.timeout(8000)`,
which stays live for the whole exchange.

---

### B10 — No data retention: submissions and demo events are kept forever · **Low**

`db/schema.sql:16-24,42-47` · `app/admin/page.tsx`

There is no TTL, no `deleted_at` column, no purge job, and no delete action in the
admin UI. The `submissions` table accumulates names, emails, countries, company
names, user-agents and referrers indefinitely, and `demo_events` grows without
bound. For EU-resident personal data collected under a published privacy policy,
there is no implementation path for a "right to erasure" request beyond hand-written SQL.

**Fix:** add a delete action to `/admin`, a `submissions_retention` policy
(e.g. purge unconverted leads after 24 months), and a scheduled purge of
`demo_events` older than 90 days — it is aggregate telemetry, the raw rows have no
value after aggregation.

---

### Already solid — backend

- **Store-then-notify is correct architecture.** `lib/api-forms.ts:66-69` persists
  before emailing, and the refactor that removed email-as-a-storage-provider
  (documented at `lib/storage.ts:22-25`) was the right call: "a store that only
  emails is a store that loses data."
- **One validation module, two runtimes.** `lib/validation.ts` is dependency-free
  and framework-agnostic, so client and server rules cannot drift.
- **API response shapes are consistent** across all three form endpoints because
  they share `handleFormPost` — `{ok, persisted}` / `{errors}` 422 / `{error}`
  400|429, and `useSubmit.ts:43-56` maps each one.
- **The schema's indexes match its access patterns**: `(created_at desc)`,
  `(kind, created_at desc)`, and a `gin_trgm_ops` index backing the admin's
  `ilike` search (`db/schema.sql:26-34`). The `search` column is a denormalised
  flattening written at insert time (`lib/storage.ts:211`) — the right trade for
  a read-mostly admin table.
- **`check_rate_limit()` is genuinely atomic** — `insert … on conflict do update
  … returning` in one statement, `security definer`, `set search_path = public`
  (`db/schema.sql:70-97`). The `search_path` pinning in particular is a detail
  most codebases miss.
- **Graceful degradation is consistent and deliberate**: DB → file, shared limiter
  → in-memory, FX failure → hide the ticker, email failure → log. Every fallback
  is documented at the point it is taken.

---

## FRONTEND & DESIGN

### F1 — Eleven of seventeen images are byte-identical duplicates; product shots are blog photos · **High**

`public/images/` · `app/page.tsx:121-122,173-174` · `lib/blog.ts:57,145`

`md5sum public/images/*.png` returns six unique hashes for seventeen files:

| Hash group | Files |
|---|---|
| `2b7a7b3b…` | `blog-1.png`, **`coin-blue.png`**, `hero-blog-list.png` |
| `34ac0d87…` | `blog-2.png`, `blog-4.png`, **`coin-gold.png`**, `hero-blog-3.png` |
| `8e54fdb1…` | `blog-6.png`, **`card-phone.png`**, `hero-blog-5.png` |
| `2b1a005b…` | `blog-3.png`, **`phone-apps.png`**, `hero-blog-2.png` |
| `e602c432…` | `blog-5.png`, **`phone-home.png`**, `hero-blog-4.png` |
| `67bec19e…` | `cards-stack.png` (the only unique file) |

Consequences, in order of severity:

1. **The alt text is factually wrong**, which is a WCAG 1.1.1 failure, not just a
   content problem. `app/page.tsx:121-122` renders `card-phone.png` with
   `alt="Marsa Mastercard and mobile app"` — that file is a blog photograph.
   `app/page.tsx:173-174` renders `coin-blue.png` as `alt="Marsa coin"`; same
   issue. A screen-reader user is told something untrue about the image.
2. **Two blog posts share a cover.** `lib/blog.ts:57` and `:145` point at
   `blog-2.png` and `blog-4.png`, which are the same bytes.
3. `coin-blue.png` is referenced 13 times across the site and `coin-gold.png` 9
   times, so the duplication is visible on most pages.

These are unreplaced Figma-export placeholders.

**Why it matters:** this is a fintech marketing site whose entire job is
credibility. A visitor who notices the "Mastercard" shot is the same photo as
blog post 6 draws exactly the wrong conclusion about the product.

**Fix:** source real product imagery or licensed illustrations for `coin-*`,
`card-phone`, `phone-*` and `cards-stack`; give each blog post a distinct cover;
then correct every `alt` to describe what is actually rendered.

---

### F2 — Form error messages fail WCAG AA contrast · **High**

`components/forms/fields.tsx:56,185` · `components/forms/GetStartedForm.tsx:179` · `components/forms/ContactForm.tsx:130` · `components/tools/IbanChecker.tsx:109` · `components/admin/AdminLoginForm.tsx:60` · `app/admin/page.tsx:186`

All six sites use `text-red-600` (`#DC2626`). Computed against the two surfaces
these actually render on:

| Foreground | Background | Ratio | AA (≥4.5:1 for <18.66px) |
|---|---|---|---|
| `#DC2626` | `--card` `#140A10` | **4.04:1** | ✗ |
| `#DC2626` | `--canvas` `#0C080B` | **4.12:1** | ✗ |
| `--danger` `#E88A8A` | `--card` `#140A10` | 7.84:1 | ✓ |
| `--danger` `#E88A8A` | `--canvas` `#0C080B` | 7.99:1 | ✓ |

The affected text is `text-xs` (12px) and `text-sm` (14px), so the 4.5:1 threshold
applies with no large-text exemption.

The palette already contains the right token: `--danger` at
`styles/globals.css:45`, exposed as `text-danger` via `tailwind.config.ts:57`, and
already used correctly at `app/admin/funnel/page.tsx:40`.

**Why it matters:** this is the one string a user *must* read to recover from a
failed submission, and it is the least readable text on the page. It is also why
the "0 axe violations across 29 routes" result recorded in `README.md:114` does
not cover it — error states only render after a failed submit, so an automated
crawl never sees them.

**Fix:** replace every `text-red-*` with `text-danger`, and `border-red-400`
(`components/forms/fields.tsx:18`) with `border-danger/60`.

---

### F3 — The IBAN checker renders a light-theme panel inside a dark-only site · **High**

`components/tools/IbanChecker.tsx:75,109,115`

```tsx
result.valid ? "border-success/30 bg-success/5" : "border-red-200 bg-red-50"
```

The success branch uses tokens correctly. The failure branch uses raw Tailwind
light-palette values — `bg-red-50` is `#FEF2F2`, near-white — on a site whose
surfaces are `#0C080B` and `#140A10`. Entering an invalid IBAN produces a bright
white-pink card in the middle of the black-rose UI.

**Why it matters:** `/tools/iban-checker` is an SEO landing page — often a
visitor's first impression — and the broken state is the one triggered by a typo,
which is the common case.

**Fix:** `border-danger/30 bg-danger/[0.06]` for the panel, `text-danger` for the
icon (`:109`) and the reason (`:115`).

---

### F4 — Blog posts are listed in array order, not by date · **Medium**

`app/blog/page.tsx:28-31` · `lib/blog.ts:18,55,101,143,185,226`

`posts.filter(…)` is passed straight to `paginate()` with no sort. The declared
order is:

`March 30, 2025` → `February 20, 2026` → `January 16, 2026` → `April 12, 2026` → `March 30, 2026` → `March 30, 2026`

so the oldest article leads the list and the newest is fourth.

**Why it matters:** for a content-marketing surface, a blog index that opens with
a 16-month-old post reads as abandoned, and it is the wrong internal-linking
signal for crawlers.

**Fix:** sort descending by date — which requires F5 first, since the dates are
currently unparseable display strings.

---

### F5 — `datePublished` in BlogPosting structured data is not ISO 8601 · **Medium**

`lib/schema.ts:59` · `lib/blog.ts:18`

`blogPostingSchema` passes `post.date` straight through, and `post.date` is a
display string like `"March 30, 2025"`. Schema.org requires ISO 8601; Google's
Rich Results test rejects the value, so none of the six posts is eligible for an
article rich result.

**Why it matters:** the rest of the SEO implementation is meticulous — canonical
URLs on every page via `buildMetadata` (`lib/seo.ts:37`), breadcrumb and FAQ
schema, a complete sitemap. This one field silently discards the payoff for the
entire blog.

**Fix:** store `date: "2025-03-30"` and render it with `Intl.DateTimeFormat`,
matching the pattern already used for FX dates
(`components/sections/RateTicker.tsx:39-44`). F4's sort then becomes a one-liner.

---

### F6 — FAQ answers are removed from the DOM but asserted in FAQPage structured data · **Medium**

`components/ui/Accordion.tsx:66` · `components/sections/FAQ.tsx:26`

The accordion renders `{open && <div>{item.answer}</div>}`, so collapsed answers
are absent from the HTML entirely — only the first item's answer exists on load.
Meanwhile `FAQ.tsx:26` emits `faqSchema(items)` containing every answer. Google's
FAQPage guidelines permit answers hidden behind an accordion but require the
content to be present on the page; markup asserting content the page does not
contain risks the rich result being dropped.

The same line causes an a11y gap: because the panel does not exist when collapsed,
the button at `Accordion.tsx:34-41` has `aria-expanded` but no `aria-controls`
target.

**Fix:** always render the panel with a stable `id`, collapse it with `hidden`,
and add `aria-controls` on the button. One change fixes both.

---

### F7 — The cookie banner is decorative · **Medium**

`components/CookieConsent.tsx`

The site sets exactly one cookie — `marsa_admin` (`lib/admin-auth.ts:15`), which
is strictly necessary and only ever issued to an authenticated operator. There are
no analytics cookies, no third-party scripts and no tag manager. Yet every first
visit renders a fixed full-width overlay claiming *"We use cookies to run this
site and, with your consent, to improve it"* (`CookieConsent.tsx:49-50`), the
decision is stored in localStorage rather than a cookie, the broadcast event has
no listeners, and "Reject non-essential" changes nothing (S7).

**Why it matters:** it over-claims tracking that does not happen, offers a control
that does nothing, and costs a viewport-anchored overlay on first paint — for zero
compliance benefit, since the one cookie in play is exempt.

**Fix:** either wire consent to the demo telemetry and reword the copy to describe
localStorage accurately, or remove the banner and state the (genuinely good)
position on `/legal/cookies`. The current middle ground is the worst of both.

---

### F8 — `ThemeToggle` is dead code, and the two `dark:` variants are unreachable · **Low**

`components/ThemeToggle.tsx` · `app/admin/page.tsx:186` · `components/admin/AdminLoginForm.tsx:60` · `styles/globals.css:79-120`

`ThemeToggle` is exported and imported nowhere — a repo-wide grep finds only its
own definition. It also could not work if it were mounted: `styles/globals.css:79-120`
defines `.dark` as an exact mirror of `:root`, so adding or removing the class
changes no rendered value, while the button's `aria-label` promises "Switch to
light theme" (`ThemeToggle.tsx:39`).

Relatedly, the only two `dark:` variants in the codebase are unreachable for a
visitor whose OS prefers light: the pre-paint script only adds `.dark` when
localStorage or the media query says dark (`app/layout.tsx:57`), yet the palette is
dark unconditionally. Those users get the `text-red-600` base value — see F2.

**Fix:** delete `ThemeToggle.tsx`; replace both `dark:` variants with `text-danger`.

---

### F9 — Five unused images ship in the deploy artifact · **Low**

`public/images/hero-blog-2.png`, `hero-blog-3.png`, `hero-blog-4.png`, `hero-blog-5.png`, `hero-blog-list.png`

No reference to any of them exists in `app/`, `components/` or `lib/`. Roughly
630 KB. They are never requested by a route, so there is no Core Web Vitals
impact — this is purely artifact weight and repository noise.

**Fix:** delete.

---

### F10 — Navbar dropdowns use `role="menu"` without the keyboard model those roles promise · **Low**

`components/layout/Navbar.tsx:83-97`

The dropdown declares `role="menu"` with `role="menuitem"` children. The ARIA
menu pattern commits to arrow-key navigation, Home/End, type-ahead, and focus
moving into the menu on open. None is implemented — only Escape
(`Navbar.tsx:59-61`) and blur-out (`:56-58`) are handled. `aria-controls` is
also missing on the trigger. Screen-reader users are told "menu, 6 items" and
then find the arrow keys do nothing.

**Fix:** the cheaper and more honest option is to drop the `menu`/`menuitem`
roles. A button with `aria-expanded` plus a plain `<ul>` of links describes what
the component actually does, and tab navigation already works.

---

### Already solid — frontend & design

- **The token system is real and unbroken.** Every colour flows from CSS custom
  properties (`styles/globals.css:22-72`) through `tailwind.config.ts:36-76`, with
  `<alpha-value>` support preserved so opacity modifiers work. A grep for
  arbitrary spacing values (`p-[…]`, `px-[…]`, `gap-[…]`, `mt-[…]`, `space-x-[…]`
  …) across `app/` and `components/` returns **zero matches** — the spacing scale
  is never escaped. The only violations of the token system anywhere are the
  `red-*` values in F2/F3.
- **Elevation and typography are systematised**, not ad hoc: three shadow levels
  with documented roles (`tailwind.config.ts:93-112`), two fluid `clamp()` display
  sizes, one display font and one text font.
- **Loading, empty and error states all exist**, which is rare:
  `app/admin/loading.tsx` (skeleton mirroring the real layout),
  `components/sections/CurrencyConverter.tsx:177-238` (loading skeleton, error +
  retry, empty), `components/demo/DemoFlow.tsx:501-513` (loading, error + retry),
  `app/admin/page.tsx:185-192` (error, empty), plus `app/error.tsx` and
  `app/not-found.tsx`.
- **Bundle discipline is good.** Recharts — the only heavy dependency — is behind
  `next/dynamic` with `ssr: false` and a sized skeleton
  (`components/sections/CurrencyConverter.tsx:15-20`), so it stays out of the
  homepage's initial JS. Fonts are self-hosted via `next/font` with `display: swap`
  (`app/layout.tsx:11-21`) — no render-blocking third-party request.
- **CLS risk is actively managed**: the chart sits in a fixed `h-56` container
  (`CurrencyConverter.tsx:222`), the atmosphere layer is `position: absolute` with
  a bounded height and a comment explaining it was chosen over `fixed` specifically
  to avoid scroll re-compositing (`styles/globals.css:206-222`), and every
  `next/image` supplies `fill` + `sizes`.
- **Reduced motion is honoured globally and again per component**
  (`styles/globals.css:159-166,383-387,405-410`,
  `components/demo/DemoFlow.tsx:39-48`).
- **Hero contrast on the dark tones checks out**: `text-white/70` ≈ 7:1,
  `text-white/55` ≈ 5.9:1, `text-white/50` ≈ 5.6:1 against `--surface-navy`.
- **The demo's a11y is thoughtfully done**: focus moves to the step heading on
  each transition (`DemoFlow.tsx:113-115`), the panel is `aria-live="polite"`, the
  progress rail carries `aria-current="step"`, and the marquee ticker marks its
  duplicated half `aria-hidden` (`RateTicker.tsx:69`).

---

## PRODUCTION READINESS

### P1 — The project is not under version control · **Critical**

`git rev-parse --is-inside-work-tree` → `fatal: not a git repository`. There is no
`.git` directory anywhere in the tree.

Meanwhile `.vercel/project.json` shows the code is linked to a live Vercel project
(`nowe-seo-site`, project id `[redacted]`, org id `[redacted]`), so this is
deployed software with no history.

Consequences: no rollback, no diff, no blame, no branches, no code review, no way
to bisect a regression, no recovery from an accidental overwrite or a bad
find-and-replace — and it structurally blocks P2, since there is nothing for CI to
hook into.

**Why it matters:** every other finding in this document is recoverable. This one
is the only one where a single mistake destroys the work outright.

**Fix:** `git init && git add -A && git commit` and push to a remote today. The
`.gitignore` is already correct — it covers `node_modules`, `.next`, `.env*`,
`.data`, `.vercel` and `*.tsbuildinfo` — so the first commit will be clean.
Verify with `git status --ignored` that nothing under `.data/` is staged (see P9).
Then connect Vercel to the repository so deploys come from commits rather than
from a local CLI push.

---

### P2 — No CI/CD pipeline · **Critical**

No `.github/`, `.gitlab-ci.yml`, `Jenkinsfile` or `azure-pipelines.yml`.

The verification gate documented at `README.md:93-99` is real and, as confirmed at
the top of this audit, currently passes in full. But it runs only when a human
remembers to run it, which means the guarantee holds exactly until the first
hurried change.

**Why it matters:** 94 tests, a clean typecheck and a clean lint are only worth
what enforcement makes them worth. Right now nothing prevents a commit that breaks
all three from being deployed.

**Fix (blocked on P1):** a GitHub Actions workflow on push and pull request:
`npm ci` → `npx tsc --noEmit` → `npx next lint` → `npx vitest run` →
`npx next build`. Add `npm audit --omit=dev` as a non-blocking report. Turn on
branch protection once it is green.

---

### P3 — No monitoring, alerting or uptime checking · **High**

`app/api/health/route.ts`

The health endpoint is well built for exactly this purpose — it distinguishes
"configured" from "reachable" per provider and returns 503 when a configured
dependency fails (`app/api/health/route.ts:54-66`). Nothing polls it.

Combined with B2 (no error tracking), the detection path for a production
incident is: a user notices and tells you. That covers Supabase being down, a
rotated Resend key, the FX provider changing its response shape, or B1's silent
lead loss.

**Fix:** point an uptime monitor (Better Stack, Checkly, or Vercel's own) at
`/api/health` on a 1–5 minute interval, alerting on 503 and on a >5s response.
Note that the endpoint calls the FX provider synchronously with an 8-second
timeout (`lib/fx.ts:160`), so set the monitor's timeout above that or split the
FX check out.

---

### P4 — No backups and no migration history · **High**

`db/schema.sql`

The database is defined by a single apply-once idempotent file
(`db/schema.sql:1-5`). There is no migration directory, no `schema_migrations`
table, no record of what has been applied to which environment, and no documented
backup or restore procedure for the only copy of every captured lead.

Every `create table if not exists` is safe to re-run, but that same idempotency
means the file cannot express a change: adding a column or a constraint to a live
table has no expressible home here.

**Why it matters:** the data is business-critical (it is the entire output of the
marketing site) and personal (GDPR). "We have never tested a restore" and "we
cannot safely change the schema" are both single points of failure.

**Fix:** move to numbered `db/migrations/NNN_description.sql` with a
`schema_migrations` table, or adopt the Supabase CLI's migration workflow. Enable
point-in-time recovery on the Supabase project, and **perform one restore into a
scratch project** — an untested backup is a hypothesis.

---

### P5 — Test coverage has a hole exactly where the security boundary is · **High**

`tests/` · `lib/validation.ts` · `lib/api-forms.ts` · `lib/rate-limit.ts` · `lib/postgrest.ts`

The 94 tests are good work — `iban.test.ts` checks real IBANs across countries
plus malformed input and bad checksums, `storage.test.ts` exercises provider
selection and both implementations, `admin-auth.test.ts` covers token forgery and
expiry, `csv.test.ts` covers formula injection.

The gap is what is *not* covered:

- **`lib/validation.ts` — zero tests.** This is the server-side source of truth
  for every byte the public sends. Untested: the 254-character email cap
  (`validation.ts:34`), the 4000-character message cap (`:137`), the
  `accountType`-conditional company requirement (`:79-80`), the topic allowlist
  fallback (`:131-133`), and the three-way consent coercion at `:65`
  (`true` / `"true"` / `"on"`).
- **`lib/api-forms.ts` — zero tests.** The honeypot short-circuit, the 422 error
  shape, and the store-before-notify ordering that B1 depends on.
- **`lib/rate-limit.ts` — zero tests.** Window rollover, the shared-to-local
  degradation path, `clientKey`'s `x-forwarded-for` parsing.
- **`lib/postgrest.ts` — zero tests.** `Content-Range` parsing, error wrapping.
- **No component or e2e tests at all.** The forms, the accordion, the demo flow
  and the admin login are verified only by hand.

**Fix:** table-driven unit tests for `validation.ts` (start there — highest value
per line), `api-forms.ts` against an in-memory store, then Playwright smoke tests
for *submit a lead* and *admin login → export CSV*.

---

### P6 — Dev toolchain runs on end-of-life ESLint 8 with 13 high-severity advisories · **Medium**

`package.json:25-26`

`npm audit` reports **13 high**, all from one root cause: `brace-expansion`
(GHSA-mh99-v99m-4gvg, unbounded expansion → OOM) reached via
`minimatch` → `@eslint/eslintrc`, `@humanwhocodes/config-array`, `glob`/`rimraf`/
`flat-cache`/`file-entry-cache`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`
and `eslint-plugin-react`. Every path is inside `eslint@8.57.1`, which reached end
of life in October 2024 and receives no further security fixes.

`npm audit --omit=dev` is **0 vulnerabilities** — nothing here ships to users. The
figure quoted at `README.md:98` is therefore accurate, but stating only the
`--omit=dev` number understates the toolchain's state.

Separately, `next lint` emits a deprecation notice and is removed in Next 16.

**Fix:** `npx @next/codemod@canary next-lint-to-eslint-cli .` migrates to the
ESLint 9 flat config, which clears the advisories and the deprecation in one
change. Then quote both audit numbers in the README.

---

### P7 — Secrets management is documentation, not process; sessions cannot be revoked · **Medium**

`.env.example` · `lib/admin-auth.ts:66-90`

`.env.example` is unusually good — grouped by concern, each block explaining what
it upgrades, with an explicit warning that the service-role key must never carry a
`NEXT_PUBLIC_` prefix (`.env.example:32-35`). No secret is committed anywhere.

What is missing is operational: no rotation schedule or procedure, no documented
separation between Vercel preview and production values, and no revocation path.
The session token carries nothing but an expiry and its signature
(`lib/admin-auth.ts:71-73`), so the only way to invalidate a live admin session —
after a laptop is lost, or a password is changed — is to rotate
`ADMIN_SESSION_SECRET`, which invalidates every session and requires a redeploy.

**Fix:** document rotation for all five secrets; set distinct preview vs.
production values in Vercel (a preview deploy sharing the production service-role
key is a real risk); and add either a `token_version` claim compared against an
env var, or a `sessions` table, so a single session can be killed.

---

### P8 — Documentation is excellent on the product and silent on operations · **Medium**

`README.md` · `CASE-STUDY.md`

The product documentation is genuinely strong. The "What's real vs simulated"
section (`README.md:133-153`) — separating live ECB rates and real IBAN validation
from the labelled sandbox, and stating plainly that "180+ countries" is positioning
copy rather than an audited metric — is the right instinct, and rarer than it
should be. The architecture map (`README.md:54-78`) is accurate against the code.

What does not exist: a runbook (what to do when `/api/health` reports 503, how to
recover leads from logs when `persisted` was false), a deployment procedure, a
branching/contribution model, on-call or incident notes, and any data-handling
documentation — retention, DSAR process, or who may access `/admin`.

**Fix:** `docs/RUNBOOK.md` (health-check triage, dependency failure playbooks,
rollback) and `docs/DATA.md` (what is collected, where it lives, how long, how to
delete it, who has access).

---

### P9 — Live PII sits in the working tree · **Low**

`.data/lead.jsonl`, `.data/contact.jsonl`, `.data/subscribe.jsonl`, `.data/demo-events.jsonl`

The local file store holds real-looking submissions (~2 KB total). `.gitignore:16`
covers `.data`, so this is contained — but it becomes a leak the moment someone
runs `git add -f`, zips the directory to share it, or copies the folder to a new
machine.

**Fix:** no change needed today. When P1 lands, confirm with
`git status --ignored` that nothing under `.data/` is tracked, and add a
`.data/README` noting the directory contains personal data and must never leave
the machine.

---

### Already solid — production readiness

- **`/api/health` is the best-designed operational surface in the codebase.** It
  distinguishes "configured" from "reachable" per provider, reports which storage
  backend is actually live and whether it is durable, and returns 503 rather than
  a cheerful 200 when a configured dependency is broken. It only needs something
  to watch it (P3) and its `detail` strings sanitised (S2).
- **The environment-based provider selection is a genuinely good production
  pattern** — the same interfaces serve dev with zero configuration and production
  with credentials, and `createStore(env)` / `createAnalyticsStore(env)` take the
  environment as a parameter specifically so both paths are testable
  (`lib/storage.ts:270`, `lib/analytics.ts:195`); `tests/storage.test.ts:49` and
  `tests/analytics.test.ts:82` use it.
- **Regulatory copy is env-gated and defaults to the truth.** `lib/legal.ts:13-31`
  asserts an authorisation only when both `NEXT_PUBLIC_REGULATOR_AUTHORITY` and
  `_REFERENCE` are set, and otherwise describes the licensed-partner model. For a
  pre-authorisation fintech this is the single highest-consequence thing to get
  right, and it is right — including the comment explaining why.
- **`robots.ts` and page-level metadata agree**: `/admin`, `/api/` and
  `/demo/stats` are disallowed in robots (`app/robots.ts:10`) *and* carry
  `robots: { index: false }` in their metadata (`app/admin/layout.tsx:6`,
  `app/demo/stats/page.tsx:14`). Belt and braces, correctly.

---

## Top 10 Priorities

| # | Finding | Axis | Severity | Effort | Risk if ignored |
|---|---|---|---|---|---|
| 1 | **No git repository** — deployed code with no history, no rollback, no review (P1) | Production | Critical | S | One bad save or find-and-replace destroys the work permanently; blocks CI, code review and any recovery |
| 2 | **No CI/CD** — the passing 94-test gate runs only when someone remembers (P2) | Production | Critical | S | A commit that breaks types, lint and tests deploys to production unchallenged |
| 3 | **Default deploy silently loses every lead** — read-only FS → `console.info`, while the user is shown "Application received" (B1) | Backend | High | M | Every enquiry, application and subscription is lost with nobody aware; the applicant is told they'll be contacted |
| 4 | **Admin login: per-instance rate limit, 8-char shared password, no lockout or MFA** (S1) | Security | High | M | One guessed password exposes the name, email, country and company of every person who used a form — a notifiable breach |
| 5 | **`/api/health` leaks server paths and raw Postgres error bodies to anyone** (S2) | Security | High | S | Free reconnaissance: filesystem layout, table names and upstream error text, before authenticating to anything |
| 6 | **11 of 17 images are duplicates; homepage "product" shots are blog photos with false alt text** (F1) | Frontend | High | M | Visible credibility damage on a fintech site, plus a WCAG 1.1.1 failure — screen readers are told something untrue |
| 7 | **Form error text at 4.04:1 fails AA** — the one message a user must read to recover (F2) | Frontend | High | S | Low-vision users cannot read why their submission failed; a legally-exposed accessibility gap on a PII-collecting form |
| 8 | **No monitoring, alerting or error tracking** — `/api/health` exists but nothing watches it (P3, B2) | Production | High | M | Outages, expired keys and swallowed storage failures are discovered by customers, days late |
| 9 | **No backups and no migration history** for the only copy of the lead database (P4) | Production | High | M | Unrecoverable data loss; the schema cannot be evolved safely against a live database |
| 10 | **`lib/validation.ts` and `lib/api-forms.ts` have zero tests** — the security boundary for all public input (P5) | Production | High | S | A refactor silently weakens input validation on every public endpoint with no failing test |

**Effort key:** S ≈ under a day · M ≈ 1–3 days · L ≈ over a week.

**Suggested sequence.** Items 1 and 2 first and together — they are small, and
everything else is safer to change once they exist. Then 5, 7 and 10, which are
each an afternoon. Then 3, 4, 8 and 9, which are the substantive engineering. Item
6 is blocked on sourcing real assets, so start that procurement in parallel with
everything above.
