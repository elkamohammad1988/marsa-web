# Upwork Project Catalog — listing copy

Everything needed to publish this work as a Project Catalog listing, in the
order Upwork asks for it. Copy is written to be pasted.

**One rule for every line below.** Marsa is a self-directed portfolio build, not
client work. It has no company, no licence, and no customers, and the listing
must never imply otherwise — no "trusted by", no invented client logos, no
delivery counts, no review counts. Everything here is either a description of
what you will build for a buyer, or a checkable statement about this
repository. That constraint is also the strongest thing the listing has: almost
nobody in this category can show a public repo where the claims are verifiable,
and this one can.

**The second rule, and the one that decides approval.** The listing sells
*application development*. It does not sell a financial product, and it must not
read as though the seller operates one. Upwork reviewers reject listings that
appear to offer regulated financial services, and a reviewer who sees a European
IBAN and a €12,480 balance with no context reasonably wonders which one this is.
Every image now carries the concept-build marker for that reason, and the
description says what Marsa is in its second sentence rather than in a footnote.

---

## 0. Live demo

**https://marsa-web.vercel.app**

Deployed from `main` with **no credentials configured at all** — the production
environment holds exactly one variable, `NEXT_PUBLIC_SITE_URL`. That is a
deliberate choice, and it decides what a visitor can and cannot reach.

Two checks, both re-run 2026-08-22, that the deployment is the build in this
repository rather than an older one. A rendered page can be argued about; a
token value cannot:

```
$ curl -s https://marsa-web.vercel.app/_next/static/css/*.css | grep -o -- "--brand:[^;]*"
--brand:212 175 55                       # #D4AF37, the palette in styles/globals.css
$ curl -s https://marsa-web.vercel.app/api/health
{"status":"degraded", … storage/database/admin/notifications: configured:false, fx: configured:true}
```

**Live and working:** the whole marketing site, the `/demo` sandbox end to end,
live ECB rates in the converter and the demo's conversion step, ISO 13616 IBAN
validation, the 404 and error boundaries, the sitemap and structured data, and
the concept-build disclosure on every page.

**Deliberately closed:** `/account` and `/admin` both redirect — customer
accounts need `SUPABASE_ANON_KEY` and `AUTH_SESSION_SECRET`, and the operator
dashboard needs `ADMIN_PASSWORD`. None are set, so those areas are shut rather
than half-working. `/api/health` reports `degraded` for the same reason: storage
is unconfigured, and the app refuses the file-store fallback in production
instead of pretending a lead was saved.

**If a buyer asks why auth is not clickable:** the code, the row-level-security
migration and 1,885 automated checks are all in the repository and run from a
clean clone. **This answer only holds once the repository is public — it is 404
to a signed-out visitor today, and giving it before then hands the buyer a link
that proves nothing (§9).** What is missing from the demo is a database, not a feature. Standing up a
live account system for a concept nobody can sign up to would mean holding real
email addresses for a product that does not exist.

---

## 1. Category

**Web, Mobile & Software Dev → Full Stack Development.**

Secondary fits, in order: *Web Application Development*, *MVP Development*,
*Custom Software Development*.

Not *Landing Pages* — an earlier draft of this file chose it, and it undersells
the work and mis-sets buyer expectations. The deliverable includes
authentication, a database with row-level security, an operator dashboard, a
form-intake pipeline and a test suite. A buyer arriving from Landing Pages wants
a page and a price, and will find both wrong.

Do **not** file it under any finance, banking, or fintech *product* category. The
service is engineering; fintech is the domain it happens to be demonstrated in.

---

## 2. Title

Upwork prefixes the title with "I will" and caps it at 80 characters.

**Primary (76 chars):**

> build a production ready full stack web app in Next.js, TypeScript and Supabase

**Alternates**, if the primary is taken or you want to test positioning:

| Title | Chars | Leads with |
|---|---|---|
| build your SaaS or fintech style web app with auth, dashboard and live data | 74 | Vertical fit |
| develop a full stack Next.js application with authentication and admin panel | 76 | Feature clarity |
| build a secure full stack web application with tests, CI and documentation | 73 | Engineering rigour |

Why the primary wins: it names the stack a buyer searches for, claims
"production ready", and avoids every word that could read as a financial
service. Note what currently substantiates that claim and what does not: the
test count and the production build are real and re-measurable from a clone, but
**the CI badge proves nothing to a buyer while the repository is private** — it
renders broken, not green. Until the repository is public, the phrase rests on
the test suite alone.

---

## 3. Short description / subtitle

> A complete, secure web application built in Next.js 15, TypeScript and
> Supabase — authentication, database, dashboard, live API data and a test suite
> — delivered with documentation you can hand to another developer.

---

## 4. Full description

> ⚠ **Do not publish this section yet.** Its second paragraph tells the buyer
> the reference project is **public** and invites them to read every line. That
> is the offer's central proof and it is **false today** — re-verified
> 2026-08-22, a signed-out request to the repository returns 404. Flip the
> repository to public first; publishing before that turns the strongest
> sentence in the listing into the one a buyer can most easily disprove.

> **Most "full stack" deliveries are a front end with a database bolted on.**
>
> They work in the demo, then the first real user finds that any signed-in
> account can read any other account's rows, the forms silently drop
> submissions when the host restarts, nothing is tested, and the handover is a
> zip file and good luck.
>
> I build the other kind, and I can prove it before you spend anything: the
> reference project on this listing is **public, complete, and reproducible**.
> You can read every line, run the test suite, and re-measure every number I
> quote.
>
> **What you get**
>
> - **Real authentication and a real permission model.** Sign-up, email
>   confirmation, sign-in, password reset, sessions with silent token renewal,
>   and roles enforced in the database by row-level security — not by an `if`
>   statement in a route handler that the next developer forgets to copy. In the
>   reference build, the admin's "list all accounts" query has no role filter in
>   it at all, because the database is what decides. Stated precisely: those
>   policies are written and unit-tested against a stubbed Postgres, and have not
>   been applied to a live database — the reference demo deliberately runs
>   without one, and I would rather tell you that than let a screenshot imply it.
> - **A backend that does not lose things.** Validation shared between client and
>   server, rate limiting that works across instances, durable storage, email
>   notification as a side effect that can never block an intake, a health
>   endpoint, and structured error reporting for every failure the system absorbs.
> - **An operator dashboard.** The admin side buyers forget to specify and need
>   in week two — submissions, CSV export, and first-party funnel analytics with
>   no third-party trackers.
> - **A custom design system, not a template.** Colour, type, spacing and motion
>   driven by tokens, so the product re-themes from one file and stays coherent
>   as it grows. Every contrast pair verified against WCAG AA.
> - **Real data where it matters.** If your product depends on live numbers, the
>   app reads real ones, server-cached and degrading gracefully, instead of
>   invented figures that date the moment they ship.
> - **A test suite and a CI gate.** Typecheck, lint, unit tests and a production
>   build on every push. The reference build runs **1,885 automated checks** —
>   unit tests for business logic and security boundaries, property tests that
>   recompute accessibility contrast from the design tokens, and
>   repository-integrity checks — and ships with zero `any` in strict
>   TypeScript. A **second suite of 139 checks drives a real Chrome against a
>   production build**: every public route, the sign-in and erasure flows in the
>   operator dashboard, keyboard operation of the menus and the accordion, the
>   phone layout at 320px, and an axe-core pass over 74 page states. Both run as
>   required CI jobs. What it does not have is a component-level DOM suite, and
>   I will say so before you ask.
> - **Documentation written for the developer after me.** How to run it, how to
>   deploy it, what every environment variable turns on, and comments that record
>   *why* rather than *what*.
>
> **How I work**
>
> You send your product, your users, and whatever brand you already have. I come
> back with a design direction and a data model first, then build against them in
> the open, on a preview URL you can watch change. You review at the design step
> and again before launch. You own the code and the accounts throughout.
>
> **About the example project**
>
> The screenshots show *Marsa*, a fintech-inspired application I built to
> demonstrate this work end to end. It is a concept — **not a bank, not a
> licensed service, and it holds no money.** Every screen says so on the screen
> itself, which is the point: I would rather show you a demo that is honest about
> being a demo than a mock-up that implies a product nobody can sign up to. Your
> project would be your product, with your real content.
>
> Message me with what you are building and I will tell you honestly whether this
> is the right shape of work for it — including when it is not.

---

## 5. Development packages

These are the three tiers a buyer purchases: **development work, priced in
dollars, delivered as source code.** They are not connected to — and must never
be confused with — the euro subscription tiers on the concept product's own
`/pricing` page, which is fiction inside a demo. That page is deliberately
**not** in the gallery: `08-pricing.png` was dropped for exactly this reason
(§6), because a thumbnail reading "€4.99 a month" is the single image in this
listing that could be misread as a financial product's price list. The only
prices a buyer should encounter here are the dollar figures below.

| | **Starter** | **Professional** | **Premium** |
|---|---|---|---|
| **Price** | **$650** | **$1,900** | **$4,500** |
| **Delivery** | **7 days** | **14 days** | **30 days** |
| **Revisions** | **1** | **2** | **3** |
| Scope | Marketing site or single-purpose app, up to 5 pages | Full application, up to 12 screens | Full application, unlimited core screens |
| Design system | Tokenised, one theme | Tokenised, one theme | Tokenised, light + dark † |
| Authentication | — | ✔ Email/password, sessions, password reset | ✔ + roles and row-level security |
| Database | — | ✔ Schema, migrations, one provider | ✔ + row-level security policies and seed data |
| Admin dashboard | — | ✔ Basic operator view | ✔ + CSV export and funnel analytics |
| Forms & backend | Contact form, validated | + durable storage and email notification | + rate limiting, health endpoint, error reporting |
| Live API integration | — | ✔ One source, server-cached | ✔ Multiple sources, cached, degrading † |
| Accessibility | WCAG AA, axe report | WCAG AA, axe report | WCAG AA, axe report + keyboard walkthrough |
| SEO | Meta, OG, sitemap | + JSON-LD structured data | + per-page OG images |
| Tests | Build gate | Unit tests + CI pipeline | Unit tests + CI + integration tests |
| Documentation | README | README + deployment guide | Full docs + architecture notes |
| Deployment | Guide | Deployed for you | Deployed + handover call |
| Source code | ✔ Full ownership | ✔ Full ownership | ✔ Full ownership |

† **The two rows the reference build does not demonstrate.** Everything else in
the Premium column exists in this repository and can be checked before you buy.
These two are scope, not evidence, and the difference is worth stating exactly:

- **Light + dark.** Marsa is deliberately dark-only. `styles/globals.css` holds
  one palette; the `.dark` block that used to mirror it was deleted because it
  could only ever set a colour to the value it already had, and
  `tests/contrast.test.ts` now forbids `dark:` variants outright. What is proven
  here is the *tokenised* half — every colour is a role-named custom property,
  which is the substrate a second palette is written against. The second palette
  itself would be written for you; it is not sitting in this repo waiting.
- **Multiple FX sources.** `lib/fx.ts` reads exactly one provider (Frankfurter,
  serving ECB reference rates). The *cached* and *degrading* halves are real and
  visible in the demo — an hour-long fetch cache, and a converter that reports a
  stale rate rather than leaking an upstream error string. A second provider
  with failover between them is not written.

**Deliverables, stated plainly (all tiers):** a private Git repository you own
from commit one, the full source, a README that runs the project from a clean
clone, and no dependency on me to keep it running.

**Add-ons worth listing separately:** extra screen or page; additional language
(i18n); payment provider integration (Stripe); custom illustration set; content
migration; a month of post-launch support.

**On the prices.** They are deliberately below what this scope fetches from an
agency and above what a template assembler charges, because the first listing's
job is to earn reviews, not margin. Raise them after five completed contracts —
the Premium tier in particular is priced at roughly half of what 30 days of this
work is worth.

---

## 6. Images

Seven, in this order, with the video first if the listing type accepts one. All
are photographed from a production build by `npm run capture` rather than mocked
up — but they are only as current as the last run, and treating that as "cannot
drift" is how this set went stale once already: the UI cleanup of 2026-08-22
removed decoration that images taken two days earlier still showed, including
the thumbnail. **Re-run `npm run capture` immediately before uploading**, and
compare image 1 against the live site with your own eyes.

Images 1, 2, 3, 4, 6 and 7 were regenerated 2026-08-22 and match the current
build. `05-analytics.png` is the exception and is still the 2026-08-20 capture:
re-shooting it without a database renders the funnel from the local JSONL
fallback, whose sessions produce a `Verified (KYC) · 116.7%` row — a real number
from scratch data that reads as a broken dashboard. It differs from the current
build by one `←` glyph on a button. Do not hand-edit the data file to make it
look better; capture it against a database with coherent demo traffic, or leave
it as it is.

**Every image carries the "Concept build — what's real?" marker.** That is not
decoration and it is not optional: the capture script throws rather than write an
image without it, and `tests/portfolio-honesty.test.ts` fails if that rule is
ever softened. Without it, image 1 is a European IBAN, a €12,480.55 balance and
an "Open An Account" button — which is a listing that looks like it is offering
banking, and a reviewer is right to stop there.

| # | File | Caption to enter in Upwork |
|---|---|---|
| 1 | `01-hero.png` | Custom dark design system — tokenised, every contrast pair verified against WCAG AA. Concept product, labelled as one on every screen |
| 2 | `02-live-rates.png` | Live third-party API data, server-cached — real European Central Bank rates with 30-day history, not placeholders |
| 3 | `03-feature-account.png` | Interactive product demo a visitor can complete end to end — clearly labelled as a sandbox |
| 4 | `04-feature-convert.png` | Real arithmetic on live data — the demo computes, it does not animate |
| 5 | `05-analytics.png` | Operator dashboard behind authentication — first-party funnel analytics on the demo sandbox, no third-party trackers |
| 6 | `06-iban-validation.png` | Working business logic, unit-tested — ISO 13616 / MOD-97 validation, fully offline |
| 7 | `07-mobile.png` | The same flow on a phone — not a reflowed landing page, the demo mid-conversion at 390 px |

**Two images were dropped, and the reasoning is worth keeping** in case either is
ever proposed again.

`08-pricing.png` showed the concept product's own subscription tiers. The page is
built to the same bar as the rest of the app, which is the argument that kept it,
and it is not what the image communicates to a reviewer: it communicates €4.99 a
month for a financial product. The caption defending it had grown longer than the
caption describing it, and an image that needs a disclaimer to be safe is doing
negative work in a gallery skimmed in ten seconds.

The old `07-mobile.png` was the landing page at 390 px — image 1, narrower. A
portfolio slot has to earn its place with information the previous image did not
carry, and "the hero reflows" is not it.

**Thumbnail:** `01-hero.png`. It carries the wordmark, the headline, the product
panel and the concept marker in one frame.

**Video** (`portfolio-video/marsa-demo.mp4`, regenerate with `npm run record`):
one continuous take of the production build — hero, live ECB rate, the demo end
to end. Upload it wherever the listing type allows a video, because the strongest
thing in this project is a *flow*, and a flow is the one thing a still cannot
carry. It is gitignored: the repository has to carry the PNGs because README.md
embeds them, and nothing here loads the video.

**Before uploading, check each one for:** a real name or email address (there is
none in this set — `/admin`'s submissions view is deliberately never captured for
exactly this reason), browser chrome, a cut-off line of text, and the concept
marker actually being visible at thumbnail size.

---

## 7. FAQ

**Is this a real bank or financial product?**
No. Marsa is a concept application I built to demonstrate full-stack work — it
holds no money, moves none, has no licence and has no customers. Every screen
carries that disclosure, including the screenshots on this listing. What is real
is the engineering: the authentication, the database permissions, the live API
integration, and the tests. I build applications; fintech is one domain I have
built one in.

**Do I own the code?**
Yes. Full source, full rights, in your repository from the first commit, no
licence fees and no dependency on me to run it.

**What stack do you use?**
Next.js 15 (App Router), React 19, TypeScript in strict mode, Tailwind CSS, and
Postgres via Supabase. Deploys to Vercel, Netlify, or any Node host. I keep
runtime dependencies to a minimum — the reference build ships four.

**Will it be fast, and accessible?**
I will show you the measurement rather than assert it. On the reference build
Lighthouse returns Accessibility 100, Best Practices 100, SEO 100 and a CLS of 0.
Performance reaches 100 on an idle machine but moves with machine load — three
consecutive runs of the same build scored 87, 95 and 100, and I quote both
because quoting only the good one is how these numbers lose their meaning. On
accessibility: automated axe-core runs across every route at two viewport widths
against WCAG 2.0, 2.1 and 2.2 at A and AA currently return zero violations. The
honest limit of that is that automated rules catch a minority of WCAG and a crawl
does not open menus or submit invalid forms — it means no machine-detectable
failure, not a certified audit.

**How do I know the code is actually good?**
Read it. The reference project is public, including its test suite and the
scripts that produce its measurements. Clone it and run `npm run verify`.
*(Gated on the same blocker as §4 — do not publish this answer while the
repository still answers 404 to a signed-out visitor. See §9.)*

**Can you work with my existing brand or Figma files?**
Yes, either. If your brand colours conflict with accessibility requirements I
will tell you and propose a resolution that keeps both, rather than silently
failing one.

**What do you need from me to start?**
What the product does, who it is for, what a user should be able to do, and any
brand assets you have. If there is an external API involved, its docs or
credentials.

**What is not included?**
Anything requiring a licence or a regulated partner — real payments, KYC
providers, money movement. I build the application around them and integrate a
provider you hold the relationship with. I will say so up front rather than
discover it in week three.

---

## 8. Search tags

`full stack development` · `nextjs` · `react` · `typescript` · `supabase` ·
`web application` · `saas` · `authentication` · `postgresql` · `api integration`

---

## 9. Pre-publish checklist

- [x] Three tier prices and delivery times set
- [x] Category set to Full Stack Development, **not** any finance category
- [x] Every image carries the concept marker (enforced by `requireDisclosure()`)
- [ ] Seven images uploaded in order, each with its caption
- [ ] Video uploaded if the listing type accepts one
- [ ] Thumbnail set to `01-hero.png`, checked for legibility of the marker at
      gallery size
- [ ] Title under 80 characters and free of superlatives Upwork rejects
- [ ] No claim of client work, delivery volume, or reviews anywhere in the copy
- [x] **The repository is public.** `https://github.com/elkamohammad1988/marsa-web`
      answers 200 to a signed-out request. This is the listing's central claim —
      *read every line, run the test suite, and re-measure every number I quote*
      — and it does not work at all while the repo is private, which it was
      until 2026-08-23. Secret hygiene was checked before publishing and is
      clean: `.env.local` is ignored, no `.data/*.jsonl` is tracked, and the
      only env file in git is `.env.example`.
- [x] `npm run verify` green on `main` **from the commit that is actually
      pushed**. The working tree used to run ahead of `main` by a large margin,
      which made every number below unverifiable by the one route a buyer takes
      — cloning `main` — and closing that gap was the point of the 2026-08-24
      pass.
- [x] **A live demo URL** — https://marsa-web.vercel.app, deployed with zero
      credentials in the production environment. See §0 for exactly what is
      reachable and what is deliberately closed
- [x] Every number in the description re-measured. **Measured 2026-08-24 on the
      commit that is pushed**:
      - `npm test` — **1,885 passing across 53 files**, green. The docs carried
        1,886, which was correct when taken and drifted by one when an unused
        icon export was removed along with the invented company page that was
        its last caller. Every claim site now reads 1,885, and
        `tests/portfolio-honesty.test.ts` fails if they ever disagree again.
      - `npm run test:smoke` — **139 checks across 3 files, 139 passed**, green.
        Two failures were found and fixed rather than re-run until green. The
        axe pass was reporting a colour-contrast violation on the FAQ triggers,
        which was the scan landing mid-reveal — the rows transition opacity from
        zero and axe folds an ancestor's opacity into its contrast maths; the
        harness now waits for every finite animation to finish before it
        measures. The admin empty-state assertion was reading `innerText` while
        `app/admin/loading.tsx` was still on screen; it now waits for the
        heading, which the fallback does not render. Both were races in the
        harness rather than defects in the site, and both are now conditions
        rather than hopes.
      - `tests/smoke/accessibility.smoke.ts` is **tracked**, which it was not
        before: it ran for months as a gitignored script at the repository root,
        so the one figure this listing offers for checking was the one figure a
        reader could not check. **74 scans, 0 violations** — every public route
        at 390px and 1280px, six interactive states, and the operator dashboard
        at both widths.
