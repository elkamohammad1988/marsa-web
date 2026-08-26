# Project Plan — `marsa-web`

**Single source of truth for the post-audit remediation programme.**
Owner: Claude (engineering execution). Human owner: repo maintainer (decisions,
credentials, dashboards, visual judgement).

Source backlog: [`AUDIT.md`](./AUDIT.md). Findings P1 (no version control) and P2
(no CI) were the two Criticals and are **closed** — the repo is under git with a
remote, and `.github/workflows/ci.yml` gates typecheck → lint → tests → build →
production `npm audit` on every push to `main` and every pull request.

Everything else in the audit — **S1–S10, B1–B10, F1–F10, P3–P9** — is tracked
below. 37 findings, 19 batches.

Last updated: 2026-08-24. Baseline on `main`: `npm run verify` green —
typecheck, lint, the full unit suite and a production build. The counts that
used to sit on this line went stale between edits, which is the exact failure
this project keeps finding in its own copy; run the command for the current
figures rather than trusting a number written down once.

**Reconciled against the code on 2026-08-24, and the gap was large.** The batch
board below said every batch was closed; the per-batch tables underneath it
still carried **39 work rows marked `TODO` — "Not started"** (a fortieth
`TODO` is the status-vocabulary legend) — including four Highs in Batch 6 and
an F1 row calling itself "the one open High in the whole backlog", plus two
rows still marked `BLOCKED-ON-ME` on a human action already recorded as
resolved. Every one was checked against the working tree, not against
another document: `text-red-600` and `border-red-*` have zero occurrences,
`components/ThemeToggle.tsx` is gone, the CSP ships on both origins, blog dates
are ISO 8601 and the index sorts descending, `JsonlStore` is extracted and
bounded, the flat ESLint config is in place, `RUNBOOK.md` and `DATA.md` exist,
and there is no `public/` directory for F1 to be blocked on. Thirty-nine rows
were stale; the fortieth (a middleware request ID) shipped in a different shape
and now says so.

Two documents disagreeing about whether the work is done is not a formatting
problem here. This repository is public and the listing invites a buyer to read
it, so a table of unstarted Highs is read as an unfinished project — which is
the same class of error as a stale test count, and worse, because it argues
against the work rather than merely mis-measuring it.

**The audit is no longer the whole plan.** It was a snapshot of code quality,
and it was right about the code. What it did not ask is whether the site's
*claims* were true — and re-reading the repository against that question turned
up a larger problem than anything in the original backlog: a public build that
collected real personal data under a promise nobody could keep, asserted a
regulatory model that did not exist, quoted nine people who had never said
anything, advertised five jobs, and shipped seventeen photographs of unknown
provenance under alt text describing something else. That work is tracked in
[The honesty programme](#the-honesty-programme) below and is now the larger half
of this document.

---

## How this plan is executed

One batch = one branch = one PR = one coherent theme. Security fixes never share
a PR with design fixes. Every behaviour change ships with tests that assert
user-visible outcomes. `npm run verify` (typecheck, lint, test, build) must pass
locally before the PR opens, and CI must be green before it is offered for merge.
Nothing is committed directly to `main`.

When a batch needs something only a human can do, the item is marked
**BLOCKED-ON-ME**, the exact steps land in [HUMAN ACTIONS](#human-actions), and
work moves to the next unblocked batch rather than stalling or guessing.

### Status vocabulary

| Status | Meaning |
|---|---|
| `TODO` | Not started. |
| `IN PROGRESS` | Branch exists, work underway. |
| `DONE` | Merged to `main` with CI green. |
| `BLOCKED-ON-ME` | Blocked on the human owner — see HUMAN ACTIONS for the exact steps. |

---

## Ordering: the reasoning

The instruction is *security before quality, quality before polish, launch
blockers before everything else*. Applied literally that yields a defensible
order, but three refinements make it materially better, and each is justified
below rather than assumed.

**1. A safety net comes before the security work, not after.**
Batches 2–5 change how rate limiting, authentication and request handling
behave. `lib/rate-limit.ts`, `lib/validation.ts` and `lib/postgrest.ts` currently
have **zero tests** (P5) — they are the exact modules those batches touch. Writing
those tests first costs one small, zero-risk PR and converts every subsequent
security change from "looks right" into "provably unchanged where it should be".
Shipping security fixes onto untested foundations is how a hardening PR quietly
becomes a regression. So P5's unit-test half is Batch 1.

**2. Highest *exposure* first within security, not highest severity label.**
The public internet can reach `/api/health`, `/api/rates`, `/api/rates/history`
and `/demo/stats` with no credential at all (S2, S6, S4). The admin boundary
(S1, S5, S9) requires an attacker to already be attacking a login form. Both
matter; the unauthenticated surface is reachable by a script with no prior
knowledge, so it goes first. CSP (S3) is deliberately *after* both: it is the
only security change that can break the running site (the inline theme script and
the JSON-LD blocks), so it ships once the cheaper wins are banked and merged, not
tangled up with them.

**3. F2/F3 are pulled ahead of the backend quality work.**
Taken as "frontend = polish", the WCAG contrast failures would sit near the end.
That is the wrong call. F2 is a **High** — form error text at 4.04:1 is the one
string a user must read to recover from a failed submission, on a form that
collects PII, and the fix is a token swap with no behavioural risk (`text-red-600`
→ `text-danger`, a token that already exists and is already used correctly
elsewhere). It is an afternoon with a legal-exposure dimension. Deferring an
afternoon behind three days of database refactoring optimises for taxonomy over
impact. F3 (a near-white panel on a black site, on an SEO landing page, triggered
by the *common* case of a typo) and F8 (dead `ThemeToggle`, unreachable `dark:`
variants — the other half of F2's root cause) ride along because they are the
same one-line-per-site change to the same token system.

**Everything else follows the stated principle directly:**

- **Launch blockers next** (Batches 7–11). B8 (a production deploy can be
  misconfigured four ways and still look healthy), P4 (no backups, no migration
  path for the only copy of every lead), B3/B4/B7 (a funnel that can report >100%
  completion, and an unindexed `DELETE` in the form-submission critical path),
  B2/P3 (the current incident-detection path is "a customer tells you"), and
  B10/P9 (no implementation path for a GDPR erasure request). These are the
  things that make the difference between deployed and operable.
- **Migrations before the SQL that needs them.** P4 (Batch 8) establishes
  `db/migrations/NNN_*.sql` and a `schema_migrations` table. B7, B3 and B4
  (Batch 9) each add SQL to a live database. Doing them in the other order means
  writing the first three migrations with nowhere to put them.
- **Internal quality after correctness** (Batches 12–13). B5, B6 and B9 are
  refactors and a timeout correctness fix — real, but nobody is harmed today.
  The Playwright smoke tests (P5b) come after the code they would test has
  stopped moving; writing e2e tests against surfaces that eight later batches
  will change is how you get a suite everyone learns to ignore.
- **Polish last** (Batches 14–16). Blog dates and ordering, accordion/FAQ
  markup, navbar ARIA, unused image deletion, and the imagery replacement.
- **Toolchain and docs at the end** (Batches 17–18). P6's 13 high advisories are
  all dev-only — `npm audit --omit=dev` is 0 — so nothing ships to a user;
  it is deadline-driven (Next 16 removes `next lint`), not risk-driven. P7/P8
  documentation is written last on purpose: a runbook describing the system as
  it will be after 17 batches is worth writing once, at the end, rather than
  three times.

**F1 (imagery) was started in parallel from day one**, as the only High blocked
on procurement rather than engineering — sourcing was
[H9](#h9--source-real-product-imagery-f1) and the code change was Batch 16,
which could not start until assets existed. That framing turned out to be the
wrong one: H9 was resolved on 2026-07-27 by deleting the images rather than
replacing them, which unblocked Batch 16 by removing its dependency instead of
satisfying it.

---

## Batch board

| # | Batch | Findings | Status |
|---|---|---|---|
| 0 | Submissions are never silently lost | B1 | **DONE** ([#1](https://github.com/elkamohammad1988/marsa-web/pull/1)) |
| 1 | Test the security boundary | P5a | **DONE** ([#3](https://github.com/elkamohammad1988/marsa-web/pull/3)) |
| 2 | Public endpoint exposure & abuse limits | S2, S6, S4* | **DONE** ([#4](https://github.com/elkamohammad1988/marsa-web/pull/4)) |
| 3 | Admin authentication boundary | S1, S5, S9 | **DONE** ([#11](https://github.com/elkamohammad1988/marsa-web/pull/11)) |
| 4 | Small security & privacy corrections | S8, S10, S7 | **DONE** ([#5](https://github.com/elkamohammad1988/marsa-web/pull/5)) |
| 5 | Content-Security-Policy | S3 | **DONE** ([#6](https://github.com/elkamohammad1988/marsa-web/pull/6)) |
| 6 | Accessible error states | F2, F3, F8 | **DONE** ([#7](https://github.com/elkamohammad1988/marsa-web/pull/7)) |
| 7 | Fail loudly on misconfiguration | B8 | **DONE** ([#8](https://github.com/elkamohammad1988/marsa-web/pull/8)) |
| 8 | Migration infrastructure | P4 | **DONE** ([#14](https://github.com/elkamohammad1988/marsa-web/pull/14)) |
| 9 | Database correctness & round trips | B7, B3, B4 | **DONE** ([#14](https://github.com/elkamohammad1988/marsa-web/pull/14)) — applying = [H3](#h3--apply-the-database-migrations--not-yet-done) |
| 10 | Observability | B2, P3 | **DONE** ([#18](https://github.com/elkamohammad1988/marsa-web/pull/18)) — adapter = [H7](#h7--create-an-error-tracking-project-and-supply-the-dsn-b2), monitor = [H6](#h6--point-an-uptime-monitor-at-apihealth-p3) |
| 11 | Retention & erasure | B10, P9 | **DONE** — erasure in `/admin`, `purge_demo_events()` in `006`, `.data/README.md`. The submissions *period* stays [H12](#h12--decide-data-retention-periods-b10): a legal decision, not an engineering one. |
| 12 | Storage internals | B6, B5, B9 | **DONE** ([#19](https://github.com/elkamohammad1988/marsa-web/pull/19)) |
| 13 | End-to-end smoke tests | P5b | **DONE** — [`tests/smoke/`](../tests/smoke), 50 checks in a real Chrome against a production build, as a second required CI job. |
| 14 | Blog dates, ordering & structured data | F5, F4, F6 | **DONE** ([#9](https://github.com/elkamohammad1988/marsa-web/pull/9)) |
| 15 | Markup honesty & artifact weight | F10, F9 | **DONE** — F10 ([#17](https://github.com/elkamohammad1988/marsa-web/pull/17)), F9 absorbed into F1 ([#25](https://github.com/elkamohammad1988/marsa-web/pull/25)) |
| 16 | Imagery & cookie banner | F1, F7 | **DONE** — F7 ([#13](https://github.com/elkamohammad1988/marsa-web/pull/13)), F1 ([#25](https://github.com/elkamohammad1988/marsa-web/pull/25)) |
| 17 | ESLint 9 migration | P6 | **DONE** — flat config, `eslint .`, puppeteer-core 25. `npm audit` on the **whole** tree is now 0. |
| 18 | Operational documentation | P7, P8 | **DONE** — `docs/RUNBOOK.md`, `docs/DATA.md`, secret rotation, and `ADMIN_SESSION_VERSION` for revoking a session without rotating the secret. |

**Every batch from the original backlog is now closed**, as is every High and
every Critical in `AUDIT.md`. Batches 11, 17 and 18 shipped on 2026-08-19 and
13 on 2026-08-20.

Batch 13 was the last, and it stayed open for a while on purpose. The site *was*
driven end to end in a real browser before then — every route, every form, the
converter, the demo, the admin table — and that is how the pagination defect and
the `/admin` crash below were found. Ad-hoc driving finds bugs; it does not stop
them coming back. What closes the batch is that the driving is now a committed
suite: [`tests/smoke/`](../tests/smoke) starts `next start` against a production
build, launches Chrome, and runs 50 checks as a second required CI job.

Its first form does not count, and is worth recording. The suite existed while
nothing ran it, and it was red the whole time: all fifty tests waited on a
React-internal key that App Router never sets on the node they read, so each one
timed out and the run said nothing about the site. A browser suite nothing runs
is a directory, not a gate. It now waits on `data-hydrated`, an attribute the
application itself publishes.

**Outside the original backlog.** The audit is one dated snapshot, not a
permanent ceiling. Work found by re-reading the repository afterwards is
tracked the same way, with the evidence that motivated it recorded in the
commit that closes it.

| # | Batch | Scope | Status |
|---|---|---|---|
| A | Documentation truth & admin setup copy | `README.md` claimed 94 tests against 367 and listed CI as unbuilt; `/admin/login` told the operator to set an 8-character password the app rejects | **DONE** ([#15](https://github.com/elkamohammad1988/marsa-web/pull/15)) |
| B | The dead theme system removed | A `.dark` block mirroring `:root` value for value, a pre-paint script whose only job was to add that class, and four orphaned icons — closes the half of **F8** Batch 6 deferred | **DONE** ([#22](https://github.com/elkamohammad1988/marsa-web/pull/22)) |
| C | Navigation: ARIA, focus, link hygiene | Closes **F10**; also a dropdown no tap could open, `aria-controls` naming nothing, white focus halos from an unnamed ring offset, and two footer shortcuts to one page | **DONE** ([#17](https://github.com/elkamohammad1988/marsa-web/pull/17)) |
| F | Structured data & sitemap honesty | Eighteen pages rendered a breadcrumb and one emitted `BreadcrumbList`; the sitemap stamped every entry with build time, telling each crawl that all 32 pages had just changed | **DONE** ([#20](https://github.com/elkamohammad1988/marsa-web/pull/20)) |
| G | The demo, as an interaction | Four defects and three gaps found by walking the flow as a reader rather than reading it as a diff | **DONE** ([#21](https://github.com/elkamohammad1988/marsa-web/pull/21)) |

(Batches D and E are the audit's Batch 10 and Batch 12; they were written up
under letters before the boards were reconciled. The PR numbers are the
reliable identifier — #18 and #19.)

---

## Batches in detail

### Batch 0 — Submissions are never silently lost · B1 · **DONE**

**PR:** [#1](https://github.com/elkamohammad1988/marsa-web/pull/1) · merged as `5cca881` · CI `Verify` pass 1m2s

| Item | Finding | Status |
|---|---|---|
| Never render the success screen for a submission that was not persisted | B1 | `DONE` |

`save()` now resolves only for a durable write and throws `StorageWriteError`
otherwise — the "accepted but not persisted" state a caller could ignore no longer
exists. Storage failure surfaces as a 503 with a safe message; the real reason is
logged server-side only. Local gate before merge: typecheck exit 0, lint clean,
117 tests across 11 files (baseline 94/10), build 50 routes.

Also closes the production-throw half of **B8**; the rest of B8 remains in Batch 7.

---

### Batch 1 — Test the security boundary · P5a · **DONE**

**Branch:** `test/security-boundary-units`

The audit's P5: the four modules with zero tests are the four that handle every
byte the public internet sends. This batch adds tests only — **no behaviour
change** — so it is safe to land first and it makes Batches 2–5 verifiable.

| Item | Finding | Scope | Status |
|---|---|---|---|
| Table-driven tests for `lib/validation.ts` | P5 | 254-char email cap, 4000-char message cap, `accountType`-conditional company rule, topic allowlist fallback, three-way consent coercion (`true` / `"true"` / `"on"`) | `DONE` |
| Tests for `lib/rate-limit.ts` | P5 | window rollover, shared→in-memory degradation, `clientKey` `x-forwarded-for` parsing | `DONE` |
| Tests for `lib/postgrest.ts` | P5 | `Content-Range` total parsing, error wrapping, `escapeLike` | `DONE` |

`lib/api-forms.ts` tests are deliberately **excluded** — Batch 0 already adds
`tests/api-forms.test.ts` on `fix/storage-silent-failure`. Duplicating that file
here guarantees a merge conflict for no benefit.

---

### Batch 2 — Public endpoint exposure & abuse limits · S2, S6, S4 · **DONE**

**Branch:** `security/public-endpoint-exposure`

Everything an unauthenticated stranger can reach. One theme: reduce what the
public surface discloses, and cap what it costs.

| Item | Finding | Severity | Status |
|---|---|---|---|
| `/api/health` returns `{status, checks: {ok, configured}}` to anonymous callers; `detail` strings (absolute `DATA_DIR` path, raw PostgREST error bodies with table/column/constraint names, upstream FX status) gated behind `isAdminRequest()` or a `HEALTH_TOKEN` header | S2 | High | `DONE` |
| `rateLimitShared` on `/api/rates` and `/api/rates/history` at 60/min per client — 5,400 enumerable cache keys currently force unmetered upstream calls to a key-less fair-use API | S6 | Medium | `DONE` |
| Rate-limit `/demo/stats`, and exchange the query-string token for an httpOnly cookie on first use so it appears in one log line instead of every one | S4 | Medium | `DONE` |

**Dependency:** the uptime monitor in [H6](#h6--point-an-uptime-monitor-at-apihealth-p3)
must be configured with the `HEALTH_TOKEN` this batch introduces, or it will only
ever see the sanitised response. H6 is written to account for that.

---

### Batch 3 — Admin authentication boundary · S1, S5, S9 · **DONE**

**PR:** [#11](https://github.com/elkamohammad1988/marsa-web/pull/11) · merged as `42a4a2a` · approved under H17

| Item | Finding | Severity | Status |
|---|---|---|---|
| Admin login moves from in-memory `rateLimit` to `rateLimitShared` (5 per 15 min), plus a persisted failure counter with exponential backoff keyed on IP *and* a global counter. `rateLimitShared` already degrades to in-memory on RPC failure, so the "must work when the DB is broken" property the current comment defends is preserved | S1 | High | `DONE` |
| Minimum admin password length 8 → 16 | S1 | High | `DONE` |
| `middleware.ts` with `matcher: ['/admin/:path*', '/api/admin/:path*']` verifying the session cookie signature — converts deny-by-omission into deny-by-default. In-route `isAdminRequest()` checks stay as defence in depth | S5 | Medium | `DONE` |
| Reject `POST /api/admin/logout` when `Sec-Fetch-Site` is `cross-site`, or when `Origin` mismatches the request host | S9 | Low | `DONE` |

**Note:** raising the password floor to 16 will lock the admin area out if the
configured `ADMIN_PASSWORD` is shorter. [H8](#h8--deploy-time-environment-variables-b1-b8-p7)
covers setting a compliant value; the local `.env.local` value generated earlier
is 32 characters and already compliant.

---

### Batch 4 — Small security & privacy corrections · S8, S10, S7 · **DONE**

**Branch:** `security/small-corrections`

| Item | Finding | Severity | Status |
|---|---|---|---|
| `escapeLike` strips PostgREST's `*` wildcard: `/[%_,()*]/g` — admin searching `acme*corp` currently gets a wildcard match, not a literal one | S8 | Low | `DONE` |
| `newId()` uses `crypto.randomUUID()` instead of `Math.random()` — already used elsewhere in the codebase, zero cost | S10 | Low | `DONE` |
| `DemoFlow` reads `localStorage.getItem('marsa-cookie-consent')` and skips the funnel POST when it is `"rejected"` — today "Reject non-essential" changes nothing, because the `marsa:cookie-consent` event has no listeners anywhere in the repo | S7 | Medium | `DONE` |

S7's *code* fix is unambiguous and ships here. The separate question of whether
the banner should exist at all is a product/legal decision — F7, Batch 16,
[H10](#h10--decide-the-cookie-banners-fate-f7).

---

### Batch 5 — Content-Security-Policy · S3 · **DONE**

**Branch:** `security/content-security-policy`

Isolated deliberately: this is the one security change that can break the running
site, so it ships alone where a revert is one clean rollback.

| Item | Finding | Severity | Status |
|---|---|---|---|
| Add `default-src 'self'`, `script-src 'self' 'sha256-…'` (the theme script is a compile-time constant, so a static hash covers it), `connect-src 'self'`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'`, `font-src 'self'` | S3 | Medium | `DONE` |
| Verify the JSON-LD blocks still validate — non-executable script types are handled inconsistently across browsers; fall back to a middleware nonce if they trip | S3 | Medium | `DONE` |
| Align `X-Frame-Options: SAMEORIGIN` to `DENY` to match `frame-ancestors 'none'` | S3 | Medium | `DONE` |

---

### Batch 6 — Accessible error states · F2, F3, F8 · **DONE**

**Branch:** `fix/error-state-contrast`

Pulled ahead of the backend work — see [ordering refinement 3](#ordering-the-reasoning).
One theme: every failure state the design system already has a token for, but
does not use.

| Item | Finding | Severity | Status |
|---|---|---|---|
| Replace `text-red-600` (4.04:1 on `--card`, 4.12:1 on `--canvas` — both fail AA for 12–14px text) with `text-danger` (7.84:1 / 7.99:1) at all six sites: `forms/fields.tsx:56,185`, `GetStartedForm.tsx:179`, `ContactForm.tsx:130`, `IbanChecker.tsx:109`, `AdminLoginForm.tsx:60`, `admin/page.tsx:186` | F2 | High | `DONE` |
| Replace `border-red-400` in `forms/fields.tsx:18` with `border-danger/60` | F2 | High | `DONE` |
| IBAN checker failure panel: `border-red-200 bg-red-50` (near-white `#FEF2F2` on a `#0C080B` site) → `border-danger/30 bg-danger/[0.06]`, `text-danger` for icon and reason | F3 | High | `DONE` |
| Delete `components/ThemeToggle.tsx` — imported nowhere, and `.dark` is an exact mirror of `:root` so it could not work if mounted; replace both unreachable `dark:` variants with `text-danger` | F8 | Low | `DONE` |

The audit notes why `README.md`'s "0 axe violations across 29 routes" missed all
of this: error states only render after a failed submit, so a crawl never sees
them. Tests here assert the rendered class contract, not a ratio computed in a
test.

---

### Batch 7 — Fail loudly on misconfiguration · B8 · **DONE**

**Branch:** `fix/environment-validation`

| Item | Finding | Severity | Status |
|---|---|---|---|
| `lib/env.ts` parses the environment once at module load, validates shapes (URL parses, key length, sender is an email address) and **throws in production** for anything half-configured — a partially-set `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` pair becomes a hard error, not a silent downgrade to the file store | B8 | Medium | `DONE` |
| Zero-config local development keeps working unchanged — the throw is `NODE_ENV === 'production'` only | B8 | Medium | `DONE` |

This is the structural half of B1: Batch 0 stops lying to the *user* about a lost
submission; this stops the deploy reaching production in that state at all.

---

### Batch 8 — Migration infrastructure · P4 · **DONE**

**PR:** [#14](https://github.com/elkamohammad1988/marsa-web/pull/14) · merged as `e5fd2e3`

The apply procedure lives in [`db/README.md`](./db/README.md) rather than a new
`docs/` directory: it is a page about the migration files, and it belongs next
to them.

| Item | Finding | Severity | Status |
|---|---|---|---|
| `db/migrations/NNN_description.sql` plus a `schema_migrations` table recording what has been applied where; `db/schema.sql` becomes `001_initial_schema.sql` | P4 | High | `DONE` |
| A documented apply procedure, and a runner script that is safe to re-run | P4 | High | `DONE` |
| Document the backup and restore procedure in `docs/` | P4 | High | `DONE` |

Backups themselves are dashboard work — [H5](#h5--enable-point-in-time-recovery-and-test-one-restore-p4).
The audit's point stands and is worth repeating in the plan: *an untested backup
is a hypothesis*.

---

### Batch 9 — Database correctness & round trips · B7, B3, B4 · **DONE**

**PR:** [#14](https://github.com/elkamohammad1988/marsa-web/pull/14) · merged as `e5fd2e3`, together with Batch 8

| Item | Finding | Severity | Status |
|---|---|---|---|
| `create index rate_limit_hits_window_idx on public.rate_limit_hits (window_start)` — the purge predicate cannot use the `(key, window_start)` primary key, so it is a sequential scan taking row locks, on 1% of form submissions, while a user waits | B7 | Medium | `DONE` |
| Move the purge out of the request path (`pg_cron`, or a scheduled route) | B7 | Medium | `DONE` |
| Funnel aggregation moves into Postgres — `select step, count(distinct session_id) … group by step` behind an RPC. Today it pulls up to 20,000 rows per page view and truncates *silently*; past 20,000 events it keeps the most recent rows, drops early sessions' `start` events while keeping their later steps, and `completionRate` can exceed 100% | B3 | Medium | `DONE` |
| Single `submission_stats()` function replacing five HTTP round trips per admin render | B4 | Medium | `DONE` |

Each shipped as a numbered migration. **Both call sites fall back to the old
implementation when the function is absent**, so merging this could not break
the admin dashboard while the migrations were still pending — which they still
are. Applying them to the live database is
[H3](#h3--apply-the-database-migrations--not-yet-done).

---

### Batch 10 — Observability · B2, P3 · **DONE** (adapter + monitor await the human)

**Branch:** `feat/observability`

| Item | Finding | Severity | Status |
|---|---|---|---|
| A provider-agnostic `lib/observability.ts` seam with `captureException`, wired at the four sites the audit names — storage write failure (`storage.ts:108`), DB→file fallback (`storage.ts:217`), email never sent (`notify.ts:86`), rate limiter degraded (`rate-limit.ts:64`) — plus `app/error.tsx` | B2 | High | `DONE` |
| Request ID generated in middleware and attached to every captured event | B2 | High | **DONE — differently**, see below |
| Sentry (or equivalent) adapter behind the seam, active only when a DSN is present | B2 | High | **BLOCKED-ON-ME** ([H7](#h7--create-an-error-tracking-project-and-supply-the-dsn-b2)) |
| Uptime monitor on `/api/health` | P3 | High | **BLOCKED-ON-ME** ([H6](#h6--point-an-uptime-monitor-at-apihealth-p3)) |

The seam ships whether or not a DSN exists, so this batch is not fully blocked:
with no DSN it logs structurally, which is still an improvement on ten
unstructured `console.*` calls. Only the adapter and the monitor wait on the human.

**The correlation id is not a middleware request ID, and that was a choice.** The
row above asks for one minted in `middleware.ts` and attached to every captured
event. What shipped is `newReference()` in `lib/observability.ts`: a short
uppercase code minted at the failure site, written into the captured event *and*
returned to the visitor in the error message — `lib/api-forms.ts` names it "the
correlation id B2 asked for" at the point it uses it.

The difference is who can quote it. A middleware request ID correlates log lines
to each other; nobody outside the server ever sees one, so a visitor reporting
"the contact form did not work" still hands the operator nothing to search on. A
reference the visitor is shown resolves an *email* to exactly one log line, which
is the case that actually arises here — a public form on a site with no support
tooling. It is deliberately not a general-purpose trace id, and every request
that succeeds has none.

---

### Batch 11 — Retention & erasure · B10, P9 · **DONE**

**Branch:** `feat/data-retention`

| Item | Finding | Severity | Status |
|---|---|---|---|
| Delete action in `/admin` for a single submission — today the only path for a GDPR erasure request is hand-written SQL | B10 | Low | `DONE` |
| Scheduled purge of `demo_events` older than 90 days — aggregate telemetry, the raw rows have no value once aggregated | B10 | Low | `DONE` |
| Retention policy for `submissions` | B10 | Low | **BLOCKED-ON-ME** ([H12](#h12--decide-data-retention-periods-b10)) |
| `.data/README` noting the directory holds personal data and must never leave the machine; confirm `git status --ignored` shows nothing under `.data/` tracked | P9 | Low | `DONE` |

The retention *period* is a legal decision, not an engineering one. The mechanism
ships configurable; the number comes from [H12](#h12--decide-data-retention-periods-b10).

---

### Batch 12 — Storage internals · B6, B5, B9 · **DONE**

**Branch:** `refactor/storage-internals`

| Item | Finding | Severity | Status |
|---|---|---|---|
| Extract `JsonlStore<T>` (path, append, readAll) and `pickProvider(env, makePg, makeFile)` — `lib/analytics.ts` currently duplicates ~60 lines of `lib/storage.ts` verbatim, so every future change must be made twice | B6 | Medium | `DONE` |
| Bound the file-store reads — read the trailing N bytes rather than parsing and sorting the entire dataset on every request | B5 | Medium | `DONE` |
| Document in `README.md` that the file store is a development fallback, not a production path | B5 | Medium | `DONE` |
| Read response bodies inside the guarded scope, or use `AbortSignal.timeout(8000)` — today `finally` clears the timeout when *headers* arrive, so a stalled body can hang well past the intended ceiling (`postgrest.ts:90,110,138`, `fx.ts:194,220,254`) | B9 | Low | `DONE` |

Deliberately after Batch 9: refactoring the storage layer while its query shapes
are still changing means doing it twice.

---

### Batch 13 — End-to-end smoke tests · P5b · **DONE**

**Branch:** `test/e2e-smoke`

| Item | Finding | Severity | Status |
|---|---|---|---|
| Drive every public route in a real browser | P5 | High | **DONE** |
| Drive the interactive controls — pagination, IBAN, FX, accordion, nav | P5 | High | **DONE** |
| Wire the browser suite into `.github/workflows/ci.yml` | P5 | High | **DONE** |

Placed here on purpose: e2e tests written against surfaces that later batches
will change become a suite everyone learns to skip. By Batch 13 the forms, the
admin area and the auth boundary have stopped moving.

**Shipped as Puppeteer, not Playwright**, and the rows above are reworded from
the plan to match what was actually built. Puppeteer drives the one browser
this suite needs against a binary CI already has, with no second download step
and no extra runtime; Playwright buys cross-browser coverage this suite does
not claim. The harness is in [`tests/smoke/harness`](../tests/smoke/harness).

**The lead and CSV rows became something else on purpose.** Both are asserted
by the unit suite end to end already — validation, storage and the CSV escape
rules — and the deployment the suite runs against has no database, which is
the shape the public site actually runs in. Re-driving them through a browser
would have meant standing up Postgres in CI to re-check logic that is already
covered more cheaply. What a browser can prove and nothing else could is what
the suite does instead: that every route answers, hydrates, and has no dead
control on it — which is where the two defects this batch was written for
(`/blog` pagination, the `/admin` crash) actually lived.

---

### Batch 14 — Blog dates, ordering & structured data · F5, F4, F6 · **DONE**

**Branch:** `fix/blog-dates-and-schema`

| Item | Finding | Severity | Status |
|---|---|---|---|
| Store `date: "2025-03-30"` (ISO 8601) and render with `Intl.DateTimeFormat`, matching the pattern already used for FX dates. `blogPostingSchema` currently passes a display string like `"March 30, 2025"` straight through, so Google's Rich Results test rejects it and **none of the six posts is eligible for an article rich result** | F5 | Medium | `DONE` |
| Sort the blog index descending by date — a one-liner once F5 lands. Today the oldest post leads and the newest is fourth | F4 | Medium | `DONE` |
| Accordion always renders its panel with a stable `id`, collapsed via `hidden`, with `aria-controls` on the button — fixes both the FAQPage schema asserting answers absent from the DOM *and* the missing `aria-controls` target, in one change | F6 | Medium | `DONE` |

F5 strictly precedes F4: the dates are unparseable display strings until F5.

---

### Batch 15 — Markup honesty & artifact weight · F10, F9 · **DONE**

**F10 shipped as Batch C**, which grew past the audit's description.

| Item | Finding | Severity | Status |
|---|---|---|---|
| Drop `role="menu"` / `role="menuitem"` from the navbar dropdown. The ARIA menu pattern commits to arrow keys, Home/End, type-ahead and focus movement; none is implemented, so screen-reader users are told "menu, 6 items" and find the arrow keys do nothing. A button with `aria-expanded` plus a plain `<ul>` of links describes what the component actually does, and tab navigation already works | F10 | Low | **DONE** |
| Delete `hero-blog-2/3/4/5.png` and `hero-blog-list.png` — referenced nowhere, ~630 KB of artifact weight | F9 | Low | `DONE` |

F9 was sequenced **after** F1, in case a hero-blog file turned out to be worth
reusing as a distinct blog cover rather than deleting — it is the one deletion
in this programme that is not trivially reversible from the working tree, so it
waited for [H9](#h9--source-real-product-imagery-f1) rather than proceeding on
the grounds that git remembers. H9 then removed every raster asset in the
repository, which subsumed this row: there was no hero-blog file left to reuse.

---

### Batch 16 — Imagery & cookie banner · F1, F7 · **DONE**

**Branch:** `fix/real-imagery` (F1) · F7 shipped in [#13](https://github.com/elkamohammad1988/marsa-web/pull/13)

| Item | Finding | Severity | Status |
|---|---|---|---|
| Replace `coin-blue`, `coin-gold`, `card-phone`, `phone-apps`, `phone-home`, `cards-stack` with real product imagery — 17 files currently have 6 unique hashes | F1 | High | **DONE** — by deleting them ([H9](#h9--source-real-product-imagery-f1)) |
| Give each blog post a distinct cover — `blog-2.png` and `blog-4.png` are the same bytes | F1 | High | **DONE** — `components/art/BlogCover.tsx` draws one per post |
| Correct every `alt` to describe what is actually rendered — `card-phone.png` is served as `alt="Marsa Mastercard and mobile app"` and is a blog photograph. This is a WCAG 1.1.1 failure: a screen-reader user is told something untrue | F1 | High | **DONE** — no raster art left to mis-describe |
| Cookie banner: removed, because the one cookie the site sets is strictly necessary and exempt | F7 | Medium | **DONE** ([#13](https://github.com/elkamohammad1988/marsa-web/pull/13)) |

**F1 did not resolve the way this batch was written.** It was planned as
procurement — buy or shoot six images, then re-caption them — and it is
recorded here as blocked on that for months. What actually happened, on
2026-07-27, is [H9](#h9--source-real-product-imagery-f1): the seventeen files
were **deleted** and the illustrations redrawn in the browser from the design
tokens (`components/art/BrandArt.tsx`, `components/art/BlogCover.tsx`). There
is no `public/` directory in this repository any more.

That closed all three rows at once, and it is worth naming why, because it is
the method this project keeps arriving at: the alt-text row could not be fixed
while the images existed — a truthful caption for a file nobody could vouch for
is still a file nobody can vouch for. Removing the state removed all three
symptoms, including the trademark on a card for a product with no issuer.

`lib/consent.ts` and the `DemoFlow` consent check survive the banner's removal
on purpose: nothing writes that value today, but deleting the mechanism while
[H18](#h18--approve-corrected-cookie-policy-copy-f7)'s copy is still under
review would be the wrong order.

---

### Batch 17 — ESLint 9 migration · P6 · **DONE**

**Branch:** `chore/eslint-9`

| Item | Finding | Severity | Status |
|---|---|---|---|
| `npx @next/codemod@canary next-lint-to-eslint-cli .` → ESLint 9 flat config. Clears 13 high advisories (all `brace-expansion` GHSA-mh99-v99m-4gvg via the end-of-life ESLint 8 chain) and the `next lint` deprecation in one change | P6 | Medium | `DONE` |
| Update `.github/workflows/ci.yml` and the `lint` script | P6 | Medium | `DONE` |
| Quote **both** audit numbers in `README.md` — stating only `--omit=dev`'s 0 is accurate but understates the toolchain's state | P6 | Medium | `DONE` |

Late because nothing here ships to a user: `npm audit --omit=dev` is 0
vulnerabilities. It is deadline-driven (Next 16 removes `next lint`), not
risk-driven.

---

### Batch 18 — Operational documentation · P7, P8 · **DONE**

**Branch:** `docs/operations`

| Item | Finding | Severity | Status |
|---|---|---|---|
| `docs/RUNBOOK.md` — `/api/health` 503 triage, dependency failure playbooks, rollback, and how to recover leads from logs when `persisted` was false | P8 | Medium | `DONE` |
| `docs/DATA.md` — what is collected, where it lives, how long, how to delete it, who may access `/admin` | P8 | Medium | `DONE` |
| Document rotation for all five secrets, and the preview/production separation | P7 | Medium | `DONE` |
| `token_version` claim compared against an env var (or a `sessions` table) so a single admin session can be revoked without rotating `ADMIN_SESSION_SECRET` and redeploying | P7 | Medium | `DONE` |

Last on purpose: a runbook describing the system after seventeen batches is worth
writing once, at the end.

---

<a id="the-honesty-programme"></a>
## The honesty programme

`AUDIT.md` asked whether the code was correct. It did not ask whether the site
was **true**. Those turn out to be different questions, and the second one had
worse answers.

The trigger was a single observation with a date on it: this repository is
**public**, the site is a working Next.js application, and its forms collected a
name and an email address behind a success screen reading *"our onboarding team
will email you within one business day with your next steps and
identity-verification link."* There is no onboarding team. Nobody was going to
email anybody. That is a false statement made to a real person on a public URL,
and it created a live data-protection obligation for a project with no operator
to discharge one.

Pulling that thread found the rest.

### What was fixed, in the order it shipped

| # | PR | What it was |
|---|---|---|
| 1 | [#23](https://github.com/elkamohammad1988/marsa-web/pull/23) | **The forms.** Now validate through the same `lib/validation.ts` the server uses, then **transmit nothing and store nothing**. A designed panel says what happened and what the real pipeline would have done, and names the endpoint that would have run. The intake pipeline itself — rate limiting, honeypot, durable storage, notification — stays in the repository and stays tested; it is simply not wired to the public form. |
| 2 | [#24](https://github.com/elkamohammad1988/marsa-web/pull/24) | **The credentials.** `ConceptBadge` on every route. The FSCS reference, the ombudsman referral and *"100% of customer funds are safeguarded"* removed outright. `support@`/`sales@`/`press@marsa.money` and three social profiles — all at a domain nobody owns, the addresses live `mailto:` links, the profiles emitted in `Organization.sameAs` — now default to empty, with every consumer rendering nothing rather than inventing one. The canonical origin stopped defaulting to that same domain. |
| 3 | [#25](https://github.com/elkamohammad1988/marsa-web/pull/25) | **The imagery.** Seventeen PNGs, six unique hashes, 2.05 MB, provenance unknown, alt text describing other photographs. Replaced by drawings in markup, each carrying its own description. Scheme-neutral card, no network mark; the trademark removed from copy on five pages. Closes **F1** and absorbs **F9**. |
| 4 | [#26](https://github.com/elkamohammad1988/marsa-web/pull/26) | **The people and the jobs.** Nine testimonials attributed to named individuals with job titles and cities — three pages ran the same quote from the same invented person. Five open roles with Apply buttons and a benefits package. Both gone. |
| 5 | [#27](https://github.com/elkamohammad1988/marsa-web/pull/27) | **`/company/about`** — open, awaiting the maintainer. Proposes turning a company profile for a company that does not exist into a page about the build, with every statistic derived from the module that implements it. |

### The rule that emerged

**The line is drawn at statements with legal weight, not at product claims.**

A concept describing free SEPA transfers is a product claim about a hypothetical
product — normal, and the polish is the point of the exercise. A page telling a
reader they may refer a complaint to the financial ombudsman service is a false
statement about a legal right they do not have. An endorsement attributed to a
named person asserts that a real human had a real experience. A `sameAs` entry
is a machine-readable claim to own an account.

Those are the ones that had to go. The product copy stayed.

### The pattern in every fix

Each of these was fixed by removing the *state that allowed it*, not the
instance:

- The forms cannot lie about a submission because they no longer make one.
- No `NEXT_PUBLIC_*` fallback may be a URL or an email literal — asserted by
  `tests/site-identity.test.ts`, which scans source rather than checking one
  string.
- An illustration cannot be mislabelled because the caption is keyed off the
  same union the drawing is, and there is no per-page `alt` prop left to drift.
- A testimonial cannot reappear, because `authorName` as a prop shape fails the
  test whatever it says.
- The sitemap cannot advertise a 404, because every path in it is asserted to
  resolve to a page file.

### Still open

**Nothing from this list.** It held six items until 2026-08-24 and all six are
closed. They are recorded here rather than deleted, because a backlog that
quietly loses its entries is a backlog nobody can audit — and because this
table was itself the problem for a while: it went on asserting a fake legal
entity and a broken dashboard in a *public* repository long after both were
fixed, which is the same class of stale claim the honesty programme exists to
catch.

| Item | Closed by |
|---|---|
| `lib/legal.ts` — the `regulatoryDisclosure()` fallback described licensed partner institutions holding customer funds, in the present tense. | Rewritten in the conditional: *"…is a concept build, not a financial service. There is no company behind it, no licence, no regulator and no partner institution… The product it depicts **would** run on the licensed-partner model."* |
| `regulatorySummary()` — same file, same problem, and no callers at all. | Deleted. `grep` finds no reference in `lib`, `components` or `app`. |
| The sentences following the disclosure in `Footer.tsx` and `/legal/terms` asserted operation immediately after a paragraph denying it. | Removed. No occurrence of *"provides multi-currency accounts"* remains. |
| `siteConfig.legalName` was `"Marsa Money Ltd."`, emitted in `Organization.legalName`. | Removed from `lib/site.ts` and `lib/schema.ts`. The live JSON-LD carries no `legalName` and is an `Organization`, not a `FinancialService`. |
| Nobody had looked at the artwork rendered in a browser. | Looked at, on the deployed site, at 320 / 390 / 1440px, plus all seven captured images. |
| `components/admin/FunnelView.tsx` — a funnel step could render **above 100%** of the start step. `width` clamped only the lower bound, so the bar overflowed its track. Found while re-capturing `05-analytics.png` against the local JSONL fallback, which yielded `Verified (KYC) · 116.7%`. | Clamped at both ends: `Math.min(100, Math.max(row.pctOfStart, row.sessions > 0 ? 2 : 0))`. The *label* still prints the true figure, so a reader sees `116.7%` and knows the data is odd; what they no longer see is a bar running past the end of the row. |

---

## Milestone 1 — customer authentication · 2026-07-27

The first work in this repository that is not remediation. `AUDIT.md` is
closed and the honesty programme is down to its last blocked item, so this
adds a capability rather than correcting one.

**What it is.** Registration, email confirmation, sign-in, sign-out, password
recovery, session persistence with silent token renewal, a profile per account,
and a role model — Supabase Auth over its REST API, no SDK, an HMAC-signed
`httpOnly` session cookie, and authorisation enforced by Row Level Security in
Postgres. Architecture and setup in [`AUTHENTICATION.md`](AUTHENTICATION.md).

**The four decisions worth recording here:**

1. **No `@supabase/ssr`.** Its cookies are meant to be read by a browser
   client, so they cannot be `httpOnly`. Nothing here authenticates from the
   browser, so the session is `httpOnly` and an XSS bug cannot read it. It also
   keeps the four-dependency claim in the README true and avoids a second
   PostgREST client beside `lib/postgrest.ts`.
2. **Our own signed envelope** around Supabase's tokens, so middleware can
   authenticate on the Edge runtime without a network call and without holding
   Supabase's JWT signing secret. It reuses the primitive the admin session has
   run on since audit S5, which is now shared in `lib/signed-cookie.ts`.
3. **The database decides.** `lib/profiles.ts` never uses the service-role key.
   The administrator's directory is written as "select every profile" with no
   role filter and returns one row to everybody else. A wrong role in a cookie
   opens a page and reads nothing.
4. **Two authentication systems, not one.** `/admin` stays a single operator
   password over form submissions. Merging them would mean that password could
   read customer rows.

**The one existing assertion that changed.** `tests/migrations.test.ts`
asserted *"never creates a row level security policy"* — correct while every
row belonged to the operator. A profile has an owner, so 004 adds policies, and
the property that test defended is now stated more precisely and more strictly:
no policy grants anything to `anon` or `public`, every policy is scoped to
`authenticated`, every policy is constrained by `auth.uid()` or `is_admin()`,
and only reads and updates are granted at all. One assertion out, four in.
Nothing else in the existing suite was touched.

**The honesty consequence.** Accounts store real email addresses, so three
sitewide claims stopped being true and were narrowed rather than deleted:
`ConceptBadge` now says the *marketing forms* discard input and states exactly
what an account stores; the footer's "No data collected" chip is gone, because
a privacy claim that holds for most of a site is a false one; and the README's
"nothing here can be signed up to" is replaced by what is now the case. The
marketing forms themselves are untouched and
`tests/forms-collect-nothing.test.ts` passes unchanged.

**Inert until [H21](#h21--switch-customer-accounts-on).** Nothing was applied
to any Supabase project — there is none behind the deployment, and migration
004 is written and tested but not run, per the standing rule that changes
inside Supabase are yours to make.

---

<a id="human-actions"></a>
## HUMAN ACTIONS

Everything below needs a human. Each is written to be followed without further
research.

**Deployment posture.** This project is deliberately not connected to any hosting
provider and will not be until development finishes. No `vercel` command is run
and no deploy is attempted anywhere in this programme. Actions marked
**deploy-time** below are prerequisites to record now and execute when you decide
to launch — they are not blockers for any batch.

| # | Action | Unblocks | Priority |
|---|---|---|---|
| ~~H1~~ | ~~Authenticate the GitHub CLI~~ | — | **RESOLVED** |
| [H2](#h2--rotate-the-supabase-secret-key) | Rotate the Supabase secret key | security hygiene | Now |
| [H3](#h3--apply-the-database-migrations--not-yet-done) | **Apply the database migrations** — only when a Supabase project is actually connected; none is | storage, shared rate limiting, funnel & admin aggregation | **deploy-time** |
| ~~H4~~ | ~~Apply pending migrations once Batch 9 lands~~ — folded into H3, which now covers all three files | — | **RESOLVED** |
| [H5](#h5--enable-point-in-time-recovery-and-test-one-restore-p4) | Enable PITR and test one restore | P4 | Before launch |
| [H6](#h6--point-an-uptime-monitor-at-apihealth-p3) | Uptime monitor on `/api/health` | P3 | **deploy-time** |
| [H7](#h7--create-an-error-tracking-project-and-supply-the-dsn-b2) | Error-tracking DSN | B2 | Before Batch 10 |
| [H8](#h8--deploy-time-environment-variables-b1-b8-p7) | Deploy-time environment variables | B1, B8, P7 | **deploy-time** |
| ~~H9~~ | ~~Source real product imagery~~ — **resolved by not sourcing any**: the seventeen files were deleted and the art redrawn from design tokens | F1, F9 | **RESOLVED** |
| ~~H10~~ | ~~Decide the cookie banner's fate~~ — you chose **A**, removed in [#13](https://github.com/elkamohammad1988/marsa-web/pull/13) | F7 | **RESOLVED** |
| [H11](#h11--enable-branch-protection-on-main) | Branch protection on `main` | process | Now |
| [H12](#h12--decide-data-retention-periods-b10) | Decide data retention periods | B10 | Before Batch 11 |
| [H13](#h13--deploy-time-connect-the-host-to-the-repository) | Connect the host to the repository | deploy provenance | **deploy-time** |
| ~~H14~~ | ~~Decide `/demo/stats`' fate~~ — you chose **B**, deleted in [#12](https://github.com/elkamohammad1988/marsa-web/pull/12) | S4 | **RESOLVED** |
| [H15](#h15--verify-a-resend-sender-domain) | Verify a Resend sender | notifications | Before launch |
| ~~H17~~ | ~~Approve the admin auth batch~~ — approved, shipped in [#11](https://github.com/elkamohammad1988/marsa-web/pull/11) | Batch 3 | **RESOLVED** |
| [H18](#h18--approve-corrected-cookie-policy-copy-f7) | **Approve corrected cookie-policy copy** | F7 | **Now** |
| [H21](#h21--switch-customer-accounts-on) | **Switch customer accounts on** — two dashboard settings and three environment variables | the whole `/account` area | **Now** |
| [H16](#h16--review-and-merge-each-pr) | Review each merged PR | oversight | Ongoing |

---

### ~~H1 — Authenticate the GitHub CLI~~ · **RESOLVED 2026-07-25**

`gh auth login --with-token` rejected the credential already in Git Credential
Manager (*"missing required scope `read:org`"*). That scope governs organisation
listing, not pull request operations on a personal repository, and `GH_TOKEN`
bypasses the check. Every `gh` call now sources the token from the git credential
helper inline; the value is never printed, written or persisted. No action needed
from you.

If you later want `gh` authenticated persistently for your own use, run
`! gh auth login` and pick **GitHub.com → HTTPS → browser**.

---

<a id="h2--rotate-the-supabase-secret-key"></a>
### H2 — Rotate the Supabase secret key

The `sb_secret_…` key was pasted into a chat message earlier in this session. If
that transcript is stored, synced or backed up anywhere outside your control,
treat the key as disclosed. It bypasses Row Level Security on every table.

It was **never committed** — `.env.local` is covered by `.gitignore:25` and
`git check-ignore` confirms it — so it is not in the public repository. Rotation
is prudence about the chat transcript, not incident response.

1. Go to **supabase.com/dashboard** and open your project.
2. Left sidebar → the gear icon (**Project Settings**) at the bottom.
3. Click **API Keys**.
4. Find the secret key row, click the **⋯** menu at its right, choose **Rotate**
   (older projects: **Service Role** section → **Generate new secret**).
5. Confirm. Copy the new value **directly into the file** — do not paste it into
   any chat, issue, commit message or ticket.
6. Open `.env.local` in the project root and replace the value after
   `SUPABASE_SERVICE_ROLE_KEY=`.
7. Nothing else to update — there is no deployed environment yet. When you launch,
   [H8](#h8--deploy-time-environment-variables-b1-b8-p7) covers setting it on the host.

Verify: `npm run dev`, then open `http://localhost:3000/api/health` — the
`database` check should read `configured: true` and `ok: true`.

---

<a id="h3--apply-the-database-migrations--not-yet-done"></a>
### H3 — Apply the database migrations · **not yet done**

> **Status: FUTURE — NOT CURRENTLY DEPLOYED.** Marsa is not connected to a
> Supabase production project. The live deployment runs with no database at
> all: `/api/health` reports `storage`, `database`, `admin` and
> `notifications` as `configured: false`, and only the key-less FX source as
> configured. Nothing in this section is an active production issue, because
> there is no production database for it to be an issue *in*. It is the
> prerequisite list to work through **when** a project is first connected, and
> the verification to run **at that point**.

Everything under `db/migrations/` is therefore **prepared infrastructure**:
written, unit-tested against a stub, and applied nowhere. Do not read the
table below as a description of a running system.

The table records what a one-off inspection on 2026-08-17 found in a
development project that a local `.env.local` pointed at. It is kept because
it is the only evidence on file about how an unmanaged database drifts from
its migration files — an early form of the schema had been applied by hand and
nothing since — not because it describes anything currently serving traffic.

| Object | Migration | Present |
|---|---|---|
| `submissions`, `demo_events`, `rate_limit_hits`, `check_rate_limit()` | 001 | **yes** |
| `schema_migrations` (the ledger) | 001 | no |
| `purge_rate_limit_hits()`, the `window_start` index | 002 | unknown — the ledger is what would say |
| `demo_funnel()`, `submission_stats()` | 003 | no |
| `profiles` and its policies | 004 | no |
| the EXECUTE revokes | 005 | no |

What that would cost **once a project is connected**, in order of weight — none
of it applies to the current deployment, which has no database:

- **005 is the one with a security consequence rather than a performance one,
  and so the one to verify first.** Until it runs, the four definer-rights
  functions 001-003 create are callable by the anon key — which matters the
  moment a project exists and `SUPABASE_ANON_KEY` is configured for the account
  area, and not before.
  `db/migrations/005_rpc_execute_privileges.sql` sets out exactly what it opens.
  Treat it as a **release gate on first connecting Supabase**: apply it in the
  same sitting as 001-004, then confirm with the `locked_down` query below
  rather than assuming.
- Every render of `/admin` and `/admin/funnel` logs a `storage.stats.degraded`
  or `analytics.funnel.degraded` warning and falls back to four HEAD counts or
  a truncated row scan. The pages work; they are doing avoidable work and
  saying so.
- `profiles` is absent, so configuring `SUPABASE_ANON_KEY` and
  `AUTH_SESSION_SECRET` would produce a sign-in that succeeds and an account
  area with nothing in it. Apply 004 **before** switching accounts on.
- The ledger is absent, so `npm run db:migrate -- --dry` reports *0 applied*
  regardless of what is really there. Applying 001 again fixes that: every
  statement in it is `if not exists`, so on this database it is a no-op that
  creates the ledger.

1. **supabase.com/dashboard** → your project.
2. Left sidebar → **SQL Editor** (the `>_` icon) → **+ New query**.
3. Open `db/migrations/001_initial_schema.sql`, copy all of it, paste, click
   **Run** (or Ctrl+Enter). Confirm *Success. No rows returned*.
4. Repeat for `002_rate_limit_window_index.sql`,
   `003_aggregate_functions.sql`, `004_auth_profiles.sql`, then
   `005_rpc_execute_privileges.sql`. **In that order** — each assumes its
   predecessors have run, 004 writes to the ledger 001 creates, and 005 revokes
   privileges on functions 001-003 define.

Every file is idempotent and records itself in `schema_migrations`, so a
re-run is a no-op and the ledger stays correct however you apply them.

**Verify** — from the project root:

```sh
npm run db:migrate -- --dry
```

Expect *"5 migration(s) already applied. Nothing to do."* Then confirm the
security model is intact, expecting `locked_down = true` on every row. Note
that `profiles` is deliberately **not** in this list: it is the one table with
RLS policies, because a profile has an owner and a submission does not.
`db/README.md` carries the query for that one and for the column privileges
that make `role` unwritable from a browser session.

```sql
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       count(p.polname) as policy_count,
       (c.relrowsecurity and count(p.polname) = 0) as locked_down
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('submissions','demo_events','rate_limit_hits','schema_migrations')
group by c.relname, c.relrowsecurity
order by c.relname;
```

Optionally schedule the rate-limit purge so it never sits in a visitor's
request — see the last section of `db/README.md`.

---

<a id="h4--apply-pending-database-migrations-p4-b3-b4-b7"></a>
### ~~H4 — Apply pending database migrations~~ · **RESOLVED into H3**

Written when Batches 8 and 9 were still unbuilt, on the assumption their
migrations would arrive after 001 had already been applied. Both shipped in
[#14](https://github.com/elkamohammad1988/marsa-web/pull/14) while **zero**
migrations had been applied, so there is one job, not two:
[H3](#h3--apply-the-database-migrations--not-yet-done) now covers all three
files in order. Follow that; ignore this.

---

<a id="h5--enable-point-in-time-recovery-and-test-one-restore-p4"></a>
### H5 — Enable Point-in-Time Recovery and test one restore · P4

The submissions table is the entire output of the marketing site and holds
personal data. There is currently no documented backup or restore procedure.

**Enable PITR:**

1. **supabase.com/dashboard** → your project.
2. Left sidebar → **Database**.
3. Click **Backups** in the Database submenu.
4. Open the **Point in Time** tab.
5. If it shows an upgrade prompt, PITR requires a paid plan — click
   **Upgrade to Pro** and complete checkout, then return here.
6. Enable PITR and set retention to at least **7 days**.

**Then test a restore — this is the part that matters:**

7. Dashboard home → **New project**, name it `marsa-restore-test`, same region.
8. In the original project: **Database → Backups → Point in Time**, pick a
   timestamp, and follow the restore flow targeting the scratch project.
9. In the scratch project's **SQL Editor**, run
   `select count(*) from public.submissions;` and confirm it is non-zero and
   plausible.
10. Delete the scratch project: **Project Settings → General → Delete project**.
11. Tell me the date you completed this — it goes in `docs/RUNBOOK.md` in Batch 18.

An untested backup is a hypothesis.

---

<a id="h6--point-an-uptime-monitor-at-apihealth-p3"></a>
### H6 — Point an uptime monitor at `/api/health` · P3 · **deploy-time**

`/api/health` is well built for exactly this and nothing polls it. There is
nothing to monitor until the site is deployed, so this is recorded now and
executed at launch. It also needs the `HEALTH_TOKEN` header introduced in Batch 2
— without it the monitor sees only the sanitised response and cannot distinguish
which dependency broke.

Using Better Stack (free tier is sufficient):

1. Sign up at **betterstack.com/uptime**.
2. Click **Create monitor**.
3. URL: `https://<your-production-domain>/api/health`
4. Set **Check frequency** to 3 minutes.
5. Expand **Advanced** → **Request headers**, add
   `X-Health-Token` with the value you set for `HEALTH_TOKEN` in
   [H8](#h8--deploy-time-environment-variables-b1-b8-p7).
6. Set **Request timeout** to **15 seconds** — *not* the default. The endpoint
   calls the FX provider synchronously with an 8-second timeout, so a shorter
   monitor timeout produces false alarms.
7. Under **Alerting**, set *Call/email me when* → **HTTP status is not 200**.
8. Add your email (and phone, if you want escalation) under **On-call**.
9. Click **Create monitor**, then **Send test alert** to confirm delivery.

Verify: temporarily point the monitor at a URL that returns a non-200, confirm the
alert actually reaches you, then point it back. An alert nobody receives is the
same as no monitor.

---

<a id="h7--create-an-error-tracking-project-and-supply-the-dsn-b2"></a>
### H7 — Create an error-tracking project and supply the DSN · B2

1. Sign up at **sentry.io** (free tier covers this volume).
2. **Create project** → platform **Next.js** → name it `marsa-web`.
3. On the setup screen, copy the **DSN** (`https://…@…ingest.sentry.io/…`).
4. A Sentry DSN is not a secret in the same sense as a service-role key — it is
   embedded in client bundles by design — but add it as an environment variable
   rather than committing it, especially given this repository is public. Add
   `SENTRY_DSN` to your local `.env.local`; the deploy-time copy is
   [H8](#h8--deploy-time-environment-variables-b1-b8-p7).
5. Tell me when it exists; I will wire the adapter in Batch 10.
6. In Sentry: **Settings → Alerts → Create alert rule** → *Issues* →
   "when a new issue is created" → notify your email.

---

<a id="h8--deploy-time-environment-variables-b1-b8-p7"></a>
### H8 — Deploy-time environment variables · B1, B8, P7 · **deploy-time**

Nothing to do now — there is no deployed environment. This is the checklist to
execute when you choose to launch, on whatever host you pick.

**The local file is already correct.** `.env.local` currently holds
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`, which is right for development: it
keeps canonical URLs, the sitemap and Open Graph tags pointing at the local server
instead of at a production origin that does not serve this build yet. **The
production origin belongs in the host's environment variables, not in
`.env.local`.** Setting it locally is the mistake this note exists to prevent.

At deploy time, set these on the host:

| Name | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | your production origin | e.g. `https://www.example.com`. **This is the one that must not be set locally.** |
| `SUPABASE_URL` | project URL | Preview/staging should point at a **separate** Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key | **A different key per environment.** Never the same value in preview and production |
| `ADMIN_PASSWORD` | ≥ 16 characters | Minimum rises to 16 in Batch 3. Different per environment |
| `ADMIN_SESSION_SECRET` | 64 hex characters | Different per environment |
| `HEALTH_TOKEN` | random string | Introduced in Batch 2; also needed by [H6](#h6--point-an-uptime-monitor-at-apihealth-p3) |
| `SENTRY_DSN` | from [H7](#h7--create-an-error-tracking-project-and-supply-the-dsn-b2) | Optional |
| `RESEND_API_KEY` / `RESEND_FROM` | from [H15](#h15--verify-a-resend-sender-domain) | Optional |

**Why per-environment separation matters:** a preview or staging URL is
world-reachable and runs unreviewed branch code. If it shares the production
service-role key, every branch anyone pushes gets full read/write access to live
customer PII, bypassing RLS.

To generate secrets, run locally and copy from the terminal — never from a chat
message, an issue, or a commit:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

For a separate preview database, repeat [H3](#h3--apply-the-database-migrations--not-yet-done)
against a second Supabase project.

Verify after deploying: `https://<your-domain>/api/health` returns 200 with
`database.configured: true`.

---

<a id="h9--source-real-product-imagery-f1"></a>
### ~~H9 — Source real product imagery~~ · F1 · **RESOLVED 2026-07-27 — by not sourcing any**

**Closed by [#25](https://github.com/elkamohammad1988/marsa-web/pull/25).** This
action assumed the fix was procurement: commission or buy nine assets, drop them
in `public/images/`, and I would correct the alt text around them. That framing
was wrong in three ways, and the maintainer's decision to replace `cards-stack`
too — *"I cannot vouch for its provenance"* — is what made the third one
obvious.

1. **It would have fixed the symptom.** The duplication was not the defect. The
   defect was that a picture and the sentence describing it were maintained in
   different files with nothing tying them together, which is how
   `card-phone.png` came to be rendered as *"Marsa Mastercard and mobile app"*
   while being the cover photograph of blog post 6. New files, same structure,
   same failure available.
2. **The trademark.** The card shot carried a Mastercard mark on a product with
   no issuer, no BIN and no scheme agreement — the same class of problem as the
   licence claims being removed in the same programme.
3. **Provenance is unanswerable for anything sourced.** A licence receipt for a
   stock photo is a receipt, not a guarantee, and this repository is public.

The illustrations are now drawn in markup from design tokens, in the idiom of
`components/sections/AccountPreview.tsx`. Nothing is sourced, so nothing has to
be vouched for; each drawing carries its own description, so alt text cannot
drift; the card is scheme-neutral and says `CONCEPT` where a network mark would
sit. 2.05 MB of PNG left the repository, along with the five `hero-blog-*` files
nothing referenced (**F9**).

**What is left of this action** is the one part that genuinely needs a human:
looking at it. See [H20](#h20--look-at-the-new-artwork).

<details>
<summary>The original procurement brief, kept for the record</summary>

**What was needed — nine distinct assets:**

| Slot | Currently | Needs to be |
|---|---|---|
| `coin-blue.png` | same bytes as `blog-1.png` — used **13×** across the site | Brand/product visual |
| `coin-gold.png` | same bytes as `blog-2.png` — used **9×** | Brand/product visual |
| `card-phone.png` | a blog photograph, captioned as the card + app | Real card + app render |
| `phone-apps.png` | same bytes as `blog-3.png` | Real app screenshot |
| `phone-home.png` | same bytes as `blog-5.png` | Real app screenshot |
| `cards-stack.png` | the only unique file — verify it is actually yours | Card render |
| Blog covers ×3 | `blog-2.png` and `blog-4.png` are identical | Three distinct covers |

**Steps:**

1. Decide the route: commission a designer, buy stock, or export real renders
   from the product design file.
2. If stock: use a source with a licence that permits commercial use by a
   financial services company — Unsplash and Pexels are free and permissive;
   Shutterstock and Adobe Stock if you need indemnification. **Keep the licence
   receipt.** A fintech site using an unlicensed image is a needless legal problem.
3. Export each at **2× the largest rendered size**, PNG or WebP, under 200 KB each.
4. Drop them in `public/images/` using the exact filenames in the table above.
5. Tell me they are in place. I will verify all hashes are unique, rewrite every
   `alt` to describe what is actually rendered, and delete the unused
   `hero-blog-*` files (F9).
6. **Judgement only you can make:** open each page after my PR and confirm the
   images actually look right in context. I cannot assess that.

</details>

---

<a id="h19--approve-the-regulatory-disclosure-wording"></a>
### H19 — Approve the regulatory disclosure wording · **DONE (2026-08-24)**

> **Resolved.** All four parts shipped. `regulatoryDisclosure()` states the
> concept framing and puts the licensed-partner arrangement in the conditional;
> `regulatorySummary()` is deleted; the operating sentences are gone from the
> footer and from `/legal/terms`; and `legalName` no longer exists in
> `lib/site.ts` or in the emitted JSON-LD. The description below is kept as the
> record of what was wrong and why it was decided together.

`lib/legal.ts` holds the one string on this site that is a legal statement
rather than copy, and it is rendered in the footer of **every page**, on
`/company/compliance`, and inside `/legal/terms`. It has not been touched in the
honesty programme because the maintainer's approval for that file was explicitly
scoped to this single string and no further.

**What it currently says when no regulator is configured — which is always:**

> Marsa Money Ltd. is not a bank. Accounts, IBANs, payments and currency
> exchange **are provided** by licensed partner institutions, and customer funds
> **are held** in safeguarded accounts at those partners, kept separate from
> Marsa's own funds. Marsa **provides** the platform, onboarding and support
> layer on top of that regulated infrastructure.

Every verb is present tense and every clause describes an arrangement that does
not exist. There are no partner institutions, no customer funds and no platform
layer in operation. Written before the concept framing, this was a reasonable
"we are not a bank" disclaimer; under the new framing it is the last substantial
false claim on the site.

**Three things travel with it, and are listed here rather than fixed quietly
because they only make sense decided together:**

1. `regulatorySummary()` in the same file returns *"Funds safeguarded at
   licensed partner institutions"* — same problem. It also has **no callers**,
   so the options are rewrite or delete.
2. `Footer.tsx` and `/legal/terms` each append a sentence to the disclosure —
   *"Marsa provides multi-currency accounts, SEPA & SWIFT transfers, and FX
   services to individuals and businesses across the EU and beyond"* — which
   asserts operation immediately after a paragraph denying it.
3. `siteConfig.legalName` is `"Marsa Money Ltd."`. The `Ltd.` suffix asserts an
   incorporated entity, and it is emitted in `Organization.legalName`.

The proposed replacement wording is in the working notes for this batch and
awaits a yes, a no, or an edit.

---

<a id="h20--look-at-the-new-artwork"></a>
### H20 — Look at the new artwork · **DONE (2026-08-24)**

> **Resolved.** Viewed on the deployed site at 320px, 390px and 1440px, and in
> the seven captured portfolio images. Nothing clipped, nothing overflowing, no
> horizontal scroll at any width.

The illustrations shipped in
[#25](https://github.com/elkamohammad1988/marsa-web/pull/25) are verified
structurally — they build, they carry accurate labels, they fit their slots by
construction, and the generated HTML contains zero `/images/` references. **They
have not been seen rendered.** Browser tooling was unavailable in the session
that wrote them.

This is the one part of F1 that was always going to need a person, and it is the
same judgement the original H9 asked for.

```
npm run dev
```

Then look at `/personal/multi-currency-iban` (the card-and-phone showcase),
`/business/eu-business-account` (the hero slot, where the sizing is tightest),
and `/blog` (six distinct covers, plus the featured slot where the title sits on
the art). Check in particular that:

- nothing is clipped in the 4:3 hero and showcase slots
- the type inside the phone screens scales sensibly at small sizes
- the featured blog cover has enough contrast behind its overlaid title

Two items here named surfaces that no longer exist and have been rewritten
rather than ticked off. The coin — the mark drawn as a glowing disc inside a
blurred orb — was removed in the 2026-08-26 design pass along with its ripple
rings, so "the ripple rings are not cropped" has nothing left to check. And
`/pricing` no longer carries plan illustrations at all: the card that held one
in a second column was rebuilt as a three-across comparison, because a drawing
that was the same for "Free" and "€14.99 / month" was the reason three plans
could not sit side by side.

Anything that looks wrong is a fix, not a re-decision — say what looks off and I
will adjust it.

---

<a id="h10--decide-the-cookie-banners-fate-f7"></a>
### H10 — Decide the cookie banner's fate · F7

The site sets exactly one cookie — `marsa_admin` — which is strictly necessary
and only ever issued to an authenticated operator. There are no analytics
cookies, no third-party scripts, no tag manager. Yet every first visit renders a
full-width overlay claiming *"We use cookies to run this site and, with your
consent, to improve it"*, the decision is stored in localStorage rather than a
cookie, and "Reject non-essential" currently does nothing.

**Pick one:**

- **A — Remove the banner.** Honest, faster first paint, no overlay. The one
  cookie in play is exempt from consent requirements. State the position plainly
  on `/legal/cookies`. *This is my recommendation.*
- **B — Keep it, wired and reworded.** Batch 4 (S7) already makes "reject"
  actually suppress the demo telemetry. The copy still needs rewriting to
  describe localStorage and anonymous funnel events accurately rather than
  claiming cookie-based tracking that does not happen.

Reply with **A** or **B**. If B, also supply the replacement copy — product and
legal wording is yours, not mine. If you want a lawyer to confirm the exemption
before choosing A, that is the reasonable route.

---

<a id="h11--enable-branch-protection-on-main"></a>
<a id="h21--switch-customer-accounts-on"></a>
### H21 — Switch customer accounts on · **blocks the whole `/account` area**

The authentication milestone is built, tested and merged. It is also, by
design, **completely inert** until you do the four things below — none of which
can be done from code, and all of which touch a Supabase project you would
first have to create. There is none connected today.

Until then every auth page renders a panel naming exactly what is missing, the
account area stays closed, and nothing at all is stored. That is a supported
state, not a broken one.

**1. Apply migration 004.** Covered by [H3](#h3--apply-the-database-migrations--not-yet-done)
— it is the fourth file in that list. Nothing below works without it.

**2. Add three environment variables** to `.env.local` (and to the host at
deploy time — see [H8](#h8--deploy-time-environment-variables-b1-b8-p7)):

```sh
SUPABASE_ANON_KEY=<Project Settings → API → anon / public key>
AUTH_SESSION_SECRET=<openssl rand -hex 32>
# SUPABASE_URL is already set.
```

The **anon** key, not the service-role one you already have. That is the
security model rather than a detail: the anon key carries no privilege, the
signed-in user's own token supplies the identity, and Row Level Security is
what decides whose profile row they can read. `lib/auth-config.ts` never reads
the service-role key at all.

`AUTH_SESSION_SECRET` signs the session cookie. It is the one value that would
let anybody forge a session for any account, so it must never appear in a
tracked file and must never carry a `NEXT_PUBLIC_` prefix — `lib/env.ts`
refuses to start if it does. Rotating it signs everybody out, which is also how
you would respond if it leaked.

**3. Allow the redirect destination.** *Authentication → URL Configuration →
Redirect URLs*, add both:

```
http://localhost:3000/auth/confirm
https://<your production origin>/auth/confirm
```

Without these Supabase refuses the destination the app sends and every link in
its emails lands on the site root.

**4. Rewrite two email templates.** *Authentication → Email Templates*. In
**Confirm signup**, replace the `{{ .ConfirmationURL }}` link with:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
```

and in **Reset password**:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
```

This is the one step with a real architectural reason behind it rather than a
configuration one. `{{ .ConfirmationURL }}` sends the reader to GoTrue's own
`/verify`, which bounces them back with the tokens in the URL **fragment** —
and a fragment is never sent to a server. Completing the flow would then need
client JavaScript to read `location.hash` and post the credential back, putting
it in the page, in browser history, and in any `Referer` that page later sends.
`{{ .TokenHash }}` moves the whole exchange to the server.

**Verify.** Register at `/register`, follow the link, land on `/account` signed
in. Then check the policies are what they should be — every row must show
`{authenticated}`, never `{anon}` or `{public}`:

```sql
select policyname, roles, cmd from pg_policies
where schemaname = 'public' and tablename = 'profiles' order by policyname;
```

**To make yourself an administrator** (there is deliberately no UI for this —
`authenticated` holds no update privilege on the column):

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Then `/account/admin` appears in the account navigation. Sign out and in again,
or wait up to an hour: the role is re-read on every token renewal.

The full version of all of this, with the reasoning, is in
[`AUTHENTICATION.md`](AUTHENTICATION.md).

---

### H11 — Enable branch protection on `main`

Do this after the first PR merges green, so you know the required check name is
correct.

1. GitHub → the `marsa-web` repo → **Settings** (top nav).
2. Left sidebar → **Rules** → **Rulesets** → **New ruleset** → **New branch ruleset**.
3. Name it `protect-main`. Set **Enforcement status** to **Active**.
4. Under **Target branches** → **Add target** → **Include default branch**.
5. Tick **Require a pull request before merging**.
   - Set **Required approvals** to **0** if you are the only reviewer — the point
     is the PR and the checks, and 1 would block you permanently.
6. Tick **Require status checks to pass**.
   - Click **Add checks**, search `Verify`, select it (that is the job name in
     `ci.yml`).
   - Tick **Require branches to be up to date before merging**.
7. Tick **Block force pushes**.
8. Click **Create**.

Verify: `git push --force origin main` from a scratch clone is rejected.

---

<a id="h12--decide-data-retention-periods-b10"></a>
### H12 — Decide data retention periods · B10

`submissions` accumulates names, emails, countries, company names, user-agents
and referrers indefinitely. Under a published privacy policy covering EU
residents, "forever" is not a defensible answer, and there is currently no
implementation path for an erasure request beyond hand-written SQL.

Tell me a number for each:

| Data | Question | Common answer |
|---|---|---|
| Unconverted leads | Purge after how long? | 24 months |
| Converted leads | Keep how long after conversion? | Per your customer-records obligation |
| Contact form messages | Purge after how long? | 12 months |
| Newsletter subscribers | Keep until unsubscribe? | Yes, typically |
| `demo_events` | Purge after how long? | 90 days |

I will implement whatever you choose as a configurable scheduled purge. The
numbers are a legal call and are yours; if you have counsel, this is a five-minute
question for them.

---

<a id="h13--deploy-time-connect-the-host-to-the-repository"></a>
### H13 — Connect the host to the repository · **deploy-time**

Nothing to do now. Recorded because the audit found the project had previously
been deployed via local CLI push, with no link between a deployment and a commit —
meaning no way to tell what was actually running. When you do choose a host, make
deployments come from commits rather than from a local directory:

1. In the host's dashboard, connect the GitHub repository rather than uploading
   or CLI-pushing a build.
2. Set the production branch to `main`.
3. Enable preview deployments for pull requests. This gives a live URL on every
   PR, which makes reviewing the frontend batches (6, 14, 15, 16) far easier than
   reading a diff.
4. Confirm the deployment list shows a commit SHA against each entry.

A stale gitignored `.vercel/` directory exists on disk pointing at an abandoned
project. It is not tracked and affects nothing; delete it whenever convenient.

---

<a id="h14--decide-whether-demostats-should-exist"></a>
### H14 — Decide whether `/demo/stats` should exist · S4

The page exposes funnel telemetry — conversion rates and drop-off — behind a
query-string token with no rate limit, so an attacker gets unlimited guesses. The
token also lands in host access logs, CDN logs, browser history and the `Referer`
header of any outbound link on the page.

**Pick one:**

- **A — Keep the share link.** Batch 2 adds rate limiting and exchanges the token
  for an httpOnly cookie on first use, so it appears in one log line instead of
  every one.
- **B — Delete it.** `/admin/funnel` already shows the same data behind real
  authentication. If nobody outside the team needs the link, deleting it removes
  the whole class of problem. *Recommended unless you are actively sharing it.*

Reply **A** or **B** before Batch 2. If A, also confirm whether `DEMO_STATS_TOKEN`
is currently set anywhere, and rotate it as part of [H8](#h8--deploy-time-environment-variables-b1-b8-p7).

---

<a id="h15--verify-a-resend-sender-domain"></a>
### H15 — Verify a Resend sender domain

Submission notification emails are wired but inert until both `RESEND_API_KEY`
and `RESEND_FROM` are set with a verified sender. Until then, every submission is
stored and nobody is told about it.

1. Sign up at **resend.com**.
2. Left sidebar → **Domains** → **Add Domain**.
3. Enter your sending domain (e.g. the apex domain you send from).
4. Resend shows DNS records — typically one MX, one TXT for SPF, and two or three
   CNAMEs for DKIM.
5. Add each record at your DNS provider exactly as shown. Leave TTL at default.
6. Back in Resend, click **Verify**. Propagation is usually minutes, occasionally
   up to 24 hours.
7. Once verified: left sidebar → **API Keys** → **Create API Key**, permission
   **Sending access**, copy the value.
8. Add `RESEND_API_KEY` and `RESEND_FROM` (format: `Marsa <noreply@yourdomain>`)
   on the host per [H8](#h8--deploy-time-environment-variables-b1-b8-p7).
   The sender address must be on the verified domain or delivery fails silently.

Verify: submit the contact form on production and confirm the email arrives.

---

<a id="h17--approve-the-admin-authentication-batch-s1-s5-s9"></a>
### H17 — Approve the admin authentication batch · S1, S5, S9 · **blocks Batch 3**

Your standing instruction is to stop and ask before anything touching
authentication, admin access or session handling. Batch 3 is entirely that, so
it is planned but not started. It is the largest remaining security item —
**S1 is a High** — and one guessed password exposes the name, email, country
and company of every person who ever used a form.

Here is exactly what I would change, so you can approve or amend it:

1. **Move admin login from the in-memory limiter to `rateLimitShared`**, at
   5 attempts per 15 minutes. Today it uses `rateLimit`, whose buckets live in
   a module-level `Map`, so each serverless instance enforces its own window and
   concurrency is attacker-controlled — the effective ceiling is 5/min × the
   number of instances, not 5/min. The existing comment defends in-memory on the
   grounds it "must keep working even when the database is the thing that is
   broken"; `rateLimitShared` already preserves that, degrading to the in-memory
   result on RPC failure. Batch 1 added a test pinning exactly that degradation.
2. **Add a persisted failure counter with exponential backoff**, keyed on IP
   *and* a global counter, so attempts spread across many IPs still trip a
   ceiling.
3. **Raise the minimum `ADMIN_PASSWORD` length from 8 to 16.** Note the
   consequence: an existing shorter password stops working and the admin area
   closes until it is changed. The value in your `.env.local` is 32 characters
   and already complies.
4. **Add `middleware.ts`** with `matcher: ['/admin/:path*', '/api/admin/:path*']`
   verifying the session cookie signature. Today every protected route calls
   `isAdminRequest()` itself. All four current call sites are correct, so this
   is not a live vulnerability — but the pattern is deny-by-omission, and a new
   `app/admin/anything/page.tsx` that forgets the call would be silently
   world-readable with no error and no log line. In-route checks stay as
   defence in depth.
5. **Reject cross-site `POST /api/admin/logout`** via `Sec-Fetch-Site` or an
   `Origin` check. Nuisance-level only: `SameSite=Lax` stops the session cookie
   being *sent*, but the response's `Set-Cookie` clearing it is still honoured,
   so a malicious page can force an admin logout.

**Reply "go" to approve all five**, or name the ones you want. I will not touch
this code otherwise.

Two related items are held for the same reason, both session handling:

- **S4's cookie exchange** — swapping `/demo/stats?token=…` for an httpOnly
  cookie on first use, so the token appears in one log line rather than every
  one. Interacts with [H14](#h14--decide-whether-demostats-should-exist).
- **P7's revocation** — a `token_version` claim compared against an env var, so
  a single admin session can be killed without rotating `ADMIN_SESSION_SECRET`
  and invalidating every session at once.

---

<a id="h18--approve-corrected-cookie-policy-copy-f7"></a>
### H18 — Approve corrected `/legal/cookies` copy · F7 · **compliance copy, so yours to decide**

The banner is removed. `app/legal/cookies/page.tsx` is **regulatory copy**, which
is on the standing stop-and-ask list, so I have not touched a word of it — but
you should know what it currently says, because most of it was already untrue
before this change.

The site sets **exactly one cookie**, verified by grepping every write in the
codebase: `marsa_admin`, in `app/api/admin/login/route.ts` and
`.../logout/route.ts`. It is strictly necessary and is only ever issued to an
authenticated operator.

Against that, the page currently claims:

| Claim on the page | Reality |
|---|---|
| "Preferences — remember settings such as your selected currency or language" | No such cookie exists |
| "Analytics — help us understand aggregate usage… Set only with your consent" | No analytics cookie exists |
| "Marketing — measure the effectiveness of campaigns" | No marketing cookie exists |
| "the *Cookie settings* link in the footer" | **No such link exists** — this was already false before today |
| "our cookie banner lets you accept or reject non-essential cookies" | True until this change; false now |
| "We only set non-essential cookies after you have given consent" | Vacuously true — there are none |

Four of those six were wrong before I touched anything. That is worth knowing
independently of the banner decision.

**Suggested replacement** for the "Categories of cookies we use" and "Managing
your preferences" sections — offered as a starting point for you or your
counsel, not as approved wording:

> **Cookies we use**
> Marsa sets a single cookie, `marsa_admin`. It is strictly necessary: it keeps
> an authenticated administrator signed in to the internal dashboard, and it is
> never issued to ordinary visitors. We set no preference, analytics or
> marketing cookies, and we use no third-party trackers or tag managers.
>
> **Managing your preferences**
> Because the only cookie we set is strictly necessary, there is nothing to
> consent to and no preference banner to configure. You can block or clear
> cookies through your browser settings at any time; doing so will only affect
> administrator sign-in.
>
> **Analytics**
> The interactive demo records anonymous, cookieless usage events using a random
> identifier that lasts for a single visit and is never linked to you. We honour
> the browser's Do Not Track signal.

**What to do:** either paste an approved version into
`app/legal/cookies/page.tsx` yourself, or reply with the wording you want and I
will apply it verbatim.

**One dependency:** `lib/consent.ts` and the consent check in `DemoFlow` are
still in place. With the banner gone nothing writes that value, so they are
currently inert. I have deliberately left them rather than deleting a mechanism
while the document that promises visitors a control is still under review. Tell
me which way the copy lands and I will either wire a preferences control to them
or remove them.

---

<a id="h16--review-and-merge-each-pr"></a>
### ~~H16 — Review and merge each PR~~ · **SUPERSEDED 2026-07-27 — autonomy mode**

This action described the original working method: I open a PR, you read it, you
click merge. The maintainer has since moved the programme to **autonomous
batches** — I self-merge once CI is green, and stop only for a fixed set of
things.

**The four categories that still stop me:**

1. **Copy with legal weight** — anything in `lib/legal.ts`, regulatory or
   compliance claims, the cookie policy. Proposed wording goes to you first;
   see [H18](#h18--approve-corrected-cookie-policy-copy-f7) and
   [H19](#h19--approve-the-regulatory-disclosure-wording).
2. **Anything irreversible** — a force-push over someone else's work, a
   destructive migration, deleting something git cannot return, anything that
   leaves this repository.
3. **CI red twice** on the same batch. Once is a fix; twice means I have
   misunderstood something and should say so rather than keep pushing.
4. **A decision that is yours by right** — what the product claims, whose name
   goes on it, what a page is *for*. When a batch turns one of these up I build
   the option and leave the PR open rather than merging it. [#27](https://github.com/elkamohammad1988/marsa-web/pull/27)
   is the current example.

**What has not changed:** every PR still carries its full reasoning, still names
the files worth your attention, and is still there to be reverted. Autonomy
changed who clicks the button, not what is written down.

**Still worth your eyes, when you have them:** frontend batches. There is no
preview deployment until a host is connected
([H13](#h13--deploy-time-connect-the-host-to-the-repository)), so `npm run dev`
is the only way anyone sees the rendered result — and in this batch, nobody has
([H20](#h20--look-at-the-new-artwork)).

---

## Standing constraints

- Never commit directly to `main`.
- Never print, log or write a secret value — not in code, commits, PR
  descriptions, test fixtures, this file, or chat.
- Every behaviour change ships with tests asserting user-visible outcomes.
- `npm run verify` locally before every PR; real output reported, never a claimed
  pass that was not run.
- Security fixes and design fixes never share a PR.
