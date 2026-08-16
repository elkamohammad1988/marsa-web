# Marsa

[![CI](https://github.com/elkamohammad1988/marsa-web/actions/workflows/ci.yml/badge.svg)](https://github.com/elkamohammad1988/marsa-web/actions/workflows/ci.yml)

**A complete multi-currency fintech application — marketing site, customer
accounts, operator dashboard and an interactive product demo — built end to end
in Next.js 15, TypeScript and Postgres.**

Marsa is a concept build: the financial product it depicts is simulated, while
the application around it is real, running software. Authentication, per-row
database permissions, validation, rate limiting, live third-party data and the
test suite are all genuinely implemented and independently verifiable in this
repository.

**[▶ Live demo — marsa-web.vercel.app](https://marsa-web.vercel.app)**

![The Marsa home page: a dark gold-on-slate landing page for a concept
multi-currency account, showing the product panel and the "Concept build"
disclosure the site carries on every page](portfolio-screenshots/01-hero.png)

---

## What you can try right now

The deployment runs with **no database credentials configured**, which decides
what a visitor can reach. That is a deliberate choice, not an unfinished one.

| Working on the live demo | Deliberately closed |
|---|---|
| The whole marketing site, at every breakpoint | `/account` — customer accounts need `SUPABASE_ANON_KEY` and `AUTH_SESSION_SECRET` |
| `/demo` — the interactive sandbox, end to end | `/admin` — the operator dashboard needs `ADMIN_PASSWORD` |
| Live European Central Bank rates and 30-day history | |
| ISO 13616 IBAN validation, entirely offline | |
| 404 and error boundaries, sitemap, structured data | |

**Why the authenticated areas are shut rather than half-working.** Standing up
live accounts for a product nobody can sign up to would mean holding real email
addresses for a company that does not exist. The code, the row-level-security
migration and the tests are all in this repository and run from a clean clone —
what is missing from the demo is a database, not a feature. `/api/health`
reports `degraded` for the same reason, which is the application refusing to
pretend.

---

## Key capabilities

- **Customer accounts with real data isolation.** Registration, email
  confirmation, sign-in, password reset, and sessions that renew silently in the
  background. Permissions are enforced by Postgres Row Level Security, so one
  customer cannot read another's record even if application code asks it to.
- **An operator dashboard.** Form submissions, search, CSV export, and a
  first-party analytics funnel — no cookies, no third-party trackers.
- **Live financial data.** The converter and the demo's conversion step run on
  real European Central Bank reference rates, cached server-side, degrading
  gracefully when the source is unreachable. No invented numbers.
- **An interactive product demo.** `/demo` walks the whole cross-border loop —
  open account → verify → European IBAN → receive a payout → convert at the live
  rate → send over SEPA — with correct arithmetic and a checksum-valid sample
  IBAN, clearly labelled as a sandbox.
- **A backend that does not lose things.** Shared client/server validation,
  honeypot, cross-instance rate limiting, durable storage, and email notification
  as a side effect that can never block an intake.

---

## Screenshots

All regenerated from a production build by `npm run capture`, so they cannot
drift from the application they show. **Every one carries the concept-build
disclosure**, because the site does — the capture script throws rather than
write an unmarked image, and [`tests/portfolio-honesty.test.ts`](tests/portfolio-honesty.test.ts)
fails if that rule is ever softened.

| | |
|---|---|
| **Live ECB rates** — the converter and its 30-day history, on real European Central Bank data ![live rates](portfolio-screenshots/02-live-rates.png) | **Get paid from abroad** — the demo at the point a payout lands in the USD balance ![account](portfolio-screenshots/03-feature-account.png) |
| **Convert at the interbank rate** — the same live rate, applied ![convert](portfolio-screenshots/04-feature-convert.png) | **Operator dashboard** — the demo funnel, first-party and anonymous, behind authentication ![analytics](portfolio-screenshots/05-analytics.png) |
| **IBAN validation** — ISO 13616 / MOD-97, entirely offline ![iban](portfolio-screenshots/06-iban-validation.png) | **The same flow at 390 px** — not the hero reflowed, the demo mid-conversion ![mobile](portfolio-screenshots/07-mobile.png) |

`/admin` itself is deliberately never captured: it renders live form
submissions, which on any machine that has used the contact form means a real
name and email address in an image intended for a public listing. The funnel
view carries the same message and is anonymous by construction.

---

## Technology

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, RSC), React 19 |
| Language | TypeScript (strict, **zero `any`**) |
| Styling | Tailwind CSS 3, CSS-variable design tokens |
| Database | PostgreSQL via Supabase — JSONL file fallback for local development |
| Auth | Supabase Auth (GoTrue) over REST, **no SDK** — signed `httpOnly` cookies, Postgres RLS |
| Charts | Recharts |
| Email | Resend REST API (no SDK) |
| FX data | ECB reference rates via Frankfurter (key-less) |
| Tests | Vitest · GitHub Actions |

**Four runtime dependencies:** `next`, `react`, `react-dom`, `recharts`.
Postgres and Supabase Auth are both spoken over HTTP and session cookies are
signed with WebCrypto HMAC, so nothing else is pulled in — including
`@supabase/ssr`, which is skipped for a reason worth reading:
[why no SDK](AUTHENTICATION.md#1-no-supabase-sdk).

---

## Engineering highlights

**Design system — "Liquid Gold".** Metallic gold (`#D4AF37` / `#E8C95A`) on
deep water-slate (`#0B1216`), dark-only and coherent, driven entirely by CSS
custom properties. The palette it replaced was metallic magenta; the swap
touched two files and no component logic, which is the claim the token layer
exists to make good on. A slow water-reflection effect carries the identity on
the surfaces that hold the brand, and stops entirely under
`prefers-reduced-motion`.

**Provider selection by environment.** Every side-effect layer — storage, email,
rate limiting, analytics — picks its implementation from environment variables
behind one interface. Zero config runs the whole app on a file store; set
`SUPABASE_URL` and the same code talks to Postgres. That is what makes this
repository runnable in one command and production-real when wired.

**The file store is a development convenience, never a production path.** It
reads and sorts the whole dataset per request and is invisible to any other
instance, so `createStore()` **refuses to build it** when `NODE_ENV=production`
and names the missing variables instead. Silently losing a lead is the failure
mode that rule exists to make impossible.

**Failures are reported, not swallowed.** Every degradation the system chooses
to absorb — a write that failed, an email that never sent, a rate limiter
running without its database — emits a structured event through
`lib/observability.ts` with personal data redacted before it can leave the
process. Visitors get a reference code; the detail stays in the log.

Deeper detail lives in [`CASE-STUDY.md`](CASE-STUDY.md) (design and product
decisions) and [`docs/`](docs/) (architecture, audit history, deployment).

---

## Security and authentication

**Two separate authentication systems, deliberately.** `/admin` is one shared
operator password guarding form submissions; `/account` is customer accounts
guarding a person's own data. They share the cookie-signing primitive and
nothing else, because merging them would let the operator password read
customer rows.

- **The database decides who reads what.** The administrator's account list is
  written as *"select every profile"* with no role filter, and returns exactly
  one row to everybody else. `profiles.role` is unwritable from a browser
  session — the `authenticated` database role holds no privilege on that column,
  so an attempt to change it fails at Postgres rather than at a check in
  application code.
- **Sessions.** An HMAC-signed `httpOnly` envelope, renewed silently in
  middleware before the access token expires, with an absolute 30-day ceiling
  that a refresh cannot extend.
- **Rate limiting that fits the attack.** Escalating windows per IP *and* per
  account, because a password list run against one address from rotating IPs
  trips neither alone. Email addresses are HMAC-bucketed before they reach the
  limiter's table, so it never becomes an unretained store of personal data.
- **No account enumeration.** Sign-in, password recovery and confirmation
  re-sends return an identical response whether or not the address has an
  account — including when the upstream call fails.
- **Headers.** A real Content-Security-Policy, HSTS with preload,
  `frame-ancestors 'none'`, and `Cross-Origin-Opener-Policy: same-origin`.

Full setup and threat reasoning: [`AUTHENTICATION.md`](AUTHENTICATION.md).

---

## Testing and quality

`npm run verify` runs the gate in order, and the same four steps are the CI job,
so the badge above is the live answer rather than a claim in prose.

```bash
npm install
npm run dev            # http://localhost:3000

npm run verify         # typecheck → lint → tests → production build
npm audit --omit=dev   # 0 vulnerabilities in the shipped tree
```

**What the suite covers.** 1,703 automated checks across 48 files, all running
in Node:

- **Unit tests for business logic and security boundaries** — IBAN MOD-97, FX
  conversion, storage provider selection, admin auth (HMAC round-trip, tamper,
  expiry), session signing and expiry, RLS-backed profile reads, CSV
  formula-injection safety, rate-limit tiers, and the analytics funnel.
- **Property tests** that recompute outcomes rather than assert spellings — most
  usefully [`tests/contrast.test.ts`](tests/contrast.test.ts), which computes
  real WCAG ratios from the token values in `styles/globals.css`, so darkening a
  colour fails the build.
- **Repository-integrity checks** that assert properties the other gates cannot
  see: no anchor nested inside an anchor, no colour utility naming an undefined
  token, no page claiming the build collects nothing, a length budget on every
  `<title>`, every page carrying exactly one top-level heading, no font size
  smuggled into `<Heading>` through `className` — a real defect that had every
  auth page rendering its `<h1>` *larger* on a phone than on a desktop — and
  the honesty rules on the screenshots.

**What it does not cover, stated plainly:** there is **no browser or
end-to-end suite**. Nothing here renders a component in a DOM or drives a form
in a real browser. Playwright smoke tests are tracked in
[`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md) and are not written yet.

**Accessibility.** Skip link, landmarks, visible focus, decorative art marked
`aria-hidden`, and every foreground/background pair verified against WCAG AA by
computation on every test run:

| Pair | Ratio | Use |
|---|---|---|
| `#E9F1F4` on `#0B1216` | 16.5:1 | body / headings |
| `#E8C95A` on `#0B1216` | 11.6:1 | links, eyebrows, focus rings |
| `#0C1114` on `#D4AF37` | 9.0:1 | button labels on the gold fill |
| `#9BB0B8` on `#0B1216` | 8.4:1 | muted text |
| `#7FBF8A` on `#16242A` | 7.4:1 | success / payout amounts |
| `#D4AF37` on `#1A2A31` | 7.0:1 | large key numbers |
| `#E88A8A` on `#16242A` | 6.4:1 | form errors |

An earlier point-in-time audit of the previous palette (Lighthouse, axe-core
across 36 routes at two viewports) is recorded with its method and its limits in
[`CASE-STUDY.md`](CASE-STUDY.md). Those figures describe the build they were
taken on and have not been re-run against this palette — the contrast table
above has, on every test run.

---

## What's real vs simulated

Honesty matters more than looking finished.

**Real software:**

- ECB FX rates — live, server-cached, driving the converter and the demo conversion.
- IBAN validation (ISO 13616 / MOD-97) and the demo's checksum-valid sample IBAN.
- **Customer accounts** — registration, confirmation, sign-in, password reset,
  session persistence with silent renewal, and a role model enforced by Row Level
  Security. Creating an account stores your email address and, if you give one,
  your name. It opens a profile page and nothing else, because there is no money
  anywhere in this project.
- Form intake → validation → durable storage → optional email; admin auth; CSV
  export; rate limiting; health checks; demo funnel analytics.
- Every calculation and business rule is real code, unit-tested.

**Simulated, and labelled as such on screen:**

- The `/demo` account — balances, transactions, IBAN — is sample data. The
  sandbox banner says so and discloses the anonymous analytics.
- The homepage account panel is a static illustration (`aria-hidden`).
- **The public marketing forms deliberately transmit and store nothing.** Nobody
  reads a lead here, so collecting a real name and address behind "we'll email
  you within one business day" would be a false promise. They validate through
  the same `lib/validation.ts` the API uses, then discard the input and explain
  what a real submission would have done. The pipeline itself stays fully
  unit-tested.

**Marketing claims:** there are no testimonials — the invented people this site
once quoted were removed rather than rewritten, because a concept has no
customers to quote. Figures like "180+ countries" are the product's design
scope, not audited metrics. Regulatory wording is environment-gated: the site
only asserts an authorisation when a real register reference is configured,
otherwise it describes the licensed-partner model.

**Imagery:** there is none. Every illustration is drawn in markup, each carrying
its own description keyed off the same union the drawing is, so an illustration
cannot be mislabelled.

---

## Deployment

Deploys to Vercel, Netlify, or any Node host. The environment is validated at
server start, so a half-configured pair fails loudly in production rather than
degrading in silence.

Optional production wiring, all documented in `.env.example`:

| Variables | Turns on |
|---|---|
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Durable storage (then run `npm run db:migrate`) |
| `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `AUTH_SESSION_SECRET` | Customer accounts |
| `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` | The operator dashboard |
| `RESEND_API_KEY` + `RESEND_FROM` | Email notification |

Customer accounts need three further steps that cannot be done from code — one
migration and two Supabase dashboard settings — all written out in
[`AUTHENTICATION.md`](AUTHENTICATION.md#setup). Until they are done, every auth
page renders a panel naming exactly what is missing rather than a form that
would fail.

Full runbook: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

---

## Roadmap

**Phase B — the regulated money product — is deliberately not built and not
stubbed:** digital KYC through a provider, a double-entry immutable ledger,
money movement through a licensed BaaS partner, and transaction monitoring.
Each needs a regulated entity behind it that does not exist, and a half-built
ledger would be worse than none.

Smaller follow-ups tracked in [`docs/PROJECT-PLAN.md`](docs/PROJECT-PLAN.md):
Playwright smoke tests in CI, error tracking and product analytics, data
retention and erasure tooling, ESLint 9, and i18n.

---

**Marsa is a concept build.** It is not a bank, not an e-money institution, not
a licensed payment service, and not affiliated with any financial institution.
It holds no money and moves none, it has no customers, and no part of it is or
has been in production use. Balances and transactions shown anywhere in this
project are simulated.

Licensed under the [MIT License](LICENSE).
