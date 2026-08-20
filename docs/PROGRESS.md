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

---

## The honesty programme — batches H1–H5 · 2026-07-26 → 2026-07-27

**Not `AUDIT.md` findings.** The audit asked whether the code was correct. It
did not ask whether the site was *true*, and that turned out to be the more
expensive question. Recorded here as one arc, because the individual fixes only
make sense together.

The trigger has a date on it: this repository is **public**, the site is a
working application, and its forms collected a name and an email address behind
a success screen reading *"our onboarding team will email you within one
business day with your next steps and identity-verification link."* There is no
onboarding team. That is a false statement made to a real person on a public
URL, and it created a live data-protection obligation for a project with no
operator to discharge one.

### H1 — the forms collect nothing · [#23](https://github.com/elkamohammad1988/marsa-web/pull/23) · **MERGED**

The public forms now validate through the same `lib/validation.ts` the server
uses — so a visitor sees the real rule set rather than a mock of it — and then
**transmit nothing and store nothing**. `DemoSubmissionNotice` replaces the
success screen: what actually happened, what the real pipeline would have done
in order, and the endpoint that would have run.

The intake pipeline stays in the repository and stays tested — shared
validation, honeypot, cross-instance rate limiting, durable storage with an
unambiguous write contract, email notification. It is deliberately not wired to
the public form, and the panel says so. `useSubmit.ts` (87 lines) was deleted;
`tests/forms-collect-nothing.test.ts` asserts the absence.

The footer newsletter gets a one-line version of the same statement, because it
renders on every page and a subscription confirmation would have been a lie in
the one component nobody can avoid.

### H2 — the build says what it is · [#24](https://github.com/elkamohammad1988/marsa-web/pull/24) · **MERGED**

`ConceptBadge` on every route: a small on-brand disclosure that expands into
what is real (live ECB rates, ISO 13616 IBAN validation, a tested intake
pipeline) and what is not (no company, no licence, no accounts, no data
collected). Chosen over a top banner, which costs a strip of every viewport, and
over an interstitial, which puts a modal between a visitor and the work in the
first ten seconds.

**The line was drawn at statements with legal weight, not at product claims.** A
concept describing free SEPA transfers is a claim about a hypothetical product.
A page telling a reader they may refer a complaint to the financial ombudsman
service is a false statement about a legal right. Removed outright: the FSCS
reference, the ombudsman referral, the assertion that 100% of customer funds are
safeguarded, `RegulatedBand`'s "under EU and UK supervision" (nine pages), and
the footer badges asserting *"Regulated Partners · Segregated Accounts ·
Safeguarded Funds"* sitewide. `TrustStrip` went too — it was the last holder of
"Safeguarded Funds" on the homepage and it listed **Mastercard** among "networks
and standards you already trust".

Six configuration defaults stopped inventing an identity. `support@`, `sales@`
and `press@marsa.money` were live `mailto:` links and `Organization.email`;
`x.com/marsamoney` and friends were emitted in `Organization.sameAs`, which is a
machine-readable claim to own those accounts. All six now default to empty, and
every consumer renders only when configured — including `getNotifierConfig`,
which had been treating a missing recipient as a reason to send to the empty
string.

Then the same domain in the place it did the most damage: `siteConfig.url` fell
back to `https://www.marsa.money`, which is what every canonical tag, the
sitemap, robots, every OG tag and the JSON-LD are built from. An unconfigured
build was asking search engines to attribute this site's content to a domain
nobody owns. Resolution is now `NEXT_PUBLIC_SITE_URL`, then Vercel's
per-deployment host, then `http://localhost:3000`.

`tests/site-identity.test.ts` guards the shape rather than the string: no file
under `app`, `lib` or `components` may contain the unregistered domain, and no
`NEXT_PUBLIC_*` fallback may be a URL or an email literal. Scoped to that prefix
deliberately — a server-side default naming a third party the code genuinely
calls (`FX_API_BASE`) is a dependency, not a claim about who we are.

**Deliberately untouched:** `lib/legal.ts`. Its fallback string is the one
remaining substantial false claim on the site, and its wording is
[H19](./PROJECT-PLAN.md#h19--approve-the-regulatory-disclosure-wording).

### H3 — the imagery · [#25](https://github.com/elkamohammad1988/marsa-web/pull/25) · **MERGED** · closes **F1**, absorbs **F9**

Seventeen PNGs, six unique hashes, 2.05 MB, provenance unknown. The audit filed
it as duplication; the duplication was the symptom. **The defect was that a
picture and the sentence describing it were maintained in different files with
nothing tying them together** — which is how `card-phone.png` came to render as
`alt="Marsa Mastercard and mobile app"` while being, byte for byte, the cover
photograph of blog post 6. No amount of care at the call site could have caught
that, because the call site had no way to know what the file was.

Replacing raster with raster would have fixed the symptom and left the defect,
so the art is now **drawn in markup**, in the idiom of `AccountPreview`:
tokenised HTML and inline SVG, following the palette, sharp at any density, a
few hundred bytes instead of 2.05 MB. `components/art/captions.ts` declares six
product slots and six blog motifs as unions with a caption per member, keyed off
the same type — a slot cannot exist without a description, and a description
cannot outlive the slot it describes. `BrandArt` renders `role="img"` with that
caption, which also drops the decorative internals out of the accessibility tree
entirely. The `imageSrc`/`imageAlt` prop pair is gone from all four consuming
components, so there is no per-page alt string left to drift.

The card is **scheme-neutral** — no network mark, real or invented — and says
CONCEPT where a scheme logo would sit. Seven "Marsa Mastercard" strings left the
copy across five pages and `lib/pricing.ts`.

Markup cannot serve a crawler, so `app/blog/[slug]/opengraph-image.tsx`
generates a real share card per post at build time; `postSocialImage` is the
single place its path is written, so the route and its three metadata consumers
cannot drift. The five `hero-blog-*` files nothing referenced went with the rest
(**F9**).

**Not verified:** nobody has seen the artwork rendered — browser tooling was
unavailable in the session that wrote it. Structural verification only. See
[H20](./PROJECT-PLAN.md#h20--look-at-the-new-artwork).

### H4 — the people and the jobs · [#26](https://github.com/elkamohammad1988/marsa-web/pull/26) · **MERGED**

Nine testimonials, each a quotation attributed to a named person with a job
title and a city. **Three separate pages ran the same quote from the same
invented "Marco P."**, which is the detail that gives it away: they were written
to fill a section, and any reader who visits two pages sees it. A fabricated
endorsement is a different order of thing from an optimistic product claim — a
claim describes a hypothetical product, an endorsement asserts that a real
person had a real experience.

The careers page went with them: five open roles, five Apply buttons, and a
benefits list (meaningful equity, private health cover, 26 days holiday) for a
company that does not exist. There is no honest version of that page, so it was
deleted rather than reworded — with its footer link and its sitemap entry.

Two CTAs that promised a person were rewritten: *"Talk To Our Compliance Team"*
pointed at a form that reaches nobody, and *"explore a career on our team"*
pointed at the deleted page.

**Kept deliberately: the rate ticker.** Its data is real — ECB reference rates,
fetched hourly, labelled with the actual publication date, and the section
renders nothing at all if the provider is unreachable. It was never in the same
category as the rest of this.

`tests/no-invented-people.test.ts` guards the prop shape rather than the
strings, so a new quote fails on arrival whatever it says. It also asserts that
**every path in the sitemap resolves to a page file** — the careers deletion had
three consequences and only two of them are visible while clicking around.

### H5 — `/company/about` · [#27](https://github.com/elkamohammad1988/marsa-web/pull/27) · **OPEN, awaiting the maintainer**

The one PR in this arc deliberately not self-merged. The maintainer asked for a
proposal on the thin company pages rather than a deletion, so it is written as
code and left open.

It turns a company profile for a company that does not exist — *"Marsa was
founded on a simple belief"*, **180+ countries served** — into a page about the
build, where **every number is computed from the module that implements it**:
the currency table the converter reads, the ISO 13616 table the validator checks
against, the sitemap function itself. No test count appears on it, because that
number has no honest self-updating source — which is exactly the failure the
README had when it advertised 94 passing tests against an actual 367.

---

## Baseline on `main` — 2026-07-27

```
25 PRs merged · 655 tests / 34 files · 55 routes
tsc --noEmit exit 0 · next lint clean · npm audit --omit=dev clean
```

Every Critical and every High in `AUDIT.md` is closed. What remains from the
original backlog is Batch 11 (retention), Batch 13 (end-to-end smoke tests),
Batch 17 (ESLint 9) and Batch 18 (operational documentation) — none of them
risk-driven.

## Milestone 1 — customer authentication · 2026-07-27

Branch `feat/auth-foundation`. The first non-remediation work in this
repository: `AUDIT.md` is closed and the honesty programme is down to its last
blocked item, so this adds a capability rather than correcting one.

### What shipped

Registration, email confirmation, sign-in, sign-out, password recovery,
session persistence with silent token renewal, one profile per account, and a
two-role authorisation model — Supabase Auth over its REST API with no SDK, an
HMAC-signed `httpOnly` session cookie, and authorisation enforced by Row Level
Security in Postgres.

Architecture, setup and the security matrix are in `AUTHENTICATION.md`. What
follows is only what a reader of this file would not find there.

### Four decisions

**No `@supabase/ssr`.** Its cookies exist to be read by a browser client, so
they cannot be `httpOnly`. Nothing in this application authenticates from the
browser — every call is a route handler or a server component — so the session
is `httpOnly` and no Supabase token exists in browser JavaScript at all. It
also keeps the README's four-dependency claim true and avoids a second
PostgREST client sitting beside `lib/postgrest.ts` with different timeout,
error and escaping behaviour. The cost is nine endpoints of code we own against
an API we do not control; `tests/gotrue.test.ts` exercises every one.

**A signed envelope around Supabase's tokens.** Middleware has to answer
"signed in, as what role" before every protected page, on Edge, without a
network call. The alternatives were putting Supabase's JWT signing secret in
the environment — a secret whose disclosure forges any user — or fetching a
JWKS and implementing ES256. An HMAC over our own payload is one
`crypto.subtle` call and reuses what the admin session has run on since audit
S5, now shared in `lib/signed-cookie.ts`. What it gives up is stated in the
module: a revoked session still verifies for up to one access-token lifetime,
which is the same window a verified Supabase JWT would have given.

**The database decides who reads what.** `lib/profiles.ts` never touches the
service-role key. `listProfiles` is written as "select every profile" with no
role filter and returns the directory to an administrator and exactly one row
to everybody else, because migration 004's policies say so. The practical test:
if a role in a session cookie were ever wrong, `/account/admin` would open and
show one row.

**Two authentication systems, not one.** `/admin` stays a single shared
operator password over form submissions. Merging it into the role model would
mean that one password could read customer rows.

### Two bugs the tests found in my own code

`noticeFor()` used `code in AUTH_NOTICES`, and `in` walks the prototype chain —
so `/login?error=toString` resolved to `Object.prototype.toString` and handed a
*function* to the page as its notice. `Object.hasOwn` now.

The renewed session cookie was initially written only onto the response. The
page rendering that same request still read the old cookie — and after a long
absence that access token is already expired, so the first page someone sees on
coming back would fail to load any data, once, for no visible reason.
`NextResponse.next({ request })` forwards it.

### The existing test that changed, and why exactly one did

`tests/migrations.test.ts` asserted *"never creates a row level security
policy"*. That was right while every row belonged to the operator: a form
submission has no owner but the business, so RLS-on-zero-policies plus the
service-role key is a complete model.

A profile has an owner. Keeping zero policies would leave one customer's row
separated from another's only by a filter in a route handler, and a filter is
something a future handler can forget. So 004 adds policies, and the property
that assertion was defending is restated more strictly: no policy grants
anything to `anon` or `public`, every policy is scoped to `authenticated`,
every policy is constrained by `auth.uid()` or `is_admin()`, only `select` and
`update` are granted at all, and every policy is dropped before it is created
so the directory stays re-runnable. One assertion out, five in.

That is the only pre-existing assertion that moved. Verified rather than
asserted: `main`'s copies of the two modified test files were checked out and
run against the new schema, and exactly one test failed — that one.

### The honesty consequence

Accounts store real email addresses, which made three sitewide claims false.
The maintainer chose to narrow them to the marketing forms rather than hedge
the account area, so:

- `ConceptBadge` says the *marketing forms* discard input, and states plainly
  that creating an account stores an email address and, if given, a name.
- The footer chip "No data collected" is gone. It was replaced rather than
  reworded because a privacy claim that holds for most of a site is a false
  one, and the badge row has no space to say it precisely; `ConceptBadge` does.
- The README's "nothing here can be signed up to" is now what is the case, and
  its Roadmap no longer lists customer authentication as deferred.

The marketing forms themselves were not touched.
`tests/forms-collect-nothing.test.ts` passes unchanged.

Two stale claims found on the way and corrected: the README said 367 tests in
24 files (it was 691 in 34 before this work, 909 in 40 after), and it described
placeholder photographs under `public/images/` — a directory that no longer
exists, because the artwork batch replaced them with drawings in markup.

### Verification

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build` — all
clean. 945 tests across 41 files, up from 691 across 34. All 49 statically
generated pages stay static: the account area is dynamic, the marketing site is
not.

### Left for a human

`H21` in `PROJECT-PLAN.md`. Nothing was applied to the live Supabase project.
Migration 004 is written and tested but not run, and the two dashboard settings
it needs — the redirect allow-list and the email templates — cannot be set from
code. Until all four steps are done the account area is completely inert and
every auth page says what is missing.

---

## Catalog readiness audit — 2026-07-28

A review of the whole repository against the question "would this survive an
unsympathetic reviewer opening it cold". Five defects, three of them shipping
in committed code, and none of them visible to the existing gates.

### The one that mattered

**Eleven of twenty routes crashed in the production build.** `/demo`,
`/pricing`, `/blog`, `/faq`, all four `/tools/*`, and both `how-it-works`
pages rendered the server HTML, threw during hydration, and were replaced by
`app/global-error.tsx`.

`Navbar` read `e.currentTarget.open` *inside* a `setState` updater. React nulls
`currentTarget` when the handler returns; the updater does not run until the
next render, so the read threw. The trigger was the effect that opens the nav
group containing the current page — which is why exactly the routes that sit
inside a nav group failed, and the ones that do not (`/`, `/login`,
`/contact`, `/legal/*`, `/company/*`) were fine. It shipped in `204021f`,
an accessibility fix, and survived every gate since: `tsc` and ESLint cannot
see it, the server render is valid on its own, and `npm run dev` never showed
it because the CSP was blocking React's development build.

Fixed by reading the boolean synchronously. `tests/nested-anchors.test.ts` and
the CSP change below exist so the *class* of bug is visible next time.

### The rest

- **`/blog` hydration mismatch.** The featured card was a `<Link>` wrapping a
  `<Button href>` to the same post — an `<a>` inside an `<a>`. Browsers repair
  that by closing the outer anchor early, so the DOM stopped matching the
  markup and React discarded the tree. Added `ButtonLabel` (a `<span>` with the
  button's appearance) for CTAs inside clickable cards, and a source lint that
  fails on any anchor nested in another.
- **The CSP was applied in development.** Without `'unsafe-eval'`, React Fast
  Refresh cannot run, so hot reload was dead *and* every descriptive React
  diagnostic was suppressed — the reason both bugs above stayed invisible
  locally. Now added under `next dev` only; production and test are unchanged,
  and `tests/security-headers.test.ts` still asserts no `unsafe-eval`.
- **The converter's amount field rendered 20 px wide.** `w-full` on a flex item
  whose min-content width is a number input's spinner. The value, colour and
  24 px type were all correct; "1000" was drawn as a two-pixel sliver. Now
  `min-w-0 flex-1` (333 px). `/tools/fx-calculator` has the same markup shape
  and was measured, not assumed — it is not affected, so it was left alone.
- **An empty image slot on `/tools/currency-converter`** — an `aspect-[4/3]`
  box containing the words "Live FX Insights" and nothing else, the last hole
  left by deleting `public/images/`. It read as a broken asset on the page most
  likely to be linked as evidence of the FX work. Now a `BrandArt` drawing,
  with a guard in `tests/art.test.ts` against any slot left empty.

### Screenshots

127 files and 50 MB became eight. The old set was a per-`<section>` sweep of
every marketing route captured *before the rebrand*, so all 118 of the
directory-nested ones still showed the previous brand in both filename and
pixels. They were untracked and never in git history, so nothing public was
ever affected.

`scripts/capture.mjs` was rewritten to produce exactly the eight the README
embeds, reproducibly, from a production build. It could not have run as it
stood: it imported `puppeteer-core`, which was neither declared nor installed,
and it opened by `rmSync`-ing its own output directory — which would have
deleted the four tracked images the README was embedding.

`/admin` is deliberately not among the eight. It is a real dashboard, but it
renders live submissions, and on this machine that meant a real name and email
address in an image intended for a public listing.

### Stale claims corrected

- `package-lock.json` still declared `"name": "nowe-seo-pages"`.
- The README's Lighthouse row asserted Performance 100. Re-measured: 87, 95 and
  100 on three consecutive runs of the same build, tracking total blocking time
  240 ms → 150 ms → 20 ms. The row now says that instead of picking the
  flattering number. Accessibility, Best Practices, SEO and CLS 0 reproduced
  exactly.
- Test count 945/41 → 1065/43.

### Verification

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build` — all
clean, 1065 tests across 43 files. All twenty routes re-scanned in the
production build with a real browser: no thrown errors, no console errors, no
horizontal overflow.

### Left for a human

The account area still cannot be demonstrated. `.env.local` has no
`SUPABASE_ANON_KEY` or `AUTH_SESSION_SECRET`, so `/login` and `/register`
render the setup notice rather than a form — which means the newest and largest
piece of work in the repository is the one a visitor cannot see. Supplying
those two values is a change to authentication config and to Supabase, so it
was left alone: see `H21` in `PROJECT-PLAN.md`.

---

## Catalog submission audit — 2026-07-28 (second pass)

A second review of the whole repository against an unsympathetic reviewer, run
with a real browser rather than by reading. Thirty-six routes at two viewport
widths — seventy-two page-loads — measured for thrown errors, hydration,
horizontal overflow, duplicate ids, nested anchors, heading order, tap-target
size, metadata length, and axe-core with the **WCAG 2.2** tags added.

### The finding that was invisible to every previous gate

**Seven colour utilities named a token the palette did not define.** The rebrand
had changed every value in `tailwind.config.ts` and kept every name, with the
config saying so out loud — *"legacy `blue*` names kept for zero-churn"*. So the
source asked for `bg-brand-blue` and got magenta, `bg-surface-navy` and got
magenta-black, and `<Section tone="white">` painted the page near-black. Reading
a page told you nothing about how it looked, which is the exact benefit
`CASE-STUDY.md` claims for the token system in a section titled "roles, not
shades".

Underneath that, seven places had already been written as `bg-brand-soft/25`,
`text-brand-soft` and `hover:border-brand-soft/40` — and there was no
`brand.soft` key, only `brand["blue-soft"]`. Tailwind does not warn on an
unknown utility, so it emitted nothing at all: the hero and corridor aurora
glows, the CTA glow, two status dots and the corridor eyebrow had been
rendering **with no colour**. `tsc` and ESLint never look inside a class string,
and a missing decorative glow reads as a design choice rather than a fault.

Renamed in one pass across 46 files — `brand` / `brand-deep` / `brand-soft`,
`surface-deep` / `surface-alt` / `surface-tint`, and tones of
`canvas | alt | deep | brand | tint`. Verified the only way a rename this wide
can be: by diffing the compiled CSS of both builds and confirming every
`property: value` pair was identical. It was, apart from the seven declarations
that had never been emitted before and four from the accessibility fixes below
— which is the evidence that the rename changed names and nothing else.

`tests/dead-code.test.ts` now parses the palette out of the config and fails on
any colour utility naming a token that does not exist. Its first version
shipped a word-boundary escape inside a template literal, which JavaScript
reads as a backspace character — so the pattern matched nothing and every file
passed. It now contains a test that the detector detects, because a guard that
cannot fail is worse than no guard: it also reports success.

### Accessibility, with WCAG 2.2 switched on

Adding the `wcag22aa` tag is what surfaced these. The A+AA run had been clean
and stayed clean; none of this was regression, all of it was never-covered.

- **`scrollable-region-focusable`** (serious) on `/tools/sepa-vs-swift` at
  390px. A bare `overflow-x-auto` scrolls with a wheel or a finger and with
  nothing else, so the columns past the right edge existed for pointer users and
  did not exist for anyone on a keyboard. Now `components/ui/ScrollRegion.tsx`,
  applied to all three tables, with `tests/scroll-regions.test.ts` failing on
  any bare `overflow-x-auto` — the property worth defending is that there is one
  way to build one, not that today's three are fixed.
- **`heading-order`** on the same route: `h1` followed by `h3`.
- **Five targets under the 24 x 24 minimum in SC 2.5.8** — the breadcrumb links
  on fifteen routes (41 x 17), the blog back-link, the consent checkbox at
  20 x 20, the FX markup slider at 16px tall, and the two standalone "Back to
  sign in" footer links. The inline links inside sentences (`Create one`,
  `Terms of Service`) were left alone: SC 2.5.8 exempts them explicitly, and
  padding them would break the sentences they sit in.
- **Duplicate `id="hp-field"`** on `/contact` and `/get-started`. The honeypot
  hard-coded its id, and both pages carry two forms, so two labels resolved to
  one input and the other honeypot lost its label entirely. `useId` now.

Re-measured after: **72 page-loads, 0 axe violations, 0 thrown errors, 0
hydration mismatches, 0 horizontal overflow.**

### Claims that had gone stale

The account work made three statements false, and they had survived in the two
places where a false data-protection claim is least harmless:

- `/legal/privacy` said *"This build collects no personal data, so there is
  nothing to exercise a right against."* Registration writes an email address.
  It now names what is stored and states plainly that no erasure tooling exists,
  which is the honest half of saying so — a rights section listing deletion
  without one is the same false promise at greater length.
- `/company/compliance` said the same thing under "Data protection".
- `app/error.tsx` reassured that *"nothing here is stored"*. It is the root
  boundary, so it renders over `/account` too, where a profile edit is a real
  write.

Both legal passages were changed on the maintainer's explicit instruction
rather than autonomously, per the standing rule about regulatory copy.

Also corrected: `/faq` offered "Contact support" under *"Our team is one message
away"* — there is no team, the same correction #26 made elsewhere; the 404 page
offered "Contact support"; `CASE-STUDY.md` still claimed 655 tests against an
actual 1,488, and still said there were no accounts.

`tests/forms-collect-nothing.test.ts` now fails on any page claiming the
*build* collects nothing, while still defending the true, narrower claim that
the *marketing forms* do.

### SEO

Eight meta descriptions ran 161-192 characters and six blog titles ran 74-111,
so the clause that made each worth clicking was the part being truncated. All
trimmed, and `tests/seo.test.ts` now asserts the budget for every page and post
rather than the current strings — a seventh post with a long headline fails the
gate instead of shipping cut in half. Blog posts got a separate `seoTitle`,
because the headline on the page and the one in a search result have genuinely
different jobs.

### Screenshots

The eight were regenerated, but the real fix was to `scripts/capture.mjs`. It
scrolled each subject to a hand-tuned offset, which is why `06` sliced a
paragraph through the middle of its line at the top edge, `08` sliced the page
heading in half, and `03`/`04` ended on a heading cut mid-word. Each had been
fixed by nudging its own magic number, which only moved the cut: an offset that
clears one page's header lands in the middle of the next page's paragraph.

It now searches for a scroll position that bisects no line of text and leaves
nothing meaningful under the floating navbar, scoring headings above paragraphs
above controls, and prints the position it chose. Its first version scored
`button` and not `a` — and every CTA on this site is a `Button href`, so it
reported a cut score of zero while still slicing "Get Marsa Plus" across the
bottom of `08`.

### Repository presentation

`AUDIT.md`, `PROJECT-PLAN.md` and `PROGRESS.md` were 200 KB of internal working
record sitting in the repository root, which is the first thing anyone opening
the repo saw. Moved to `docs/`, with an index explaining what each is for.
Added `docs/UPWORK-LISTING.md`: title, description, tiers, image captions and
FAQ for a Project Catalog entry, written so that every claim in it is either a
description of future work or a checkable statement about this repository.

### One flaky test, fixed as a flake

`auth-routes` -> *"still signs in a fresh account after a long burst"* drives
240 sequential requests through the real handler and the real limiter, and
crossed vitest's 5-second default while a production build was running on the
same machine. It passed three times out of three in isolation. Given an
explicit 30-second budget rather than raising the global timeout, which would
have hidden a genuinely hung test elsewhere. A test that goes red when the
runner is busy is the worst kind of red for a project whose argument is that the
CI badge is the live answer.

### Verification

`npm run typecheck` - `npm run lint` - `npm test` - `npm run build`, all clean.
**1488 tests across 44 files**, up from 1065 across 43. Then the whole site
re-measured in a real browser: 72 page-loads, zero violations of anything
checked.

### Left for a human

Unchanged from the previous entry — `H21` in `PROJECT-PLAN.md`. `.env.local`
still has no `SUPABASE_ANON_KEY` or `AUTH_SESSION_SECRET`, so `/login` and
`/register` render the setup notice rather than a form, and the newest and
largest piece of work in the repository is still the one a visitor cannot see.

Account deletion is now named as missing on `/legal/privacy`, which makes
building it the next honest step rather than an optional one.

---

## Batches 11, 17 and 18 — erasure, the toolchain, and the operations record · 2026-08-19

A full production audit, run from scratch rather than from the backlog: read the
repository, then drive the built site in a real browser and see what breaks. The
backlog work that fell out of it — retention and erasure, ESLint 9, operational
documentation — closed the last three batches that were not blocked on a person.

### Two defects the whole test suite could not see

Both were found by *driving* the site, not by reading it. Both were green under
typecheck, ESLint, 1,763 tests and a production build.

**`/blog` pagination was a link to nowhere.** Previous and Next rendered as
`<Link href="#" aria-disabled className="pointer-events-none">` on the pages
where they had no destination. That is disabled for exactly one input device:
`pointer-events-none` stops a mouse, `opacity-50` is a suggestion to the eye,
and `aria-disabled` announces a state without removing anything. What puts an
anchor in the tab order is the `href` — so a keyboard reader on page 1 reached
"Previous", pressed Enter, and navigated to `#`, losing their place in the list
with nothing on screen to say why. `/admin`'s pagination never had the bug: it
renders the control only when there is somewhere to go.

Fixed by making the disabled state a `<span>` — not a link at all — and guarded
by `tests/disabled-controls.test.ts`, which fails on any anchor carrying
`href="#"`, `aria-disabled`, or `pointer-events-none`. The lint strips comments
before matching, so a file may document the mistake it fixed without failing the
check that describes it.

**`/admin` crashed instead of explaining.** `getStore()` throws
`StorageConfigError` in production when no database is configured — deliberately,
because degrading silently to the file store is how leads went missing (B1) — and
the call sat outside the page's try block. So an operator who had signed in
correctly, on a deployment without `SUPABASE_URL`, got the root error boundary:
*"We hit an unexpected error"*, *"trying again usually resolves it"*, and a
reference number. All three statements were false. The condition is expected, it
has a written remedy in `MISSING_DB_CONFIG_MESSAGE` naming the two variables to
set, and retrying can never fix it — and the operator was the one person who
would never see that message. Verified against a real build before and after:
200-with-a-blank-page, then the heading, `Storage: none · not configured`, and
the remedy.

### Erasure · B10

A GDPR Article 17 request previously meant opening the Supabase SQL editor and
writing the `DELETE` by hand — database credentials and an unfiltered statement
typed from memory against production, for a routine and legally time-bound task.

- `SubmissionStore.delete(id)` on both providers, returning **whether a row was
  actually removed**. That boolean is the contract: a mistyped id, an
  already-deleted row and a permission refusal all complete without error, and
  "the delete did not throw" does not support the claim an erasure request needs.
- `POST /api/admin/submissions/delete` behind four gates — same-origin, admin
  session, its own rate-limit tier, and an id validated before it reaches a
  query. It answers 404 rather than redirecting when it removed nothing.
- A Delete control per row in `/admin`, as a form rather than a link, because a
  GET that deletes is one prefetch away from erasing what it pointed at. The
  return path is rebuilt from a closed set of parameters, not echoed.
- `deleteRows()` in the PostgREST client **refuses an unfiltered query**:
  PostgREST reads `DELETE /table` as "every row", so an optional filter would
  make a forgotten argument mean the table.
- `JsonlStore.removeWhere()` reads the file *whole*, unlike every other read
  here, which is bounded (B5). Rewriting from a bounded window would delete
  everything outside it as a side effect of deleting one row — an erasure
  request that quietly erases the archive. Write-to-temp-then-rename, and a
  line it cannot parse is preserved rather than destroyed.

23 tests, including that deleting row 25 of 50 leaves rows 0 and 49 alone.

### Retention · B10, P9

`006` adds `purge_demo_events(interval default '90 days')`, mirroring
`purge_rate_limit_hits` so an operator who has scheduled one knows how to
schedule the other, and returning a row count so a run that did nothing is
distinguishable from a run that never happened. Its EXECUTE grants are closed to
`anon` and `authenticated` on the reasoning `005` established.

`submissions` gets **no** period, and `tests/data-retention.test.ts` asserts that
nobody has quietly invented one. How long an operator may keep a name and an
address someone sent expecting a reply is a legal question; whoever writes that
number has to be entitled to choose it. `demo_events` needs no such permission —
it holds a per-visit random id and a step name, so 90 days is garbage collection,
not privacy policy.

`.data/README.md` is now the one tracked file in that directory, which required
`.data/*` plus a negation rather than `.data/` — an ignored *directory* is one
git never descends into, so a negation inside it can never match. The test asks
`git check-ignore` itself rather than reading the rules and reasoning about them,
because reasoning about them is exactly how this goes wrong.

### The toolchain · P6

`next lint` was deprecated and is removed in Next 16. Migrated to ESLint 9 flat
config with `eslint .`, which lints files `next lint` never looked at — and
immediately found a real warning in `postcss.config.mjs`, invisible for the life
of the project. Bumped `puppeteer-core` to 25 for the `extract-zip` symlink
advisory, after checking every API `scripts/` uses still exists.

`npm audit` on the **whole** tree is now **0 vulnerabilities**, down from 13
high. CI's audit step therefore drops `--omit=dev`: the exemption existed only
to excuse the ESLint 8 chain, and has nothing left to excuse.

### Revoking an admin session without a redeploy · P7

The only way to end a live admin session early was to rotate
`ADMIN_SESSION_SECRET` and redeploy — a heavy answer that conflates two
different events. Rotating the secret asserts the signing key may have leaked;
revoking a session usually asserts nothing of the kind.

`ADMIN_SESSION_VERSION` is now part of the **signed** payload and compared on
every verification, so it cannot be edited in the cookie. Bumping it invalidates
every session at the next request. Verified against two real servers: the same
cookie gives `/admin` 200 on version 1 and a redirect to the login page on
version 2, with export and erasure both 401.

Tokens minted before this carry a bare expiry and no version, and are refused.
Treating them as version 1 would mean the tokens predating the feature are
exactly the ones it cannot revoke — one sign-in for one operator is the better
trade.

### The operations record · P8

`docs/RUNBOOK.md` — how to read `/api/health`'s two-booleans-per-check answer,
which log `event` to search for each failing dependency, a playbook per failure,
how to recover submissions from `[submission:<kind>]` log lines when a write was
refused, migrations, rollback, scheduled jobs, and secret rotation with the cost
of rotating each of the five.

`docs/DATA.md` — every piece of personal data the application can hold, the code
that writes it, who can read it and by what mechanism, how long it is kept, and
the procedure for an erasure, access or rectification request. Including what is
deliberately *not* stored: no IP addresses (the limiter keeps a hash), no
passwords, no third-party analytics, and a newsletter that validates an address
and discards it.

### Verification

`npm run typecheck` · `npm run lint` · `npm test` · `npm run build`, all clean.
**1827 tests across 53 files**, up from 1763 across 49. `npm audit` — full tree —
0 vulnerabilities.

Then the built site driven in a real browser, which is what this pass was for:
36 routes loaded with zero console errors and zero unlabelled controls, the IBAN
checker accepting and rejecting, the converter and FX calculator making the
right `/api/rates` calls and reacting to input, the FAQ accordion toggling by
mouse and keyboard, the navbar dropdown opening and closing on Escape, the
contact form refusing an empty submit with three field-level alerts and no
network request, the demo walking to its end state, and the erasure control
keyboard-focusable with an accessible name naming the record it removes.

The honesty test caught its own author mid-edit: updating the test count in
`README.md` and `DEPLOYMENT.md` and not in `CASE-STUDY.md`,
`docs/UPWORK-LISTING.md` and `scripts/record-demo.mjs` failed the build, which is
precisely the job it was written to do.

### Left for a human

`H3` — the migrations are **not applied to the live Supabase project**. The
server logs `PGRST202 … function public.submission_stats … not found` against it,
which means `003` never ran there, and by extension neither did `005` or `006`.
The dashboard still renders because `stats()` falls back to four counts, so this
degrades rather than breaks — but until `005` is applied, anyone holding the
project's public anon key can call a definer-rights delete. Applying migrations
means acting inside Supabase, which is not an automatic remedy.

`H12` unchanged: the retention period for `submissions`. The mechanism is ready
and the number is not ours to write.
