# Marsa

[![CI](https://github.com/elkamohammad1988/marsa-web/actions/workflows/ci.yml/badge.svg)](https://github.com/elkamohammad1988/marsa-web/actions/workflows/ci.yml)

**One account for every currency you get paid in.** Marsa is a multi-currency
account concept for cross-border businesses and freelancers — get paid by
marketplaces and clients abroad, hold 30+ currencies, convert at the interbank
rate, and pay out over SEPA, without a second bank in the middle.

This repository is the **marketing site + lead-capture backend + an interactive
product demo**, built to a production bar: Lighthouse 100s, 0 axe violations,
and a typecheck → lint → unit-test → build gate that runs on every push and
every pull request. It is deliberately honest about what is real software
versus a labelled sandbox — see
[What's real vs simulated](#whats-real-vs-simulated).

![Marsa home — black rose theme](portfolio-screenshots/br-home.png)

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
- **Real backend** — a form-intake pipeline with shared validation, honeypot,
  cross-instance rate limiting, durable storage (PostgreSQL or a file
  fallback), email notification, a health endpoint, and an HMAC-authenticated
  admin dashboard with CSV export. **The public forms deliberately do not call
  it.** This build has no operator, so collecting a real name and email address
  behind "we'll email you within one business day" would be a false promise and
  a live data-protection obligation. The forms validate through the same
  `lib/validation.ts` the API uses, then discard the input and explain what a
  real submission would have done. The pipeline itself stays fully unit-tested
  in `tests/api-forms.test.ts`.
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
| Email | Resend REST API (no SDK) |
| FX data | ECB reference rates via Frankfurter (key-less) |
| Tests | Vitest |

No runtime dependencies beyond `next`, `react`, `react-dom`, `recharts`.
Postgres is spoken over HTTP; auth uses WebCrypto HMAC. Nothing else is pulled in.

## Architecture

```
app/
  page.tsx                 Home (hero, live rate ticker, corridor map, sections)
  demo/                    Interactive sandbox
  admin/                   HMAC-auth dashboard: submissions, CSV export, funnel
  api/
    rates/ rates/history   Live ECB FX (server-cached)
    leads|contact|subscribe  Form intake → validation → storage → email
    demo/events            First-party funnel telemetry
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
  admin-auth.ts            HMAC-signed session cookies, constant-time compare
  csv.ts                   RFC-4180 + formula-injection-safe CSV
  legal.ts / site.ts       Env-gated regulatory copy, site config
db/migrations/            Numbered, append-only Postgres migrations (see db/README.md)
```

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
`SUPABASE_SERVICE_ROLE_KEY` (run `npm run db:migrate` once), `RESEND_API_KEY` +
`RESEND_FROM` for email, `ADMIN_PASSWORD` + `ADMIN_SESSION_SECRET` for `/admin`.
The environment is validated at server start, so a half-configured pair fails
loudly in production rather than degrading in silence.

## Verified quality

A point-in-time measurement on the production build, last taken **2026-07-26**
(see [CASE-STUDY.md](CASE-STUDY.md) for method). The CI badge above is the
continuously-true version of the bottom two rows.

| Check | Result |
|---|---|
| Lighthouse `/` (desktop) | **Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100** |
| Lighthouse `/demo` (desktop) | **100 · 100 · 100 · 100** |
| axe-core (WCAG 2.0/2.1 A+AA) | **29 routes, 0 violations** — automated crawl of each route in its default state; does not cover states reached only by interaction, including form validation errors after a failed submit |
| Responsive (375 / 768 / 1440) | No horizontal overflow on any route |
| Unit tests | **367 / 367 passing**, 24 files |
| Types / lint / audit | tsc clean · lint clean · 0 vulnerabilities in the production tree · zero `any` |

The dev dependency tree carries known high advisories from the end-of-life
ESLint 8 chain. They ship to nobody — `npm audit --omit=dev` is 0 — so CI
audits the production tree and the migration to ESLint 9 is tracked in
[`PROJECT-PLAN.md`](PROJECT-PLAN.md).

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
- Form intake → validation → durable storage → optional email; admin auth;
  CSV export; rate limiting; health checks; the demo funnel analytics.
- Every calculation and business rule is real code, unit-tested.

**Simulated, and clearly labelled as such:**
- The `/demo` account — balances, transactions, IBAN — is **sample data, no real
  money**. The sandbox banner says so, and discloses the anonymous analytics.
- The homepage account panel is a static illustration (`aria-hidden`).

**Marketing claims:** testimonials and figures like "180+ countries" are
positioning copy for a pre-launch concept, not audited metrics. Regulatory
wording is env-gated: the site only asserts an authorisation when a real
register reference is configured (`lib/legal.ts`), otherwise it describes the
licensed-partner model.

**Imagery:** the photographs under `public/images/` are unreplaced design
placeholders — six unique files serving seventeen names — so several `alt`
strings describe a product shot that is really a stock photo. That is a known
open finding (F1 in [`AUDIT.md`](AUDIT.md)), blocked on sourcing licensed
assets rather than on code, and it is listed here rather than quietly left for
a reader to notice.

## Roadmap

**Phase B — the actual regulated product (deferred, not built here):**
real customer authentication, accounts, digital KYC via a provider, a
double-entry immutable ledger, money movement through a licensed BaaS partner
(e.g. Currencycloud / Modulr), and transaction monitoring. This is intentionally
not stubbed — half-built auth/ledger would be worse than none. The demo remains a
labelled sandbox until that exists.

Smaller follow-ups, tracked in [`PROJECT-PLAN.md`](PROJECT-PLAN.md): error
tracking (Sentry) + product analytics, Playwright smoke tests in CI, data
retention and erasure tooling, ESLint 9, i18n (Arabic/French for the MENA
wedge), and real product photography to replace the current placeholder
imagery.

## Screenshots

| Demo — convert (live ECB rate) | Demo — done |
|---|---|
| ![convert](portfolio-screenshots/br-demo-convert.png) | ![done](portfolio-screenshots/br-demo-done.png) |

Mobile (375 px): ![mobile demo](portfolio-screenshots/br-375-demo.png)

---

Built as a portfolio piece. Not affiliated with any bank; not a financial
product. See [What's real vs simulated](#whats-real-vs-simulated).
