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

Two checks, both re-run 2026-08-24, that the deployment is the build in this
repository rather than an older one. A rendered page can be argued about; a
token value cannot:

```
$ curl -s https://marsa-web.vercel.app/ \
    | grep -o '/_next/static/css/[^"]*\.css' | sort -u \
    | xargs -I{} curl -s https://marsa-web.vercel.app{} \
    | grep -o -- '--brand:[^;]*'
--brand:212 175 55                       # #D4AF37, the palette in styles/globals.css

$ curl -s https://marsa-web.vercel.app/api/health
{"status":"degraded", … storage/database/admin/notifications: configured:false, fx: configured:true}
```

The first command reads the stylesheet list off the page rather than naming a
file, and that is not verbosity. The version printed here until 2026-08-24 was
`curl … /_next/static/css/*.css`, which cannot work: the glob is expanded by
your shell against your own disk, matches nothing, and is sent to the server as
a literal `*.css` that answers 404. So the one check this section offered a
buyer was a command that returned nothing on every machine — worse than no
check, because it invites them to conclude the claim is false. The build also
emits **two** stylesheets and the token is only in one of them, so a command
that names a single file is a coin toss even when the path is right.

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
migration and 1,871 automated checks are all in the repository and run from a
clean clone — `https://github.com/elkamohammad1988/marsa-web`, public and
answering 200 to a signed-out request, re-verified 2026-08-24. What is missing
from the demo is a database, not a feature. Standing up a live account system
for a concept nobody can sign up to would mean holding real email addresses for
a product that does not exist.

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
service. What substantiates that claim, all of it re-checked 2026-08-24: the
test count and the production build are re-measurable from a clone, and the CI
badge on the README now renders **green** against the commit that is actually
pushed — `badge.svg` returns `CI - passing`, and the newest run of `ci.yml` is
`success` on `main`. That badge was worth nothing while the repository was
private, because it rendered broken rather than green to anyone signed out; the
repository has been public since 2026-08-23 and it no longer is.

---

## 3. Short description / subtitle

> A complete, secure web application built in Next.js 15, TypeScript and
> Supabase — authentication, database, dashboard, live API data and a test suite
> — delivered with documentation you can hand to another developer.

---

## 4. Full description

✅ **Clear to publish.** This section's second paragraph tells the buyer the
reference project is **public** and invites them to read every line — the
offer's central proof, and the one sentence a buyer can most easily disprove if
it is wrong. It held a "do not publish" warning until 2026-08-24 because the
repository answered 404 to a signed-out visitor. It no longer does:
`https://github.com/elkamohammad1988/marsa-web` reports `"visibility":
"public"` and returns 200 signed out, re-verified 2026-08-24.

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
>   build on every push. The reference build runs **1,871 automated checks** —
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

**Upload the nine files in `upwork-catalog/`, in this order**, with the video
first if the listing type accepts one. Regenerate them with
`npm run capture:catalog`.

> **This is not the `portfolio-screenshots/` set, and the difference matters.**
> That set is the seven images `README.md` embeds, photographed by
> `npm run capture` for a reader who is already inside the repository. This one
> is photographed by `npm run capture:catalog` for a buyer who has never seen
> it, and the two answer different questions — which is why this section listed
> the wrong files until 2026-08-24 and would have had you upload the README's
> gallery under captions written for a different set. Do not mix them.

> ✅ **The nine files on disk are current, and their provenance is checkable.**
> Regenerated 2026-08-27 against the deployed design (which shipped in
> `6426a33`), so the gallery and https://marsa-web.vercel.app show the same
> thing: the glowing coin gone from every closing CTA, the halo gone from under
> every figure, the mesh-and-grain backdrop gone from behind every illustration,
> the metallic logo tile flattened, the last icon tiles removed, the pricing page
> rebuilt as a three-across comparison and the comparison table rebuilt as a real
> `<table>`.
>
> **Eight frames come from the deployed origin; frame 05 does not.** The
> operator dashboard is behind a password the credential-free deployment does
> not hold, so it is photographed from a local production build. That is a real
> limitation of the set, not a detail — say so in the listing.
>
> **How that is verified rather than asserted.** `npm run capture:catalog`
> writes `upwork-catalog/provenance.json` alongside the images: for each frame,
> the URL `page.url()` reported at the moment of capture, plus its SHA-256. The
> images themselves carry nothing — `sharp` re-encodes each PNG and drops
> metadata — and two pages rendered from the same commit are pixel-identical
> whether they came from Vercel or from `next start`, so comparing images can
> never settle where one came from. Re-check the set at any time with the
> `verify` command recorded inside that file; it reports `ok` or `CHANGED` per
> frame next to the URL it came from.
>
> The rule that produced the previous warning still stands and is the reason
> this set is captured last: **deploy first, then run
> `npm run capture:catalog`, then upload.**

Eight are photographed from the **deployed origin** and the ninth from a local
production build of the same commit (frame 05, above) rather than mocked up — but they are only as current as the last run, and
treating that as "cannot drift" is how a set went stale once already: the UI
cleanup of 2026-08-22 removed decoration that images taken two days earlier
still showed, including the thumbnail. **Re-run `npm run capture:catalog`
immediately before uploading**, and compare image 1 against the live site with
your own eyes.

**Where each frame is photographed from.** Eight come from
**https://marsa-web.vercel.app** itself, deliberately: a listing image that a
buyer cannot reproduce by visiting the URL in the listing is worth nothing.
`05-operator-dashboard.png` is the one exception and it is worth stating rather
than leaving to be assumed — the deployment holds no credentials at all, so its
operator area is a closed door and its funnel would be empty. That frame is
captured from a local production build of the same commit, against a configured
database, which is exactly the disclosure `README.md` already makes about
`05-analytics.png`. Run it as:

```bash
npm run build && npx next start -p 3100     # a local build with .env.local
CATALOG_ADMIN_ORIGIN=http://localhost:3100 npm run capture:catalog
```

Without that, the frame is **skipped with the reason printed** — never written
as a photograph of a login box.

**Every image carries the "Concept build — what's real?" marker.** That is not
decoration and it is not optional: both capture scripts throw rather than write
an image without it, and `tests/portfolio-honesty.test.ts` fails if that rule is
ever softened in either of them. Without it, image 1 is a European IBAN, a
€12,480.55 balance and an "Open An Account" button — which is a listing that
looks like it is offering banking, and a reviewer is right to stop there.

| # | File | Caption to enter in Upwork |
|---|---|---|
| 1 | `01-hero.png` | Custom dark design system — tokenised, every contrast pair verified against WCAG AA. Concept product, labelled as one on every screen |
| 2 | `02-interactive-demo.png` | Interactive product demo a visitor can complete end to end — real arithmetic on a live rate, clearly labelled as a sandbox |
| 3 | `03-currency-converter.png` | Live third-party API data, server-cached — real European Central Bank rates with 30-day history, not placeholders |
| 4 | `04-iban-checker.png` | Working business logic, unit-tested — ISO 13616 / MOD-97 validation, fully offline |
| 5 | `05-operator-dashboard.png` | Operator dashboard behind authentication — first-party funnel analytics, no cookies and no third-party trackers |
| 6 | `06-get-started.png` | Onboarding built against the real validation rules — and honest on screen about what it does with what you type |
| 7 | `07-about-engineering.png` | Every figure computed from the module that implements it, so the page cannot drift from the code |
| 8 | `08-mobile.png` | The same flow on a phone — not a reflowed landing page, the demo mid-conversion at 390 px |
| 9 | `09-contact.png` | Shared client/server validation, and a form that says plainly it keeps nothing |

**Why frame 5 exists, and why the set was wrong without it.** The listing sells
authentication, a permission model and an operator dashboard as headline
deliverables in §4, and prices them into Professional and Premium in §5. The
eight-frame set that preceded this one showed **none of them**: six of its eight
frames were public marketing pages, and a gallery skimmed in ten seconds was
arguing for a smaller job than the one being offered — a landing page, which §1
is explicit about not selling. One frame of the application behind the password
is what makes the category claim legible.

It is safe to publish for the same reason `README.md` gives: it is the *funnel*
view, which is anonymous by construction. **`/admin` itself — the submissions
table — is deliberately never captured on either origin**, because it renders
whatever the contact form has collected, which on any machine that has used it
means a real name and a real email address in an image intended for a public
listing.

`capture-catalog.mjs` also refuses to write frame 5 when the funnel is not
coherent. Analytics gathered from scratch runs can produce
`Verified (KYC) · 116.7%` — more sessions at the second step than the first,
because that store holds sessions whose `start` beacon never arrived while their
later steps did. The arithmetic is right and the dashboard is right to render it,
because an operator can see the data is odd. A listing image has no operator and
no next page, so the same honest row reads as a product that cannot count. Fix
it by capturing against a database with coherent traffic — **never** by editing
the store until it flatters the picture.

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
carry, and "the hero reflows" is not it. `08-mobile.png` in this set is the demo
mid-conversion at 390 px for that reason.

**Thumbnail:** `01-hero.png`. It carries the wordmark, the headline, the product
panel and the concept marker in one frame.

**Video** (`portfolio-video/marsa-demo.mp4`, regenerate with `npm run record`):
a driven walk through the production build — hero, live ECB rate, IBAN check,
the demo sandbox end to end, onboarding, then the phone. Upload it wherever the
listing type allows a video, because the strongest thing in this project is a
*flow*, and a flow is the one thing a still cannot carry.

It is **three takes joined by ffmpeg**, not one continuous recording, and the
split is forced rather than stylistic: the phone scene is recorded at a real
390 px viewport, a screencast cannot change frame size partway through, and
`frame-ancestors 'none'` means the site cannot be put in an iframe of itself to
fake it. Each take opens and closes on black so the joins read as fades. Say
"recorded from the running build", not "one continuous take" — the second is the
kind of small untrue thing this project keeps finding in its own copy.

**Neither `upwork-catalog/` nor `portfolio-video/` is tracked in git**, and that
is deliberate: both are upload artefacts for a listing that lives on another
site, and committing them would put near-duplicate images in the history of a
public repository forever. `README.md` embeds the `portfolio-screenshots/` seven,
so the repository has to carry *those*. Regenerate before uploading; do not go
looking for them in a fresh clone.

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
- [x] Every image carries the concept marker (enforced by `requireDisclosure()`
      in **both** capture scripts, and by `tests/portfolio-honesty.test.ts`,
      which now runs its assertions against both rather than only `capture.mjs`)
- [x] **The gallery shows the application, not only the marketing site.**
      `05-operator-dashboard.png` was added 2026-08-24 because the set before it
      had six public pages out of eight and no frame of anything behind a
      password — a gallery arguing for a landing-page job while §4 and §5 sell
      authentication, a permission model and an operator dashboard
- [ ] **Nine** images uploaded in order from `upwork-catalog/`, each with its
      caption from §6 — not the seven in `portfolio-screenshots/`, which are the
      README's gallery and carry captions written for a different audience
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
- [x] **The CI badge renders green to a signed-out visitor.** Re-checked
      2026-08-24: `ci.yml/badge.svg` returns `CI - passing`, and the newest run
      of the workflow is `success` against the commit at the head of `main`. It
      is the first thing a buyer who follows the repository link sees, and while
      the repository was private it rendered *broken* — which reads as a failing
      build rather than as a permissions error.
- [x] `npm run verify` green on `main` **from the commit that is actually
      pushed**. The working tree used to run ahead of `main` by a large margin,
      which made every number below unverifiable by the one route a buyer takes
      — cloning `main` — and closing that gap was the point of the 2026-08-24
      pass.
- [x] **A live demo URL** — https://marsa-web.vercel.app, deployed with zero
      credentials in the production environment. See §0 for exactly what is
      reachable and what is deliberately closed
- [x] Every number in the description re-measured. **Measured 2026-08-26 on the
      commit that is pushed** (`6426a33`, the head of `main` and the commit the
      production deployment was built from):
      - `npm test` — **1,871 passing across 52 files**, green. The figure has
        moved five times and every move is worth recording, because the first is
        the one the gate cannot see. It read 1,886 until an unused icon export
        was removed along with the invented company page that was its last
        caller, which took it to 1,885. It then moved to 1,889 on 2026-08-24
        when `tests/portfolio-honesty.test.ts` began running its four disclosure
        assertions against **both** capture scripts instead of only
        `capture.mjs` — four more assertions, no change to the site. It moved
        to 1,891 later the same day with the two `tests/seo.test.ts` cases that
        pin the default share card (§0), for the same reason: an assertion
        added, nothing about the product changed.

        It then went **down** for the first time, to 1,878 on 2026-08-25, and a
        falling test count is worth more scrutiny than a rising one. The design
        pass deleted `components/ui/PointerGlow.tsx` — the pointer-tracking
        spotlight on cards — and `tests/pointer-glow.test.ts` went with it: 13
        assertions about the performance and accessibility of an effect that no
        longer exists. No assertion about the *product* was weakened, and the
        file count fell 53 → 52 for the same reason. Every claim site was
        re-measured and updated in the same pass.

        It fell again on 2026-08-26, to **1,871**, and the seven are individually
        accountable. Five of them are one deleted component counted once per
        gate: `components/ui/FeatureIcon.tsx` — the gradient icon tile — lost its
        last caller when `/company/about` set its four build rules as a numbered
        sequence instead of four cards, and five suites here enumerate every file
        under `app/` and `components/` and assert one case per file
        (`dead-code`, `forms-collect-nothing`, `heading-scale`,
        `nested-anchors`, `scroll-regions`). Delete a file and each of them has
        one fewer case to run; none of them lost an assertion about behaviour.

        The other two are in `tests/art.test.ts`, which runs one case per
        illustration the site can render. There were six; `coin` and `coin-warm`
        — the brand mark drawn as a glowing disc inside a blurred orb with two
        halo rings — went with the effect they were made of, so there are four.
        The suite's own count assertion moved 6 → 4 with them, which is the
        correct direction for a gate that reads *"every slot the site can render
        has a description"*: a slot that no longer exists has nothing to
        describe. No file count changed; the suite is still 52 files.

        Note what that gate does and does not do: it asserts every artefact
        quotes the *same* number, not that the number is *right* — a run cannot
        count itself before it finishes. So all five sites agreeing on a stale
        figure is green. Re-measure with `npx vitest run` after any change that
        adds or removes assertions, this file included.
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
