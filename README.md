# Marsa

[![CI](https://github.com/elkamohammad1988/marsa-web/actions/workflows/ci.yml/badge.svg)](https://github.com/elkamohammad1988/marsa-web/actions/workflows/ci.yml)

**A fintech-inspired full-stack web application, built as a portfolio piece.**
Marsa is a complete Next.js 15 application — marketing site, authenticated
customer accounts, a lead-capture backend, an operator dashboard, and an
interactive product demo — built to a production bar and deliberately honest
about which parts are real software and which are a labelled sandbox.

The product it depicts is a multi-currency account for cross-border businesses
and freelancers. That product does not exist. **Marsa is not a bank, holds no
money, and moves none** — there is no company, no licence and no regulator
behind it, and every page of the site says so. What is real is the engineering:
live European Central Bank rates, ISO 13616 IBAN validation, Supabase Auth over
its REST API with Postgres row-level security, and 1,494 unit tests behind a
CI gate that runs on every push.

**What to look at if you are evaluating the work:**
[What this is](#what-this-is-and-what-it-is-not) ·
[Architecture](#architecture) · [Verified quality](#verified-quality) ·
[What's real vs simulated](#whats-real-vs-simulated) ·
[`AUTHENTICATION.md`](AUTHENTICATION.md) ·
[`CASE-STUDY.md`](CASE-STUDY.md)

![The Marsa home page: a dark magenta-on-black landing page for a concept
multi-currency account, carrying the "Concept build" disclosure the site shows
on every page](portfolio-screenshots/01-hero.png)

## What this is, and what it is not

| | |
|---|---|
| **It is** | A production-grade Next.js 15 / React 19 / TypeScript application demonstrating fintech-style workflows end to end |
| **It is not** | A bank, an e-money institution, a licensed payment service, a live product, or software any customer has ever used |
| **Real money involved** | None, anywhere, at any point |
| **Real customers** | None. No client work, no revenue, no users to report |
| **Status** | Self-directed portfolio build, developed in the open on a public repository |

The screenshots below carry a "Concept build — what's real?" marker in the
corner because they do on the site: it is a fixed disclosure on every page that
expands into a plain list of what is real software and what is not. Portfolio
images are the one place a product is seen with no site around it, so the
capture script now [refuses to write an image without
it](tests/portfolio-honesty.test.ts).

---

## Highlights

- **Design system: "Black Rose"** — metallic magenta (`#CC1F86` / `#EE4FA5`) on
  near-black (`#0C080B`), dark-only and coherent, driven entirely by CSS custom
  properties. Every foreground/background pair is verified ≥ WCAG AA (see the
  [contrast table](#contrast-verified)).
- **Live FX** — the currency converter and the demo's conversion step use real
  European Central Bank reference rates (via the key-less Frankfurter API),
  cached hourly. No fake numbers.
- **Interactive demo** (`/demo`) — a clickable sandbox that walks the whole
  cross-border loop (open account → KYC → IBAN → receive → convert at the live
  rate → SEPA out) with correct arithmetic and a first-party analytics funnel.
- **Real authentication** (`/register`, `/login`, `/account`) — Supabase Auth
  spoken over its REST API with **no SDK**, an HMAC-signed `httpOnly` session
  cookie, silent token renewal in middleware, and a role model enforced by Row
  Level Security in Postgres rather than by a check in a route handler. The
  administrator's account list is written as *"select every profile"* with no
  role filter and returns exactly one row to everybody else, because the
  database is what decides. Creating an account stores an email address and, if
  you give one, a name — nothing else. See
  [`AUTHENTICATION.md`](AUTHENTICATION.md).
- **Real backend** — a form-intake pipeline with shared validation, honeypot,
  cross-instance rate limiting, durable storage (PostgreSQL or a file
  fallback), email notification, a health endpoint, and an HMAC-authenticated
  admin dashboard with CSV export. **The public marketing forms deliberately do
  not call it.** Nobody reads a lead here, so collecting a real name and email
  address behind "we'll email you within one business day" would be a false
  promise. Those forms validate through the same `lib/validation.ts` the API
  uses, then discard the input and explain what a real submission would have
  done. The pipeline itself stays fully unit-tested in
  `tests/api-forms.test.ts`.
- **First-party analytics** — anonymous demo funnel, no cookies, no third-party
  trackers, Do-Not-Track respected.
- **Failures are reported, not swallowed** — every degradation the system
  chooses to absorb (a write that failed, an insert that fell back, an email
  that never sent, a rate limiter running without its database) emits a
  structured event through `lib/observability.ts`, with personal data redacted
  before it can leave the process. A provider adapter plugs in through
  `setReporter`; the default writes one line of JSON to stderr.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC), React 19 |
| Language | TypeScript (strict, **zero `any`**) |
| Styling | Tailwind CSS 3, CSS-variable design tokens |
| Charts | Recharts |
| Storage | PostgreSQL via PostgREST / Supabase — JSONL file fallback |
| Auth | Supabase Auth (GoTrue) over REST, **no SDK** — signed `httpOnly` cookies, Postgres RLS |
| Email | Resend REST API (no SDK) |
| FX data | ECB reference rates via Frankfurter (key-less) |
| Tests | Vitest |

No runtime dependencies beyond `next`, `react`, `react-dom`, `recharts`.
Postgres and Supabase Auth are both spoken over HTTP; session cookies are
signed with WebCrypto HMAC. Nothing else is pulled in — including
`@supabase/ssr`, which is skipped for a reason worth reading:
[why no SDK](AUTHENTICATION.md#1-no-supabase-sdk).

## Architecture

```
app/
  page.tsx                 Home (hero, live rate ticker, corridor map, sections)
  demo/                    Interactive sandbox
  (auth)/                  login / register / forgot-password / reset-password / verify-email
  account/                 Signed-in area; account/admin is role-gated
  auth/confirm/            Where every link in a Supabase email lands
  admin/                   HMAC-auth dashboard: submissions, CSV export, funnel
  api/
    rates/ rates/history   Live ECB FX (server-cached)
    leads|contact|subscribe  Form intake → validation → storage → email
    demo/events            First-party funnel telemetry
    auth/*                 register / login / logout / recovery / resend
    account/*              profile / password (session required)
    admin/*                login / logout / CSV export
    health                 Provider wiring + FX/DB reachability
  (30+ marketing/tool/legal/blog routes)
lib/
  fx.ts                    ECB client, currency formatting
  iban.ts                  ISO 13616 / MOD-97 IBAN validation
  demo.ts                  Demo helpers (valid sample IBAN, funnel steps, money)
  storage.ts               SubmissionStore: Postgres | file, provider selection
  analytics.ts             Demo funnel store + computeFunnel()
  notify.ts                Resend notifier (side-effect, never blocks intake)
  rate-limit.ts            In-memory + shared (Postgres RPC) limiter
  observability.ts         captureException seam: structured events, redacted
  signed-cookie.ts         HMAC + constant-time compare, shared by both sessions
  admin-auth.ts            Single-operator password boundary for /admin
  gotrue.ts                Supabase Auth REST client (no SDK)
  auth-session.ts          Signed session envelope — Edge-safe, httpOnly
  auth.ts / auth-roles.ts / auth-routes.ts   Session, permissions, route policy
  profiles.ts              Profile reads/writes, always as the signed-in user
  csv.ts                   RFC-4180 + formula-injection-safe CSV
  legal.ts / site.ts       Env-gated regulatory copy, site config
middleware.ts             Two gates: /admin (password) and /account (session + role)
db/migrations/            Numbered, append-only Postgres migrations (see db/README.md)
```

**Two authentication systems, deliberately.** `/admin` is one shared operator
password guarding form submissions; `/account` is customer accounts guarding a
person's own data. They share the cookie-signing primitive
(`lib/signed-cookie.ts`) and nothing else, because merging them would mean the
operator password could read customer rows.

Design principle throughout: **provider selection by environment**. With zero
config the app runs on file storage and logs; set `SUPABASE_URL` etc. and the
same interfaces switch to Postgres. See `.env.example`.

**The JSONL file store is a development convenience, never a production
path.** It exists so `npm run dev` needs no credentials. It reads and sorts the
whole dataset per request, it is invisible to any other instance, and a
serverless filesystem is read-only or ephemeral — so `createStore()` refuses to
build it when `NODE_ENV=production` and names the variables that are missing
instead. Losing a lead silently is the failure mode that rule exists to make
impossible.

## Run / test / verify

```bash
npm install
npm run dev            # http://localhost:3000

# Production
npm run build && npm start

# Verification gate — `npm run verify` runs the first four in order
npm run typecheck      # tsc — zero errors, zero `any`
npm run lint           # ESLint — zero warnings
npm test               # Vitest
npm run build          # production build
npm audit --omit=dev   # 0 vulnerabilities in the shipped tree
```

The same five steps are the CI job (`.github/workflows/ci.yml`), so the badge
above is the live answer to "does this gate pass", not a claim in prose.

Optional production wiring (all in `.env.example`): `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` (run `npm run db:migrate` once), `SUPABASE_URL` +
`SUPABASE_ANON_KEY` + `AUTH_SESSION_SECRET` for customer accounts,
`RESEND_API_KEY` + `RESEND_FROM` for email, `ADMIN_PASSWORD` +
`ADMIN_SESSION_SECRET` for `/admin`. The environment is validated at server
start, so a half-configured pair fails loudly in production rather than
degrading in silence.

Accounts need three more steps that cannot be done from code — one migration
and two Supabase dashboard settings. All three are in
[`AUTHENTICATION.md`](AUTHENTICATION.md#setup), written to be followed without
further research. Until they are done, every auth page renders a setup panel
naming exactly what is missing rather than a form that would fail.

## Verified quality

A point-in-time measurement on the production build, last taken **2026-07-28**
(see [CASE-STUDY.md](CASE-STUDY.md) for method). The CI badge above is the
continuously-true version of the bottom two rows.

| Check | Result |
|---|---|
| Lighthouse `/` (desktop) | **Accessibility 100 · Best Practices 100 · SEO 100 · CLS 0**. Performance is **100 on an idle machine** but load-sensitive — three consecutive runs on the same build scored 87 / 95 / 100 as total blocking time moved 240 ms → 150 ms → 20 ms. The 100 is real and the 87 is real; treat a single number here as a measurement of the machine as much as of the page |
| axe-core (WCAG 2.0 / 2.1 / 2.2, A + AA, plus best-practice) | **36 routes × 2 viewports = 72 page-loads, 0 violations.** The 2.2 tags are what found the last round: five link and control targets under the 24 × 24 minimum in `2.5.8`, none of which the A+AA-only run had flagged |
| Console + page errors (72 page-loads) | **0** — nothing thrown, no hydration mismatch, no broken image, no duplicate `id`, no anchor nested in an anchor. The only aborted request is the converter cancelling its own in-flight history fetch on unmount, which is the `AbortController` working |
| Responsive (390 / 1440) | No horizontal overflow on any route at either width |
| Unit tests | **1494 / 1494 passing**, 45 files (1488 in 44 before this round) |
| Types / lint / audit | tsc clean · lint clean · 0 vulnerabilities in the production tree · zero `any` |

**What the axe number does not cover.** It is an automated crawl of each route
in its default state. It does not open a menu, submit an invalid form, or visit
a signed-in page, so the states reached only by interaction — validation errors
in particular — are outside it. Automated rules also cover a minority of WCAG
in principle: zero violations means no machine-detectable failure, not an
audited-accessible site.

The dev dependency tree carries known high advisories from the end-of-life
ESLint 8 chain. They ship to nobody — `npm audit --omit=dev` is 0 — so CI
audits the production tree and the migration to ESLint 9 is tracked in
[`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md).

### Contrast (verified)

Computed WCAG contrast ratios for the black-rose palette (AA needs ≥ 4.5:1
normal, ≥ 3:1 large/non-text):

| Foreground on background | Ratio | Use |
|---|---|---|
| `#F6EAF1` on `#0C080B` | 17.0:1 | body / headings |
| `#A97F97` on `#0C080B` | 5.85:1 | muted text |
| `#EE4FA5` on `#0C080B` | 5.97:1 | links, eyebrows, focus rings |
| `#FFFFFF` on `#CC1F86` | 5.11:1 | button labels |
| `#7FBF8A` on `#140A10` | 9.0:1 | success / payout amounts |
| `#E88A8A` on `#140A10` | 7.80:1 | form errors, invalid-IBAN panel |
| `#CC1F86` on `#0C080B` | 3.89:1 | large key numbers only (≥3 large) |

`tests/contrast.test.ts` recomputes these from `styles/globals.css` on every
run rather than trusting the table, and asserts that the `red-600` these error
states used to use *would* have failed.

## What's real vs simulated

Honesty matters more than looking finished.

**Real software:**
- ECB FX rates (live, server-cached), driving the converter and demo conversion.
- IBAN validation (ISO 13616 / MOD-97) and the demo's checksum-valid sample IBAN.
- **Customer accounts.** Registration, email confirmation, sign-in, sign-out,
  password reset, session persistence with silent token renewal, and a role
  model enforced by Row Level Security. Creating an account stores your email
  address and, if you give one, your name. It opens a profile page and nothing
  else — there is no balance behind it, because there is no money anywhere in
  this project.
- Form intake → validation → durable storage → optional email; admin auth;
  CSV export; rate limiting; health checks; the demo funnel analytics.
- Every calculation and business rule is real code, unit-tested.

**Simulated, and clearly labelled as such:**
- The `/demo` account — balances, transactions, IBAN — is **sample data, no real
  money**. The sandbox banner says so, and discloses the anonymous analytics.
- The homepage account panel is a static illustration (`aria-hidden`).

**Marketing claims:** there are no testimonials — the invented people this site
used to quote were removed rather than rewritten, because a concept has no
customers to quote. Figures like "180+ countries" are the product's design
scope, not audited metrics, and `/company/about` labels its number band as
such rather than as "countries served". Regulatory wording is env-gated: the
site only asserts an authorisation when a real register reference is configured
(`lib/legal.ts`), otherwise it describes the licensed-partner model.

**Imagery:** there is none. `public/images/` held seventeen PNGs with six
unique hashes and unknown provenance, and `alt` strings describing other
photographs (F1 in [`AUDIT.md`](docs/AUDIT.md)). They were replaced by drawings in
markup, each carrying its own description keyed off the same union the drawing
is — so an illustration cannot be mislabelled, because there is no per-page
`alt` prop left to drift. The directory no longer exists.

## Roadmap

**Customer authentication is built** — see
[`AUTHENTICATION.md`](AUTHENTICATION.md). It was the first thing on this list
and it is the piece that does not require a licence to be real, so it is real.

**Phase B — the actual regulated product (still deferred, still not stubbed):**
digital KYC via a provider, a double-entry immutable ledger, money movement
through a licensed BaaS partner (e.g. Currencycloud / Modulr), and transaction
monitoring. None of it is stubbed, deliberately — a half-built ledger would be
worse than none, and every one of these needs a regulated entity behind it that
does not exist. The demo remains a labelled sandbox until it does.

Deliberately out of scope inside authentication itself: multi-factor
enrolment, OAuth providers, and email change. Each is a flow of its own rather
than a switch, and the reasoning for each is recorded in
[`AUTHENTICATION.md`](AUTHENTICATION.md#deliberately-not-built).

Smaller follow-ups, tracked in [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md):
error tracking (Sentry) + product analytics, Playwright smoke tests in CI, data
retention and erasure tooling — including account deletion, which the privacy
policy now states plainly does not exist — ESLint 9, and i18n (Arabic/French
for the MENA wedge).

## Screenshots

Eight, in the order the product makes sense in. All eight are regenerated by
`npm run capture` against a production build, so they cannot quietly go stale
the way the previous set did — 127 files whose every filename still carried the
name this project had before it was renamed.

**Every one carries the concept-build disclosure**, in the corner, because the
site does. The capture script used to hide it — reasonable-sounding, since the
same badge in eight frames is chrome, and wrong here: a portfolio image is the
only place this product is seen with no site around it, no navigation and no
badge to open. What that produced was a hero image showing a European IBAN, a
€12,480.55 balance and an "Open An Account" button with every marker that this
is a concept removed by the script itself. `requireDisclosure()` now throws
rather than write an unmarked image, and `tests/portfolio-honesty.test.ts`
fails if that rule is ever softened back.

The capture script does not scroll to a hand-tuned offset. It searches for a
scroll position that **bisects no line of text and leaves nothing meaningful
under the floating navbar**, and reports the position it chose. The tuned-offset
version is why an earlier set sliced a heading in half at the top edge of two
images and ended a third on a word cut down the middle: an offset that clears
one page's header lands in the middle of the next page's paragraph, so each fix
moved the cut somewhere else rather than removing it.

| | |
|---|---|
| **Live ECB rates** — the converter and its 30-day history, on real European Central Bank reference data ![live rates](portfolio-screenshots/02-live-rates.png) | **Get paid from abroad** — the demo at the point a payout lands in the USD balance ![account](portfolio-screenshots/03-feature-account.png) |
| **Convert at the interbank rate** — the same live rate, applied ![convert](portfolio-screenshots/04-feature-convert.png) | **Demo funnel** — first-party, anonymous, behind the operator password ![analytics](portfolio-screenshots/05-analytics.png) |
| **IBAN validation** — ISO 13616 / MOD-97, entirely offline ![iban](portfolio-screenshots/06-iban-validation.png) | **Pricing** ![pricing](portfolio-screenshots/08-pricing.png) |

Mobile, 390 px: ![mobile](portfolio-screenshots/07-mobile.png)

There is no dashboard screenshot of `/admin` itself. It is a real dashboard and
it looks like one, but it renders live form submissions — on any machine that
has used the contact form, that means a real name and a real email address in
an image meant for a public listing. The funnel view above carries the same
"there is an authenticated operator area" message and is anonymous by
construction.

---

**Marsa is a concept build.** It is not a bank, not an e-money institution, not
a licensed payment service, and not affiliated with any financial institution.
It holds no money and moves none, it has no customers, and no part of it is or
has been in production use. See
[What this is](#what-this-is-and-what-it-is-not) and
[What's real vs simulated](#whats-real-vs-simulated).

Licensed under the [MIT License](LICENSE). Deployment runbook:
[`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
