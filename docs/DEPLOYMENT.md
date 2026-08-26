# Deployment

A launch-day runbook, and the record of the one deploy that has happened.

**Currently deployed: https://marsa-web.vercel.app**

**Production tracks `main`.** Vercel's git integration is connected, so every
push to `main` builds and promotes automatically — there is no manual deploy
step and no `vercel --prod` in the loop. That is deliberate: it is what keeps
the running site provenanced to a commit anyone can read
([H13](PROJECT-PLAN.md#h13--deploy-time-connect-the-host-to-the-repository)).

| | |
|---|---|
| Branch | `main` |
| Design in production | `6426a33` — *refactor(design): remove the decoration that was left under the effect layer*. Every commit after it on `main` is documentation or capture tooling, so the application output is unchanged from it |
| Verified against | the deployment built from `781c92c`, promoted 2026-08-26 |
| Environment | **exactly one variable set** — `NEXT_PUBLIC_SITE_URL` |
| CI | see the note below |

A note on reading the table above: the hash of the commit that *records* a
deployment can never be the hash of the commit that *was* deployed, because
writing it down comes second. So this names the commit the design shipped in and
the commit the verification below was run against, rather than pretending to
name a moving head.

### CI on these commits

`ci.yml` runs two required jobs in parallel. On `6426a33` and `781c92c` both
were green. On the documentation-only commit that followed, **`Verify` was green
and `Browser smoke` failed** — and that is worth writing down rather than
re-running until it is not.

The failing commit changed one file, `docs/DEPLOYMENT.md`, by fifteen lines. The
application bytes are identical to `781c92c`, which passed the same job minutes
earlier, so the change cannot be the cause. The suite is 139 browser tests
against a compiled build, and it passed locally three consecutive times on the
same tree (139/139), with the slowest single test at 3.3s — nowhere near a
per-test timeout.

What does vary is the whole suite's wall clock: 171s, 226s and 351s across those
three local runs, a two-fold spread driven by machine load alone. The job is
capped at `timeout-minutes: 20`. A shared runner having a bad few minutes is
therefore the explanation that fits the evidence, and the honest description is
**an intermittent failure in the browser gate, cause not conclusively
identified** — the job log needs repository authentication to read, which this
run did not have.

The next push re-ran the same two jobs against the same application tree and
**both were green**, `Browser smoke` included, which is the evidence that
settles it as intermittent rather than caused. The badge reads `passing`.

It is left recorded as a known intermittent rather than papered over. Raising
the cap to make a red build green would be weakening a gate to suit the result,
which is the one move this repository's gates exist to prevent — and a flake
that nobody wrote down is a flake that gets re-diagnosed from scratch the next
time somebody sees it.

No Supabase credentials, no admin password, no session secrets. That is why
`/account` and `/admin` redirect and `/api/health` reports `degraded` (HTTP 503)
rather than `ok` — every check below that depends on a database is therefore
**not satisfied on this deployment**, by choice, and this document does not
pretend otherwise. A 503 from `/api/health` here is the correct answer, not an
incident.

### What was verified against the deployed origin on 2026-08-26

Every line below was run against `https://marsa-web.vercel.app`, not against a
local build:

- **Route sweep** — 34 routes × 390 / 768 / 1280 px. No horizontal overflow, no
  skipped heading level, exactly one `<h1>` per route, no link or button without
  an accessible name, no `<img>` without `alt`, no console error and no failed
  request. The single finding is the 404 route's own `404` console message,
  which is the response being tested.
- **axe-core 4.12.1** — `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` over 32
  routes at 390 and 1280 plus the demo mid-flow. **65 scans, 0 violations.**
  Animations are settled first, for the reason documented in
  `tests/smoke/harness/browser.ts`: axe folds an ancestor's opacity into its
  contrast maths, so a scan that lands mid-reveal reports contrast failures the
  design does not have.
- **Interactive flows** — the demo walks end to end (Start → Account → Verify →
  IBAN → Get paid → Convert → Send → Done) on a live ECB rate; the converter
  returns `1 EUR = 1.1662 USD` and draws its 30-day history; the IBAN checker
  accepts `DE89 3704 0044 0532 0130 00` and rejects the same number with a
  mutated check digit; `/get-started` still states that it discards what you
  type.
- **Assets** — 0 broken images, both webfonts report `loaded`, 0 failed
  requests across ten desktop and five mobile routes.
- **Headers** — the full set from `next.config.ts` is present on the deployed
  origin, `X-Powered-By` is absent, and production CSP carries no
  `'unsafe-eval'`.
- **Origin** — `robots.txt` and `sitemap.xml` both emit
  `https://marsa-web.vercel.app`; zero occurrences of `localhost`.
- **Chrome, mobile** — the navigation opens at 390px with no overflow, and the
  concept-build disclosure opens on the deployed site.
- **Links** — all 27 internal links reachable from the home page resolve; none
  returns 4xx or 5xx.

One request pattern is expected and is **not** a fault: the demo's
`POST /api/demo/events` beacons are reported by Chrome as `net::ERR_ABORTED`
while the server answers them `204`. They are fired with `keepalive: true` and
`.catch(() => {})` because the response is irrelevant, and the same pair appears
on a local production build — so it is inherent to the beacon, not to the host.

The rest of this runbook is what a *credentialled* deploy needs. The repository
still has no `vercel.json` and no host-specific code; the deploy is a stock
Next.js build.

The prerequisites that need a human and cannot be done from code live in
[`PROJECT-PLAN.md` → HUMAN ACTIONS](PROJECT-PLAN.md#human-actions), each written
to be followed without further research. This document is the order to do them
in and the checks that prove it worked. It does not duplicate them.

**Target host: Vercel.** Nothing requires it. The app is a standard Next.js 15
server build with a middleware, so Netlify, Railway, Fly, or any Node host that
can run `next start` works the same way. Where a step is Vercel-specific it says
so.

---

## 0. Before you touch a host

| | Check | How |
|---|---|---|
| 1 | The gate is green on `main` | `npm run verify` — typecheck, lint, 1,871 automated checks, production build |
| 2 | The **whole** dependency tree is clean | `npm audit` → `found 0 vulnerabilities`. This was `--omit=dev` while the end-of-life ESLint 8 chain carried 13 high advisories; the ESLint 9 migration and a puppeteer-core bump removed every one, so the stricter check is the one that now holds. |
| 3 | Database migrations are applied | `npm run db:migrate -- --dry` → `0 pending`. **006 is the newest**; 005 is not optional — without it the public anon key can call a definer-rights delete. |
| 4 | The Supabase secret key has been rotated since it was last pasted anywhere | [H2](PROJECT-PLAN.md#h2--rotate-the-supabase-secret-key) |
| 5 | Branch protection is on `main` | [H11](PROJECT-PLAN.md#h11--enable-branch-protection-on-main) |

Step 3 matters more than it looks. `createStore()` **refuses to construct the
JSONL file store when `NODE_ENV=production`** and names the missing variables
instead, because a serverless filesystem is ephemeral and losing a lead silently
is the failure that rule exists to prevent. A production deploy without database
credentials does not degrade quietly — it fails loudly at first use, by design.

---

## 1. Environment variables

The app is built around **provider selection by environment**: with zero config
it runs on file storage and stderr logging; set a group and the same interfaces
switch to the real thing. That means you can deploy in stages and each stage is
coherent rather than half-broken.

Every variable, with prose explaining what it unlocks, is in
[`.env.example`](../.env.example). Grouped by what turns on:

### Required for a public deployment

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OpenGraph, JSON-LD. **Set this to the real origin.** Unset, the site emits no canonical tags and no sitemap rather than emitting wrong ones |

### Storage, admin dashboard, shared rate limiting

| Variable | Why |
|---|---|
| `SUPABASE_URL` | PostgREST endpoint |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side writes for form intake. **Bypasses row-level security — server env only, never `NEXT_PUBLIC_`** |
| `ADMIN_PASSWORD` | The single-operator boundary on `/admin` |
| `ADMIN_SESSION_SECRET` | HMAC key for the admin session cookie |

### Customer accounts (`/account`)

| Variable | Why |
|---|---|
| `SUPABASE_URL` | Same project |
| `SUPABASE_ANON_KEY` | Supabase Auth over REST, as the signed-in user |
| `AUTH_SESSION_SECRET` | HMAC key for the customer session cookie — **must differ from `ADMIN_SESSION_SECRET`** |

Accounts also need two Supabase dashboard settings that cannot be done from
code — redirect URLs and the confirmation email template. Both are in
[`AUTHENTICATION.md` → Setup](../AUTHENTICATION.md#setup) and in
[H21](PROJECT-PLAN.md#h21--switch-customer-accounts-on). Until they are done,
every auth page renders a setup panel naming exactly what is missing rather than
a form that would fail.

### Optional

| Variable | Effect if unset |
|---|---|
| `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_TO` | No notification email. Intake still stores and still succeeds — email is a side effect that never blocks it |
| `NEXT_PUBLIC_SUPPORT_EMAIL`, `_SALES_EMAIL`, `_PRESS_EMAIL` | The contact page renders no channel rather than a dead `mailto:` |
| `NEXT_PUBLIC_SOCIAL_*` | No `sameAs` in structured data. Emitting one is a machine-readable claim to own that account |
| `NEXT_PUBLIC_REGULATOR_AUTHORITY`, `_REFERENCE` | The site describes the licensed-partner model instead of asserting an authorisation. **Leave both unset** — see below |
| `FX_API_BASE` | Defaults to the key-less Frankfurter endpoint |
| `DATA_DIR` | Irrelevant in production; the file store is refused there |

> **Leave the regulator variables unset.** They exist so that a real product
> with a real register entry could switch the copy on. Setting them on this
> deployment would make the site assert an authorisation that does not exist,
> which is the one category of claim this project treats as out of bounds.

Generate the two session secrets independently:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

---

## 2. Deploy

**Vercel, from the dashboard** — no CLI needed, and it keeps the deployment
linked to the repository so every push is provenanced
([H13](PROJECT-PLAN.md#h13--deploy-time-connect-the-host-to-the-repository)):

1. **Add New → Project**, import `elkamohammad1988/marsa-web`.
2. Framework preset: **Next.js**. Build command, output directory and install
   command are all correct by default — do not override them.
3. Node version: **22.x** (`package.json` sets `engines.node >= 22`).
4. Add the environment variables from §1 to **Production**. Mark every one that
   is not `NEXT_PUBLIC_*` as sensitive.
5. Deploy.
6. Copy the assigned origin into `NEXT_PUBLIC_SITE_URL` and redeploy, so
   canonical URLs and the sitemap point at the real host rather than at nothing.
   If you attach a custom domain, do this again with the final domain.

The environment is validated at server start (`instrumentation.ts`), so a
half-configured pair — a `SUPABASE_URL` with no key, an `ADMIN_PASSWORD` with no
session secret — fails the boot loudly in production instead of degrading in
silence. If the first deploy crashes, read that error first; it names the
variable.

---

## 3. Post-deploy smoke checklist

Run against the deployed origin, in this order. Each line is a thing that has
actually broken in some deployment of some Next.js app, not a formality.

- [ ] `GET /api/health` → `200`. Check the body: `database.configured` and
      `database.ok` both `true`, and the FX check reachable. This is the single
      most informative request on the site
- [ ] `/` renders, the rate ticker shows live ECB numbers, and the
      **"Concept build — what's real?"** badge is present and opens
- [ ] `/demo` completes end to end — account → KYC → IBAN → receive → convert →
      SEPA out — and the conversion uses a live rate, not a placeholder
- [ ] `/tools/currency-converter` returns rates and its 30-day history chart draws
- [ ] `/tools/iban-checker` validates `DE89 3704 0044 0532 0130 00` and rejects a
      mutated checksum
- [ ] A marketing form (`/get-started`) still validates and still explains that it
      discards the input — it must not start silently collecting real leads
- [ ] `/register` → confirmation email arrives → link lands on `/auth/confirm`
      and signs you in. If the email never arrives, the Supabase template and
      redirect URLs are the cause ([H21](PROJECT-PLAN.md#h21--switch-customer-accounts-on))
- [ ] `/account` requires a session; signing out clears it
- [ ] `/account/admin` returns exactly one row for a normal user. **This is the
      row-level-security boundary — verify it on the deployed database, not
      locally.** The query is written as "select every profile" with no role
      filter precisely so that this check is meaningful
- [ ] `/admin` rejects a wrong password and rate-limits repeated attempts
- [ ] A 404 (`/nope`) and the error boundary both render in brand, not as a stack
      trace
- [ ] Response headers carry the CSP from `next.config.ts`, and no console error
      appears on any page
- [ ] `/sitemap.xml` and `/robots.txt` contain the real origin, not `localhost`
- [ ] Mobile at 390px: no horizontal overflow, navigation opens and traps focus

Then, once and recorded:

- [ ] Lighthouse on `/` and `/demo` from the deployed origin — the numbers in the
      README are local measurements and should be re-taken against the host
- [ ] Point an uptime monitor at `/api/health`
      ([H6](PROJECT-PLAN.md#h6--point-an-uptime-monitor-at-apihealth-p3))
- [ ] Enable point-in-time recovery on the database and test one restore
      ([H5](PROJECT-PLAN.md#h5--enable-point-in-time-recovery-and-test-one-restore-p4))

---

## 4. What deploying does not change

The demo stays a labelled sandbox. There is still no money, no ledger, no KYC
provider and no licence, and a public URL does not alter any of that — it makes
the disclosure more important, not less. Nothing in this runbook turns a concept
into a financial service, and no environment variable in `.env.example` can.

The one that comes closest is `NEXT_PUBLIC_REGULATOR_REFERENCE`. Leave it unset.
