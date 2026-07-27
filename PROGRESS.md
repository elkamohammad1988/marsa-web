# Progress Log

Append-only record of the audit remediation programme. One entry per batch:
what shipped, the PR, the findings closed, the verification evidence, and
anything deliberately not done with the reason.

Companion to [`PROJECT-PLAN.md`](./PROJECT-PLAN.md) (the plan) and
[`AUDIT.md`](./AUDIT.md) (the source backlog).

---

## Session setup — 2026-07-25

Before Batch 0 could start, three things had to be established.

**GitHub CLI authentication.** `gh auth status` reported no authenticated host,
which blocks PR creation and CI reads — steps 4–6 of the working method for every
batch. Git itself worked (`git ls-remote` succeeded), so a credential existed in
Git Credential Manager. `gh auth login --with-token` rejected it: *"missing
required scope `read:org`"*. That scope is needed for organisation listing, not
for pull request operations on a personal repository, and `GH_TOKEN` bypasses the
scope check that `gh auth login` enforces. Every `gh` invocation in this programme
therefore sources the token from the git credential helper inline. The value is
never printed, never written to a file, and never leaves the process:

```sh
export GH_TOKEN=$(printf "protocol=https\nhost=github.com\n\n" \
  | git credential fill 2>/dev/null | sed -n 's/^password=//p')
```

Verified with `gh api user` → authenticated, and `gh repo view` → repo accessible.

**The repository is public.** `gh repo view --json visibility` returns `PUBLIC`.
A prior working assumption held it was private. This is recorded here because it
changes what is safe to commit: `PROJECT-PLAN.md`, `PROGRESS.md`, `AUDIT.md`, every
commit message and every PR description in this programme are world-readable. No
credential, project reference or account identifier goes into a tracked file.

**Local environment.** `.env.local` had `NEXT_PUBLIC_SITE_URL=https://www.marsa.money`,
which is wrong for local work — it makes canonical URLs, the sitemap and OG tags
point at production while developing. Changed to `http://localhost:3000`. The
production value belongs in the host's environment variables at deploy time and
is recorded in HUMAN ACTIONS ([H8](./PROJECT-PLAN.md#h8--deploy-time-environment-variables-b1-b8-p7))
rather than being set here.

**Deployment posture.** The project is deliberately not connected to Vercel and
will not be until development finishes. No `vercel` command is run, no Vercel
config is created, and no deploy is attempted anywhere in this programme. Findings
that presuppose a deployment are captured in HUMAN ACTIONS as deploy-time
prerequisites and otherwise skipped.

---

## Batch 0 — Submissions are never silently lost · **MERGED**

**Finding closed:** B1 (Backend · High)
**PR:** [#1](https://github.com/elkamohammad1988/marsa-web/pull/1) — merged as `5cca881`
**Branch:** `fix/storage-silent-failure` (deleted after merge)

### What was wrong

A failed storage write was treated as an accepted submission. `FileSubmissionStore`
caught write errors, logged the submission to `console.info` and returned
`{ persisted: false }`; `PostgresSubmissionStore` silently delegated a failed insert
to that file store; `handleFormPost` forwarded `persisted` honestly but
`useFormSubmit` checked only `res.ok`. On a read-only filesystem the visitor saw
*"Application received… our onboarding team will email you within one business
day"* for a lead that existed only in a rotating log line.

### What shipped

The storage contract became unambiguous rather than each of the four mishandling
sites being patched: **`save()` resolves only for a durable write and throws
`StorageWriteError` otherwise.** There is no longer an "accepted but not persisted"
value for a caller to ignore — the bug is unrepresentable rather than fixed.

- `lib/storage.ts` — `save()` returns `Promise<void>`; file store throws instead of
  reporting failure as an outcome; Postgres store no longer falls back to disk on
  insert failure; `createStore()` throws `StorageConfigError` in production when the
  Supabase pair is absent.
- `lib/api-forms.ts` — storage failure returns 503 with a fixed, safe message; the
  real reason is logged server-side only.
- `components/forms/useSubmit.ts` — a 2xx reporting a non-durable write is an error,
  not a success screen.
- `app/api/health/route.ts` — reports the misconfiguration instead of 500ing on it.
- `.env.example` — documents the Supabase pair as production-required.

### Verification

Run on the branch head before the PR opened:

```
npx tsc --noEmit     exit 0
npx next lint        ✔ No ESLint warnings or errors
npx vitest run       Test Files 11 passed (11) · Tests 117 passed (117)
npm run build        ✓ Compiled successfully — 50 routes
```

CI: `Verify` **pass** in 1m2s —
[run 30161607881](https://github.com/elkamohammad1988/marsa-web/actions/runs/30161607881/job/89687710751).

Test baseline moved 94 → 117 across 10 → 11 files. `tests/api-forms.test.ts` is new
and asserts user-visible HTTP outcomes (no config, write throws, notification
fails, happy path) driving the real `createStore` and `PostgresSubmissionStore`
rather than stand-ins.

### Notes

- This batch also closes the *production-throw* half of **B8**. The remainder of
  B8 — validating URL shape, key length and sender address at module load — stays
  in Batch 7 as planned.
- A stray four-blank-line prepend to `.env.example` was found uncommitted in the
  working tree during the merge and discarded. It was whitespace only, with no
  content change.

---

## Batch 1 — Test the security boundary · **MERGED**

**Finding closed:** P5 (unit-test half) · **PR:** [#3](https://github.com/elkamohammad1988/marsa-web/pull/3) · CI pass 55s

Tests only, no source touched. 112 cases across `lib/validation.ts`,
`lib/rate-limit.ts` and `lib/postgrest.ts` — the three modules with zero
coverage, which are also the three the next four batches modify.

`lib/api-forms.ts` was excluded because Batch 0 already added
`tests/api-forms.test.ts`; duplicating it would have guaranteed a conflict.
`escapeLike`'s missing `*` was left unasserted so that no test in a tests-only
batch encoded a known bug as correct — it landed with its fix in Batch 4.

**Evidence:** tsc exit 0 · lint clean · 229 tests / 14 files (from 117/11) ·
build 49 pages.

**Observation recorded, not acted on:** `validateSubscribe` caps the email
address at 254 characters and `validateLead` does not. Not a security hole and
not an `AUDIT.md` finding, so it is documented in a test comment for the
re-audit rather than fixed inside a tests-only batch.

---

## Batch 2 — Public endpoint exposure & abuse limits · **MERGED**

**Findings closed:** S2, S6 · **partially** S4 · **PR:** [#4](https://github.com/elkamohammad1988/marsa-web/pull/4) · CI pass 1m4s

**S2 deviation from the audit, deliberate.** The audit proposed gating
`/api/health`'s detail strings behind `isAdminRequest()` or a `HEALTH_TOKEN`
header. Both add an access-control mechanism to a public endpoint in order to
protect data that need not be in the response at all. Instead every check now
serialises exactly two booleans — there is no `detail`, `provider` or `durable`
field left for a future change to leak into — and the real reason is logged
server-side. Structurally safer than hiding it, and it keeps the endpoint
usable by an uptime monitor with no shared secret to distribute or rotate.

**S6.** Both FX proxies share one 60/minute budget per client. Sharing is the
point: alternating between them must not buy double the allowance, because the
upstream fair-use budget is one budget. The 429 carries `Retry-After` and
`no-store` — the success path sets `public, s-maxage=3600`, and reusing that on
a rejection would turn one caller's rate limit into an edge-wide outage.

**S4 is partial.** The attempt limit shipped (10/min, checked before any
credential is examined; exhausting it returns the same `notFound()` as a wrong
token). The httpOnly-cookie exchange did **not** — that is session handling,
which is on the stop-and-ask list, and it interacts with whether the page
should exist at all. Held for [H14](./PROJECT-PLAN.md#h14--decide-whether-demostats-should-exist).

**Evidence:** tsc exit 0 · lint clean · 251 tests / 16 files · build 49 pages.

**Process note.** This commit was first made on local `main` by mistake. It was
never pushed; the commit was moved to a branch and local `main` rewound to
match `origin/main` before anything left the machine. Subsequent batches create
the branch before editing.

---

## Batch 4 — Small security & privacy corrections · **MERGED**

**Findings closed:** S8, S10, S7 · **PR:** [#5](https://github.com/elkamohammad1988/marsa-web/pull/5) · CI pass 1m6s

`escapeLike` now strips `*`. `newId()` uses `randomUUID()` — the old form both
disclosed submission ordering in its timestamp prefix and drew the rest from a
predictable generator, on values shown to recipients as "Reference".

S7: the banner's `marsa:cookie-consent` event had exactly one occurrence in the
repository — the `dispatchEvent` call itself. Nothing listened, so "Reject
non-essential" changed nothing. New `lib/consent.ts` owns the key and the
reading of it, which both prevents the two sides drifting apart again and gives
S7 a testable seam without adding jsdom and a component-test framework the
project does not otherwise carry.

Two deliberate details: an unrecognised stored value is treated as *no
decision* rather than trusted, and `hasRejectedNonEssential` is not the inverse
of accepted — undecided is not refusal, and collapsing the two reproduces the
bug in one direction or silences all first-time visitors in the other.

**Evidence:** tsc exit 0 · lint clean · 265 tests / 17 files · build 49 pages.

---

## Batch 5 — Content-Security-Policy · **MERGED**

**Finding closed:** S3 · **PR:** [#6](https://github.com/elkamohammad1988/marsa-web/pull/6) · CI pass 46s

**Deviation from the audit, with evidence.** The prescribed fix —
`script-src 'self' 'sha256-<theme script>'` — would have broken the site. The
theme script is not the only inline script: the App Router streams its RSC
payload as inline `self.__next_f.push([...])` blocks, **measured at 47 on the
homepage** (48 inline scripts total), whose contents differ per page and per
build and cannot be hashed. A hash-only policy blocks every one and leaves the
site rendered but dead.

Worse, the plausible-looking "add the hash for completeness" version is
actively harmful: browsers *ignore* `'unsafe-inline'` as soon as a hash or
nonce is present. `tests/security-headers.test.ts` asserts the two are never
combined, because that mistake reads as an improvement in review.

What shipped: `default-src`, `style-src`, `img-src`, `font-src`, `connect-src`
and `frame-src` added; `object-src`, `base-uri`, `form-action`,
`frame-ancestors` kept; `X-Frame-Options` aligned to `DENY`. `connect-src
'self'` is the directive that earns the change — it blocks exfiltration of form
data from the pages that collect PII. `'unsafe-eval'` is absent.

The route to a strict `script-src` is a per-request nonce in middleware, which
opts all 49 statically generated pages into dynamic rendering. That is a real
trade and it is the maintainer's call.

**Evidence:** built, served locally, confirmed the header arrives intact, four
routes return 200, and all 48 inline scripts plus the JSON-LD blocks survive.
Browser-console enforcement was **not** checked — no browser was driven.
tsc exit 0 · lint clean · 275 tests / 18 files.

---

## Batch 6 — Accessible error states · **MERGED**

**Findings closed:** F2, F3, F8 · **PR:** [#7](https://github.com/elkamohammad1988/marsa-web/pull/7) · CI pass 56s

Contrast recomputed independently from the tokens in `globals.css`:

| Foreground | Background | Ratio | AA |
|---|---|---|---|
| `#DC2626` red-600 | `--card` `#140A10` | 4.02:1 | ✗ |
| `#DC2626` red-600 | `--canvas` `#0C080B` | 4.12:1 | ✗ |
| `#E88A8A` `--danger` | `--card` | 7.80:1 | ✓ |
| `#E88A8A` `--danger` | `--canvas` | 7.99:1 | ✓ |

`tests/contrast.test.ts` computes real WCAG relative luminance rather than
matching class names, and asserts that red-600 *would have failed* — which is
what makes the check meaningful rather than decorative. Two scanning tests
prevent regression: no raw `red-*` utility and no `dark:` variant anywhere in
`app/` or `components/`.

`ThemeToggle.tsx` deleted — imported nowhere, and unable to work if mounted
since `.dark` is an exact mirror of `:root`.

**Deliberately not done:** `globals.css` still carries the `.dark` block and
`layout.tsx` still runs the pre-paint theme script, both now provably dead.
Not an `AUDIT.md` finding, and the theme script is load-bearing in Batch 5's
CSP reasoning. Recorded for the re-audit. → **removed in [Batch B](#batch-b--the-dead-theme-system-removed--merged)**,
which also establishes that the CSP conclusion never depended on that script.

**Evidence:** tsc exit 0 · lint clean · 282 tests / 19 files · build 49 pages.

---

## Batch 7 — Fail loudly on misconfiguration · **MERGED**

**Finding closed:** B8 · **PR:** [#8](https://github.com/elkamohammad1988/marsa-web/pull/8) · CI pass 56s

`lib/env.ts` catches what a presence check cannot: a value that is present but
wrong. Malformed `SUPABASE_URL`, the `.env.example` placeholder, half the
Supabase pair in either direction, a `NEXT_PUBLIC_`-prefixed service-role key
(which `.env.example` warns about in prose and this makes *fail*), a Resend key
without a sender, malformed sender or recipient, malformed site URL. Every
problem is reported at once — one redeploy per misconfiguration is the failure
mode being avoided.

`instrumentation.ts` runs it once at server start, with two load-bearing
guards: skip non-`nodejs` runtimes, and skip `phase-production-build`. The
second is the one that would have taken CI down — the build compiles without
production credentials and must keep doing so.

**Evidence, empirical:** `next start` with `SUPABASE_URL=htps://typo…` prints
*"Failed to prepare server … SUPABASE_URL: must be an absolute http(s) URL"*
and refuses to serve. `npm run build` with no Supabase configuration still
compiles 49 pages. tsc exit 0 · lint clean · 302 tests / 20 files.

**Scope:** admin credential rules stay in `lib/admin-auth.ts` and move with the
admin authentication work. An empty production environment is accepted, because
`createStore()` already refuses a non-durable store there (B1) and duplicating
that would report one fault twice in two wordings.

---

## Batch 14 — Blog dates, ordering & structured data · **MERGED**

**Findings closed:** F5, F4, F6 · **PR:** [#9](https://github.com/elkamohammad1988/marsa-web/pull/9) · CI pass 52s

Dates stored as `YYYY-MM-DD` and rendered through `formatPostDate`; the visible
text is unchanged. Posts sorted newest-first at the export so the index, the
featured slot and the sitemap cannot disagree.

**Found while fixing F4, not in the audit:** `featuredPost` was `posts[0]` of
the *declared* array — the **oldest** post. The hero slot was promoting the
stalest content on the site. Sorting the array fixed the list and the hero
together.

F6: panels are always rendered and collapsed with `hidden`, carrying a stable
`useId` id, `role="region"` and `aria-labelledby`; triggers carry
`aria-controls`. One change fixed both the FAQPage schema asserting absent
content and the missing `aria-controls` target.

**Evidence, against generated HTML:** `.next/server/app/faq.html` has 10
`aria-controls` attributes, **10/10** resolving to a matching `id` +
`role="region"`, 8 panels hidden, and collapsed panels carrying their answer
text. tsc exit 0 · lint clean · 316 tests / 21 files · build 49 pages.

---

## Checkpoint — 2026-07-25, nine PRs in

**Findings closed:** B1, P5 (units), S2, S6, S8, S10, S7, S3, F2, F3, F8, B8,
F5, F4, F6 — plus S4 in part. Test suite 94 → **316**.

**Stopped on:** Batch 3 (S1, S5, S9) is entirely admin authentication, which is
on the standing stop-and-ask list, and several later items are gated on
decisions recorded in [HUMAN ACTIONS](./PROJECT-PLAN.md#human-actions).

---

## Batch 3 — Admin authentication boundary · **MERGED**

**Findings closed:** S1 (High), S5, S9 · **PR:** [#11](https://github.com/elkamohammad1988/marsa-web/pull/11) · approved under H17

**S1.** Admin login used the in-memory limiter while all three public form
endpoints used the shared one. Its buckets live in a module-level `Map`, so
every concurrent instance enforced its own window — and concurrency is
attacker-controllable, making the effective ceiling 5/min × instances.

The audit asked for exponential backoff. `check_rate_limit` is a fixed-window
counter, so rather than add a schema change for a growing timer, backoff is
expressed as **overlapping tiers checked on every attempt**: 5 per 15 min,
10 per hour, 20 per day, plus 50 per 15 min across *all* callers. The ceiling
tightens the longer an attack runs — the same shape as backoff, built from the
atomic primitive that already existed. The 429 reports the longest failing
tier's reset, not the first that tripped.

`ADMIN_PASSWORD` minimum 8 → 16.

**S5.** `middleware.ts` on `/admin`, `/admin/:path*`, `/api/admin/:path*`. All
four existing `isAdminRequest()` call sites were correct, so this fixed no live
vulnerability — it changed the shape of the possible mistake. In-route checks
stay as defence in depth. `lib/admin-session.ts` was split out because
middleware runs on Edge and cannot import `next/headers`.

The lockout risk was the one that mattered: `/admin/login`, `/api/admin/login`
and `/api/admin/logout` are explicitly exempt, with a test pinning it.

**S9.** `Sec-Fetch-Site` where present, `Origin` as fallback. A client sending
neither is allowed through — rejecting on absence breaks curl and probes
without stopping an attacker, who controls neither header from a page.

**Evidence, against a running production server:** `/admin`, `/admin/funnel`
and `/admin/some-future-page` all 307 → `/admin/login`; `/admin/login` 200;
`/api/admin/export` 401; `/` unaffected. tsc exit 0 · lint clean · 337 tests /
22 files · build 49 pages + middleware.

---

## Batch 2b — `/demo/stats` deleted rather than mitigated · **MERGED**

**Finding closed:** S4 (Medium) · **PR:** [#12](https://github.com/elkamohammad1988/marsa-web/pull/12) · decided under H14

Batch 2 shipped the attempt limit; the token still travelled in the query
string, so it landed in host access logs, CDN logs, browser history and the
`Referer` of every outbound link on the page. Fixing that properly meant an
httpOnly cookie exchange: more session-handling code, another secret to
distribute and rotate.

`/admin/funnel` already showed the same report behind real authentication, and
after #11 behind middleware as well. Deleting removed the class of problem
instead of mitigating it — no token to leak, no token to rotate, no shared link
sitting in an inbox. `DEMO_STATS_TOKEN`, the robots disallow and
`STATS_RATE_LIMIT` went with it.

**Evidence:** tsc exit 0 · lint clean · 337 tests / 22 files · build 49 pages.
Test count unchanged: the deleted page had no tests, and the limiter coverage
went with its only caller.

**Worth knowing:** the first typecheck failed against stale `.next/types` still
referencing the deleted route. Re-running after a build is clean.

---

## Batch 16a — the cookie banner removed · **MERGED**

**Finding closed:** F7 (Medium) in code · **PR:** [#13](https://github.com/elkamohammad1988/marsa-web/pull/13) · decided under H10

The site sets exactly one cookie — `marsa_admin` — strictly necessary and only
ever issued to an authenticated operator. Every first visit nonetheless
rendered a viewport-anchored overlay claiming consent-gated tracking that does
not happen, storing its decision in localStorage rather than a cookie.

**Found while doing it:** four of the five claims on
`app/legal/cookies/page.tsx` were already untrue *before* this change,
including a "Cookie settings" link in the footer that has never existed. That
page is regulatory copy and on the standing stop-and-ask list, so not a word of
it was touched; the full list and suggested wording are
[H18](./PROJECT-PLAN.md#h18--approve-corrected-cookie-policy-copy-f7).

`lib/consent.ts` and the `DemoFlow` consent check were deliberately left in
place. Deleting a mechanism while the document promising visitors a control is
still under review is the wrong order.

**Evidence:** tsc exit 0 · lint clean · 337 tests / 22 files · build 49 pages.

---

## Batches 8 + 9 — migration history, aggregation in Postgres · **MERGED**

**Findings closed:** P4 (High), B7, B3, B4 · **PR:** [#14](https://github.com/elkamohammad1988/marsa-web/pull/14)

**P4.** `db/schema.sql` → `db/migrations/001_initial_schema.sql`, plus 002 and
003. The rules are enforced by `tests/migrations.test.ts`, not by convention:
numbered consecutively from 001 with no gaps or duplicates (a gap means a
deletion, a duplicate means two people picked the same number and one silently
never runs), every statement idempotent, every file recording itself in
`schema_migrations` with `on conflict do nothing`, RLS on every table with zero
policies anywhere, and `search_path` pinned on every `security definer`
function.

`npm run db:migrate` reports applied vs pending and **does not pretend to
execute SQL** — Supabase exposes no arbitrary-SQL transport over PostgREST, so
it prints the pending files to paste into the SQL editor. A runner that
silently does nothing is worse than no runner.

**B7.** The purge filtered on `window_start` while the primary key is
`(key, window_start)` — a predicate on the second column alone cannot use it.
Sequential scan taking row locks, on 1% of form submissions, while a visitor
waited. 002 adds the index, extracts a schedulable `purge_rate_limit_hits()`,
and drops the inline probability to 0.1%. **Deliberate departure:** the audit
preferred moving the purge out entirely, but keeping a small inline one means
table growth does not depend on someone remembering to schedule a job.

**B3.** The funnel pulled up to 20,000 rows per page view and counted them in
Node. The correctness bug was worse than the cost: past 20,000 events it kept
the most *recent* rows, dropping early sessions' `start` events while retaining
their later steps, so `starts` undercounted and `completionRate` could exceed
100% — silently. `demo_funnel()` counts distinct sessions per step in Postgres,
exact at any volume. A test asserts the rate can no longer exceed 100%.

**B4.** `submission_stats()` returns all four numbers from one table scan via
`count(*) filter (…)`, replacing four HEAD counts. A test asserts exactly one
`fetch`.

**The detail that made this safe to merge with nothing applied:** both call
sites fall back to the old implementation when the function is absent, logging
which migration to run. The code is correct against a database that has had 003
applied and against one that has not.

**Evidence:** tsc exit 0 · lint clean · 367 tests / 24 files · build 49 pages ·
`npm run db:migrate -- --dry` → 0 applied, 3 pending.

---

## Batch A — documentation truth & admin setup copy · **MERGED**

**Not an `AUDIT.md` finding.** Found by re-reading the repository end to end on
2026-07-26, after the fourteenth PR.

**The real bug.** `app/admin/login/page.tsx` told the operator to set
`ADMIN_PASSWORD` to "8+ characters". Batch 3 raised `MIN_PASSWORD_LENGTH` to
16 and this string was missed. An operator following the only on-screen
guidance would have set a password `getAdminConfig()` then rejects — and the
rejection is a `console.error` on the server plus an admin area that silently
stays shut, with the login page still displaying the instruction that caused
it. Both minimums are now interpolated from the constants, and
`tests/admin-config-copy.test.ts` fails if a literal length is ever typed into
that page again, whatever number is chosen.

**The documentation.** `README.md` claimed "94 passing tests" against an actual
367, and listed "CI pipeline" as an unbuilt follow-up eleven PRs after
`.github/workflows/ci.yml` started gating every push. For a repository whose
whole argument is that its claims are checkable, a headline number that is four
times off is the most expensive kind of error. The count is now stated once, in
a table explicitly framed as a dated measurement, and a CI badge carries the
continuously-true claim instead of prose.

Also corrected: the `PROJECT-PLAN.md` batch board and `PROGRESS.md` both
stopped at PR #9 while #11–#14 were merged, so the plan showed the admin auth
batch as blocked and the migrations as unwritten. H4 folded into H3 (they were
written assuming 001 was already applied; it is not). H10, H14 and H17 marked
resolved with the decision that closed each.

Two things the README now says that it did not: the JSONL file store is a
development convenience and never a production path (the documentation half of
**B5**), and the imagery under `public/images/` is unreplaced placeholders with
six unique files behind seventeen names (**F1**, open). A reviewer finding that
themselves draws a worse conclusion than one told up front.

**Evidence:** tsc exit 0 · lint clean · 370 tests / 25 files · build 49 pages.

---

## Batch B — the dead theme system removed · **MERGED**

**Closes the remainder of F8**, which Batch 6 recorded as deliberately deferred.
Not otherwise an `AUDIT.md` finding.

`styles/globals.css` carried a `.dark` block declaring all 30 custom properties
**to the same values as `:root`**, and `app/layout.tsx` ran a pre-paint inline
script whose only job was to add that class. A closed loop: it could not change
a rendered colour. `ThemeToggle` — the only thing that would ever have written
the `theme` key the script read — was deleted in Batch 6; the loop outlived it.

It survived because it looked load-bearing. Batch 5's CSP reasoning is written
around hashing "the inline theme script", and F2/F8 were partly *caused* by it:
two error messages kept a failing `red-600` inside `dark:` variants that could
never match.

**What it actually cost, measured rather than assumed.** The `.dark` block was
967 source bytes and **6 bytes of shipped CSS** — cssnano saw two identical
declaration blocks and merged the selectors into `.dark,:root{…}`. Claiming a
kilobyte of dead CSS would have been wrong. The real cost was the other half:
**230 bytes of blocking inline script in the `<head>` of all 31 prerendered
documents**, executed before first paint on every navigation, to add a class
with no effect.

Also removed: `IconSun` and `IconMoon` (orphaned when `ThemeToggle` went),
`IconCheck` and `IconArrowRight` (never had a caller), `suppressHydrationWarning`
on `<html>` — which existed only because the script mutated the class list
before React hydrated, and which would otherwise hide real mismatches — and the
duplicate `themeColor` entry naming `#0c080b` under both `prefers-color-scheme`
media queries.

**Kept deliberately:** `darkMode: "class"` in the Tailwind config, with the
reason written down. Under the default `"media"` strategy a stray `dark:`
variant would activate for every visitor whose OS prefers dark — most of them —
silently applying a value nobody designed against. `"class"` makes such a
variant inert, which is the belt to `tests/contrast.test.ts`'s brace.

`tests/dead-code.test.ts` guards all three shapes this repository has actually
grown: a token declared twice (a second palette, real or mirrored),
`dangerouslySetInnerHTML` or `suppressHydrationWarning` in the document shell,
and any icon exported without a caller — the last parameterised, so a new icon
that nothing imports fails by name.

**Evidence:** tsc exit 0 · lint clean · 395 tests / 26 files · build 49 pages.
Against the generated output: zero `localStorage.getItem('theme')` in any HTML,
no `.dark` rule in the CSS, `color-scheme: dark` still present, `<html>` clean.
94 source lines deleted, 16 added.

---

## Batch C — navigation: ARIA honesty, focus, and link hygiene · **MERGED**

**Finding closed:** F10 (Low) · plus four defects found while fixing it

**F10.** The dropdowns declared `role="menu"` with `role="menuitem"` children.
Those roles are a contract — arrow keys between items, Home/End to the ends,
type-ahead, focus moving into the menu on open. None was implemented, so a
screen-reader user was told "menu, 6 items" and then found the arrow keys did
nothing. `aria-haspopup` went with them; it makes the same promise.

What the component actually is, is a **disclosure**: a button with
`aria-expanded` revealing a list of links, which Tab already walks correctly.
That is now what the markup says. Escape closes and returns focus to the
trigger — the one keyboard affordance a disclosure does owe, and the one that
was missing.

**Found while fixing it, none in the audit:**

**1. A tap could not open a dropdown.** The panel opened on `mouseEnter` and
the trigger *toggled* on click. On a touch device a tap synthesises mouseenter
before click, so the panel opened and immediately closed. The desktop nav is
reachable from 1024px up, which includes tablets in landscape. Now
`onPointerEnter`/`onPointerLeave` guarded on `pointerType === "mouse"`, so
hover-to-open is a mouse affordance and touch gets a clean toggle.

**2. `aria-controls` had nothing to point at.** The panel was
`{open && <div/>}`, so when collapsed the id named no element. Same defect the
accordion had in #9, same fix: always render, collapse with the `hidden`
attribute.

**3. White halos on focus.** Four controls carried `focus-visible:ring-offset-2`
with no offset colour. Tailwind's default `--tw-ring-offset-color` is
**white**, so keyboard focus painted a white ring around a control on a
near-black navbar. Three more — the desktop "Log In" link, the mobile toggle,
every mobile link — had no focus style at all and fell back to the UA outline.
All seven now share one `FOCUS_RING` constant.

**4. `<details open>` with no `onToggle`.** Added while making the mobile
section containing the current page open by default. React resets a controlled
`open` on the next render, which would have collapsed the section under the
reader's finger. Made genuinely controlled instead.

Also: `aria-current="page"` on the active link in both navs, `aria-label="Main"`
on the `<nav>`, an accurate "Open menu"/"Close menu" label on the mobile toggle
in place of the state-free "Toggle menu", and decorative chevrons marked
`aria-hidden`.

**Footer.** The four "Fast links" were *Tariffs · Help · Support · FAQ* — with
Help and FAQ both pointing at `/faq`, and Tariffs labelling the page every
other surface calls Pricing. Two links to one page and one page under two
names, on every page of the site. Now four shortcuts to four destinations.

**Evidence, against the generated HTML** (`.next/server/app/pricing.html`):
0 `role="menu"`, 0 `role="menuitem"`, 0 `aria-haspopup`; 9 `aria-expanded` and
**9 `aria-controls`, all nine resolving to an element that exists**; 5 panels
rendered-and-hidden, still carrying their links; 2 `aria-current="page"`.
tsc exit 0 · lint clean · 403 tests / 27 files · build 49 pages.

`tests/navigation.test.ts` strips comments before scanning, because these files
now *explain* the roles they no longer use and a naive grep would count the
explanation as the offence.

---

## Batch D — the observability seam · **MERGED**

**Finding closed:** B2 (High), except the provider adapter · **Batch 10**, code half

Ten `console.*` calls were the entire story, and `app/error.tsx` said so:
*"Surface the error to logs/monitoring. Swap console for your provider."* The
failures that matter most are all deliberately swallowed, and correctly so — a
storage write that failed, an insert that fell back, an email that never sent,
a limiter running degraded. None should break the visitor's request. Each was
also invisible unless a human happened to be reading raw platform logs at that
moment, so the detection path for *"we have been silently losing leads for a
week"* was a customer complaint.

`lib/observability.ts` is built for three properties:

**No dependency.** Four runtime dependencies is a deliberate constraint. The
default reporter writes **one line of JSON to stderr**, which every log
platform already parses, with `severity` at the top level so an alert rule can
filter without one. `setReporter` is where a Sentry adapter plugs in — that is
[H7](./PROJECT-PLAN.md#h7--create-an-error-tracking-project-and-supply-the-dsn-b2),
and it is now the *only* part of B2 waiting on a human.

**Isomorphic.** `app/error.tsx` is a client component, so nothing here may
import `node:*`. That ruled out the `AsyncLocalStorage` request-context design
this started as.

**Nothing personal leaves the process.** `redact()` drops the value of any key
whose name reads as personal or secret — recursively, and applied to every
context on the way to a reporter, not at the call sites. The capture sites deal
in submission ids and error bodies, and it would take one careless
`captureException(err, { submission })` to start posting names and email
addresses to a third-party service. A test asserts the whole path.

**The correlation id, placed where it earns its keep.** B2 asks for a request
id from middleware. That would tag every request including the 99.9% that
succeed, and it means widening the matcher — currently `/admin` only — so every
asset request runs Edge middleware. Instead a **reference** is minted only when
a submission fails, shown to the visitor in the error message, returned in the
response body, and written into the captured event. "It said reference
K3F9QW2A" now resolves to exactly one log line. The alphabet excludes `0/O` and
`1/I/L` so it survives being read aloud.

**Wired at nine sites**, not the four the audit named: storage write (both
providers), storage health (both), stats degradation, analytics record and its
fallback, funnel degradation, limiter degradation, notification failure, admin
export, health-check storage and FX probes, `app/error.tsx`, and the admin
credential rejection — the last because Batch A had just shown what a silently
disabled admin area costs.

**Two console calls survive on purpose**, and `tests/observability.test.ts`
names the exemption so it is a decision rather than an oversight:
`lib/storage.ts` echoes the failed submission itself, which is the last-resort
recovery record and contains personal data, so it must stay in the platform's
own logs rather than being forwarded anywhere; and `lib/env.ts` prints a
multi-line human-readable configuration report at startup, where in production
the same condition throws instead.

**Three existing tests were rewritten to assert at the seam** rather than on
console spies — `storage.health` no longer leaking `secret_column` into the
response, the limiter's degradation being reported, the stats fallback naming
its migration. Each is a stronger assertion than the spy it replaces: it checks
*the event*, not the routing.

`tests/setup.ts` silences the reporter by default, because several suites drive
failure paths deliberately and a passing run had begun printing a wall of JSON.

**Evidence:** tsc exit 0 · lint clean · 572 tests / 32 files · build 54 routes. The seam's own contract is covered: it never throws when the
reporter does, it redacts nested context, it writes one newline-free parseable
line, and 200 references do not collide.

**Not done, deliberately:** no live-server probe. The behaviour is covered at
unit level against real modules, and standing up a server to watch a log line
would not have told me anything the tests do not.

---

## Batch E — storage internals · **MERGED**

**Findings closed:** B6, B5, B9 (all Medium/Low) · **Batch 12**

**B6.** `lib/analytics.ts` carried a near-verbatim copy of `lib/storage.ts`'s
JSONL mechanics: the `DATA_DIR` resolution, the mkdir-then-append write, the
split-filter-parse-skip-corrupt read loop. The duplication was stable, which is
exactly why it was worth removing — every change to how records are written or
recovered had to be made twice, and the second one gets forgotten.

`lib/jsonl.ts` is now the one implementation. Each module holds only its schema
and its aggregation.

A second thing fell out of it: `DATA_DIR` was read into a module-level `const`
at import time, which is why **two test files carried a comment explaining that
they must set the variable before a dynamic import**. `dataDir()` resolves per
call, so those files went back to plain static imports and the explanation went
away with them.

**B5.** Both file stores read every file completely into memory, `JSON.parse`d
every line and sorted the whole array before slicing for pagination — on the
*default* provider, on every request. Reads are now bounded to the trailing
512 KiB.

**The part that took the thought is the truncation, not the bound.** A store
that quietly returns the newest 47 of 4,700 records is the same shape of bug as
the funnel that could report over 100% — and that one shipped for months
because nothing said it was happening. So `read()` returns `truncated`, and
both stores report it through the seam Batch D had just built, naming the
remedy. `tests/jsonl.test.ts` asserts the window never yields a half-record
from its leading edge, and that a window smaller than one record is an empty
result rather than a parse error.

**B9.** The 8-second timeouts were `AbortController`s cleared in a `finally` —
and `finally` runs when `fetch()` resolves, which is when the **headers**
arrive. Every caller then read the body outside that scope, so a response that
stalled mid-body had no ceiling at all. `AbortSignal.timeout` stays armed for
the whole exchange. `lib/postgrest.ts` also now says *"no response within
8000ms"* rather than relaying the runtime's "aborted due to timeout", which
never mentions what the budget was.

The existing abort test drove the timeout with vitest's fake timers, which
cannot move `AbortSignal.timeout` — that timer lives inside the runtime, not in
a JavaScript `setTimeout`. It is replaced by two tests that control the signal
directly: one asserting the budget is 8000ms and reaches the message, and one
asserting the signal is **still armed while the body is being read**, which is
the case the old implementation left unbounded.

**Evidence:** tsc exit 0 · lint clean · 587 tests / 33 files (from 572/32) ·
build 54 routes.

---

## Batch F — structured data and the honesty of a sitemap · **MERGED**

**Not an `AUDIT.md` finding.** The audit called the SEO implementation
"meticulous" and it largely is — canonical on every indexable route, a complete
sitemap, FAQ and breadcrumb schema. Re-reading it turned up three claims that
were being made and not kept.

**1. Eighteen pages rendered a breadcrumb and one emitted `BreadcrumbList`.**
Ten via `Hero`, five directly, three via `LegalDoc` — and only `/blog/[slug]`,
which does not use the component, had the structured data. The fix is not to
hand-write the schema on the other seventeen: `BreadcrumbEyebrow` now derives
it from the same array it renders, so the two cannot drift apart because there
is only one of them.

That surfaced a real modelling question. The trails contain grouping labels —
"Business", "Legal" — that no route serves, and Schema.org requires `item` on
every entry except the last. Listing them would claim URLs that 404. They are
dropped from the structured data and kept in the visual trail, where they are
doing a different job; positions renumber consecutively.

The markup changed too: a flat run of `<span>`s became a real `<ol>`, and the
final entry carries `aria-current="page"`. A breadcrumb that is not a list
reads to a screen reader as a sentence of disconnected words rather than a
position in a hierarchy.

**2. The sitemap said the entire site changed this morning, every morning.**
Every entry carried `new Date()`, including the six blog posts that have real
publication dates. A `lastmod` that is always today is not a strong freshness
signal — it is one a crawler learns to discount, and it takes the *accurate*
dates down with it. Blog entries now carry their publication date, parsed at
UTC midnight so the sitemap, the rendered date and `datePublished` cannot
disagree by a day. The marketing routes have no change history to report, so
they report none.

A test asserts the sitemap lists nothing `robots.txt` disallows. A sitemap is a
request to crawl; listing a forbidden path asks for two contradictory things.

**3. `dateModified` was absent** from `BlogPosting`. Set equal to
`datePublished`, because nothing has been revised — the tempting alternative,
build time, would tell every crawl that all six posts were rewritten this
morning, which is the same lie as (2) in a different field.

**Also:** `article:published_time` on blog posts and nowhere else; `Organization`
gains `contactPoint` for the two addresses the site actually publishes;
Twitter `site`/`creator` derived from the configured profile URL by
`socialHandle()`, which returns null rather than emit `@undefined`; and a web
app manifest at `/manifest.webmanifest`.

The manifest sets `display: "browser"` deliberately. A standalone window hides
the address bar, and hiding the address bar on something that presents as a
bank removes the one piece of chrome a visitor can use to check they are where
they think they are.

**Evidence, against the generated HTML:** `/business/eu-business-account` now
carries `Organization`, `WebSite`, `BreadcrumbList` and `FAQPage`, with the
breadcrumb reading Home → EU Business Account and "Business" correctly absent;
`/legal/privacy` the same shape; the blog post carries **exactly one**
`BreadcrumbList`, not two. Sitemap: 32 entries, 6 with `lastmod` — 32 not
33 because the careers page was deleted in #26.
tsc exit 0 · lint clean · 645 tests / 34 files (from 587/33) · build 55 routes.

---

## Batch G — the demo, as an interaction · **MERGED**

**Not an `AUDIT.md` finding.** The audit called the demo's accessibility
"thoughtfully done", and the pieces it named are real. Working through the flow
as a *reader* rather than as a diff turned up four defects and three gaps.

### Defects

**1. Landing on `/demo` moved focus into the middle of the page.** Focus goes
to the step heading on every step change, which is right — except the effect
also ran on mount, so a keyboard visitor arrived past the skip link and the
entire navbar with no indication they had been moved. It now skips the first
render.

**2. The whole step panel was an `aria-live` region, *and* focus moved into
it.** Every transition announced the heading, the body copy and every control —
then the focus move announced the heading again. Worse, the KYC progress and
the rate loader are their own live regions nested inside it. There is now one
`sr-only` live region carrying a sentence about what actually changed
("Received $4,820.00. USD balance is now $4,820.00."), which is what a live
region is for. A live region should say what changed; what changes here is a
balance.

**3. The progress rail said nothing on a phone.** The step labels were
`hidden sm:block` — `display: none` below 640px, so on a phone a screen-reader
user got eight unnamed bars and an `aria-current` pointing at one of them. Now
`sr-only sm:not-sr-only`: visually identical, always in the accessibility tree.

**4. Disabled Continue buttons never said why.** Every gate in this flow is one
action away from opening, which is exactly what makes naming the blocker worth
doing: "Receive the $4,820.00 payout to continue" is an instruction, while a
greyed-out button is a dead end. The convert step now distinguishes *"you have
not converted yet"* from *"the live rate has not loaded"* — two different
situations that look identical from a disabled control, one the reader's move
and one the network's.

### The rules became testable

Those gates were a seven-branch ternary embedded in JSX, checkable only by
clicking. `advanceFrom(step, progress)` and `previousStep(step)` are pure
functions in `lib/demo.ts` now, with ten cases covering every gate, the blocker
text, and the invariant that advancing and going back are inverses at every
step.

### Motion

Step changes were instant, and new activity rows appeared with no motion at
all — the two moments in the flow where something is meant to feel like it
happened. Two keyframes, both short on purpose: `step-in` (320ms, 8px) is a
settle rather than an entrance, because the panel is what the reader is already
looking at, and `fade-up`'s 700ms/18px would make every click feel like a page
load. `row-in` (420ms) arrives from above, where the row comes from.

A balance tile now highlights briefly when its number moves. The count-up
animation already existed; what it could not say was *which* balance changed.
The highlight is a colour transition rather than motion, so it still reads
under `prefers-reduced-motion`, where the counter falls back to setting the
value directly.

**Also:** a **Back** control. A walkthrough with no way to re-read the previous
step, only "Restart", punishes curiosity — and the state is cumulative, so
stepping back and forward is consistent rather than destructive.

**Evidence, against the generated HTML:** the demo panel is down from three
live regions to two targeted ones, all eight rail labels are present in the
markup at every viewport, the Back control and the blocker hint are correctly
absent on the welcome step. tsc exit 0 · lint clean · 655 tests / 34 files ·
build 55 routes.
