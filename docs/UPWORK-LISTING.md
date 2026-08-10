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

Deployed from `feat/auth-foundation` with **no credentials configured at all** —
the production environment holds exactly one variable, `NEXT_PUBLIC_SITE_URL`.
That is a deliberate choice, and it decides what a visitor can and cannot reach.

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
migration and 1,530 tests are all in the public repository and run from a clean
clone. What is missing from the demo is a database, not a feature. Standing up a
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
"production ready" — which the CI badge and test count substantiate — and avoids
every word that could read as a financial service.

---

## 3. Short description / subtitle

> A complete, secure web application built in Next.js 15, TypeScript and
> Supabase — authentication, database, dashboard, live API data and a test suite
> — delivered with documentation you can hand to another developer.

---

## 4. Full description

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
>   it at all and still returns exactly one row to everyone else, because the
>   database is what decides.
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
>   build on every push. The reference build runs 1,530 tests and ships with zero
>   `any` in strict TypeScript.
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
`/pricing` page, which is fiction inside a demo and appears in image 8. If a
single line of this listing could be misread as a financial product's price
list, it is that image, which is why its caption names what it is.

| | **Starter** | **Professional** | **Premium** |
|---|---|---|---|
| **Price** | **$650** | **$1,900** | **$4,500** |
| **Delivery** | **7 days** | **14 days** | **30 days** |
| **Revisions** | **1** | **2** | **3** |
| Scope | Marketing site or single-purpose app, up to 5 pages | Full application, up to 12 screens | Full application, unlimited core screens |
| Design system | Tokenised, one theme | Tokenised, one theme | Tokenised, light + dark |
| Authentication | — | ✔ Email/password, sessions, password reset | ✔ + roles and row-level security |
| Database | — | ✔ Schema, migrations, one provider | ✔ + row-level security policies and seed data |
| Admin dashboard | — | ✔ Basic operator view | ✔ + CSV export and funnel analytics |
| Forms & backend | Contact form, validated | + durable storage and email notification | + rate limiting, health endpoint, error reporting |
| Live API integration | — | ✔ One source, server-cached | ✔ Multiple sources, cached, degrading |
| Accessibility | WCAG AA, axe report | WCAG AA, axe report | WCAG AA, axe report + keyboard walkthrough |
| SEO | Meta, OG, sitemap | + JSON-LD structured data | + per-page OG images |
| Tests | Build gate | Unit tests + CI pipeline | Unit tests + CI + integration tests |
| Documentation | README | README + deployment guide | Full docs + architecture notes |
| Deployment | Guide | Deployed for you | Deployed + handover call |
| Source code | ✔ Full ownership | ✔ Full ownership | ✔ Full ownership |

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

Eight, in this order. All are regenerated from a production build by
`npm run capture`, so they cannot drift from the application they show.

**Every image carries the "Concept build — what's real?" marker in its corner.**
That is not decoration and it is not optional: the capture script throws rather
than write an image without it, and `tests/portfolio-honesty.test.ts` fails if
that rule is ever softened. Without it, image 1 is a European IBAN, a €12,480.55
balance and an "Open An Account" button — which is a listing that looks like it
is offering banking, and a reviewer is right to stop there.

| # | File | Caption to enter in Upwork |
|---|---|---|
| 1 | `01-hero.png` | Custom dark design system — tokenised, every contrast pair verified against WCAG AA. Concept product, labelled as one on every screen |
| 2 | `02-live-rates.png` | Live third-party API data, server-cached — real European Central Bank rates with 30-day history, not placeholders |
| 3 | `03-feature-account.png` | Interactive product demo a visitor can complete end to end — clearly labelled as a sandbox |
| 4 | `04-feature-convert.png` | Real arithmetic on live data — the demo computes, it does not animate |
| 5 | `05-analytics.png` | Operator dashboard behind authentication — first-party funnel analytics, no third-party trackers |
| 6 | `06-iban-validation.png` | Working business logic, unit-tested — ISO 13616 / MOD-97 validation, fully offline |
| 7 | `07-mobile.png` | Built mobile-first — no horizontal overflow at any width, tap targets ≥ 24px |
| 8 | `08-pricing.png` | Pricing and plan-comparison screens built to the same bar as the rest of the app. These are the concept product's invented tiers, not my rates — my packages are the three above |

**Thumbnail:** `01-hero.png`. It carries the wordmark, the headline, the product
panel and the concept marker in one frame.

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
- [ ] Eight images uploaded in order, each with its caption
- [ ] Thumbnail set to `01-hero.png`, checked for legibility of the marker at
      gallery size
- [ ] Title under 80 characters and free of superlatives Upwork rejects
- [ ] No claim of client work, delivery volume, or reviews anywhere in the copy
- [ ] Repository link included and public, `npm run verify` green on `main`
- [x] **A live demo URL** — https://marsa-web.vercel.app, deployed with zero
      credentials in the production environment. See §0 for exactly what is
      reachable and what is deliberately closed
- [ ] Every number in the description re-measured within the last week
