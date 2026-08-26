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
| Verified against | the deployment built from `781c92c`, promoted 2026-08-26. Later commits on `main` are documentation and test-harness only — no application code — so the running output is unchanged from `6426a33` |
| Environment | **exactly one variable set** — `NEXT_PUBLIC_SITE_URL` |
| CI | see the note below |

A note on reading the table above: the hash of the commit that *records* a
deployment can never be the hash of the commit that *was* deployed, because
writing it down comes second. So this names the commit the design shipped in and
the commit the verification below was run against, rather than pretending to
name a moving head.

### CI on these commits, and the flake that turned out not to be one

`ci.yml` runs two required jobs in parallel. `Verify` (typecheck, lint, 1,871
tests, production build, `npm audit`) was green on every commit in this series.
**`Browser smoke` failed twice**, both times on commits whose entire diff was
Markdown — and both times the application bytes were identical to a commit that
had passed the same job minutes earlier, so the change was never the cause.

The first write-up here called it a loaded runner hitting `timeout-minutes: 20`.
**That was wrong, and it was wrong because it was written from a plausible story
rather than from the timings.** The step durations say something much more
specific:

| commit | `Browser smoke` step | result |
|---|---|---|
| `3984719` | 140s | pass |
| `6426a33` | 136s | pass |
| `781c92c` | 137s | pass |
| `3f673b9` | **273s** | **fail** |
| `8a5de8d` | 144s | pass |
| `11710e7` | **264s** | **fail** |

A healthy run is 136–144s and a failing one is 264–273s. Nothing was near the
20-minute cap; the delta is ~125s, which is one test burning
`testTimeout: 120_000`. And exactly two tests in the suite carry a 120s
budget — *"the calculator requests a rate on mount and again when the pair
changes"* and *"the converter loads history and renders a converted amount"*.

Those are the two that wait on an exchange rate arriving, and until now the
harness let them reach the real provider: `lib/fx.ts` falls back to
`https://api.frankfurter.dev/v1` when `FX_API_BASE` is unset, and
`tests/smoke/harness/server.ts` blanked every credential but never set that one.
So the browser gate depended on a free, key-less, rate-limited third party being
prompt from a GitHub runner. One of those tests also asserts
`rateCalls.every(c => c.startsWith("200"))`, which a 429 fails outright.

**Fixed** by `tests/smoke/harness/fx-stub.ts`, in the same idiom as the
PostgREST stub next to it: an in-process server speaking the upstream's wire
format, wired in by `startApp` so no smoke file has to remember it. Nothing is
weakened — every assertion those tests make is about *this* application (does it
fetch on mount, re-fetch on change, succeed, and render), `lib/fx.ts` still runs
in full over a real `fetch` parsing a real body, and `tests/fx.test.ts` still
owns the arithmetic. Verified in the path rather than assumed: with the stub
wired, `/api/rates?from=EUR&to=JPY` through the harness returns the stub's
`171.42` while the live provider was returning `185.7`.

The gate keeps its budget. What changed is that a red `Browser smoke` now means
the application is broken, rather than that somebody else's API was busy — and
a gate people re-run by reflex has stopped being a gate.

Confirmed on the commit that landed the stub: both jobs green, `Browser smoke`
in **142s** — inside the 136-144s healthy band, with the variance source gone.

Live rates are still verified where the claim is actually made: against the
deployed origin, by hand, in the section above.

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
