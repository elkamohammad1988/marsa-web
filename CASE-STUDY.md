# Case Study — Marsa

A production-grade marketing site, lead-capture backend, and interactive product
demo for a cross-border multi-currency account concept — designed, built, and
verified to a portfolio bar.

## The problem

Cross-border sellers and freelancers (the beachhead: MENA merchants paid by
Amazon, Stripe, and EU clients) juggle two or three banking apps, lose a slice
of every payout to FX markups, and wait days for money to move. A landing page
for a product like this has to do three hard things at once:

1. **Feel real and trustworthy** on the first scroll — fintech buyers and
   investors are unforgiving of anything that looks templated or fake.
2. **Prove the product** without the product existing yet.
3. **Capture demand** and measure it, first-party.

Most marketing sites fake #2 with static mockups and skip #3. The bar here was
higher: no fake numbers, real accessibility, and honest labelling of what is a
sandbox.

## The solution

- A **dark-only "Black Rose" design system** — metallic magenta on near-black —
  implemented purely through CSS-variable tokens, so the entire site re-themes
  from one file and stays coherent (no leftover light sections).
- A **live currency converter and rate ticker** using real ECB reference rates.
- An **interactive `/demo` sandbox** that walks the full loop — open account →
  KYC → European IBAN → receive a payout → **convert at the live interbank
  rate** → SEPA out — with correct arithmetic and a checksum-valid sample IBAN,
  clearly labelled "sample data, no real money."
- A **real backend**: forms → validation → durable storage (Postgres or file
  fallback) → optional email; HMAC-authenticated admin with CSV export; a health
  endpoint; and a **first-party funnel analytics** system (no cookies, no
  third-party trackers, Do-Not-Track respected).

## Key decisions

**Provider-by-environment, not hard-coded infra.** Every side-effect layer
(storage, email, rate limiting, analytics) selects its implementation from env
vars behind one interface. Zero config → file store + logging; set
`SUPABASE_URL` → the same code talks to Postgres. This keeps the repo runnable by
anyone in one command while being production-real when wired.

**Email is a side effect, never a store.** An earlier design emailed
submissions *as* the persistence step — a store that only emails is a store that
loses data. Storage and notification were split so a mail outage can never drop
a lead.

**Honesty as a design constraint.** The demo is a sandbox and says so; the
homepage account panel is `aria-hidden` illustration; regulatory copy is
env-gated so the site never claims an authorisation it doesn't hold. This is a
product decision, not a disclaimer bolted on at the end.

**Dark-first, and why that is a token decision rather than a colour one.**

The site has exactly **one palette**. Not a dark theme with a light fallback,
not a light theme inverted — one set of 30 CSS custom properties on `:root`,
with `color-scheme: dark` so the browser renders form controls and scrollbars to
match. Everything else follows from that.

*Why one.* A second palette is not twice the design work, it is twice the
**verification** work: every foreground/background pair has to clear AA in both,
and the interesting failures are always in the theme nobody is looking at. This
project chose depth over breadth — one palette, every pair measured, rather than
two palettes and a hope.

*The values are RGB channels, not colours.* `--brand: 204 31 134`, not
`#CC1F86`. Tailwind wraps each in `rgb(var(--brand) / <alpha-value>)`, which is
what makes `bg-brand/[0.12]`, `ring-line/70` and `from-ink/5` work at all.
Storing a hex would have cost every opacity modifier in the codebase — a
constraint worth knowing before you pick the format, and expensive to discover
afterwards.

*Roles, not shades.* Each token names a **job**: `--canvas` is the page,
`--card` is an elevated panel, `--line` is a hairline, `--ink-muted` is
secondary text. Nothing is called `gray-700`. The rename is what makes the
contrast test possible — `tests/contrast.test.ts` can assert "every real text
token clears 4.5:1 on every surface token" because the tokens know which of the
two they are.

*And this paragraph was aspirational for two months.* The rebrand changed every
value and kept every name, with a config comment saying so out loud: "legacy
`blue*` names kept for zero-churn". So the codebase asked for `bg-brand-blue`
and got magenta, `bg-surface-navy` and got magenta-black, `bg-surface-cream` and
got a slightly different magenta-black; `<Section tone="white">` painted the
page near-black. A reader could not tell what a page looked like by reading it,
which is the entire benefit the paragraph above claims.

Renamed in one pass — `brand`, `brand-deep`, `brand-soft`, `surface-deep`,
`surface-alt`, `surface-tint`, and tones of `canvas | alt | deep | brand | tint`
— and verified the way a rename of 46 files has to be: by diffing the compiled
CSS of both builds and confirming every `property: value` pair was identical.

It was not quite identical, and that is the interesting part. Seven utilities
in the source already said `bg-brand-soft/25`, `text-brand-soft` and
`hover:border-brand-soft/40`, and there had never been a `brand.soft` key for
them to resolve against — only `brand["blue-soft"]`. Tailwind does not warn on
an unknown utility, so it emitted nothing, and the hero and corridor aurora
glows, the CTA glow, two status dots and the corridor eyebrow had been
rendering with **no colour at all**. Nothing caught it because nothing could:
`tsc` and ESLint never look inside a class string, and a missing decorative glow
reads as a design choice rather than a fault. `tests/dead-code.test.ts` now
parses the palette out of the Tailwind config and fails on any colour utility
naming a token that does not exist.

*What it cost to get wrong once.* An earlier version shipped a `.dark` block
declaring all 30 properties **to the same values as `:root`**, plus a pre-paint
inline script in the document head whose only job was to add that class. A
closed loop: it could not change a rendered colour. It survived several batches
because it *looked* load-bearing — the CSP work reasoned about hashing "the
inline theme script", and two error messages kept a failing `red-600` inside
`dark:` variants that could never match.

Measured rather than assumed when it was removed: the `.dark` block was 967
source bytes and **6 bytes of shipped CSS**, because cssnano saw two identical
declaration blocks and merged the selectors. The real cost was the other half —
**230 bytes of blocking inline script in the `<head>` of all 31 prerendered
documents**, executed before first paint on every navigation, to add a class
with no effect.

`darkMode: "class"` stays in the Tailwind config deliberately, with the reason
written down. Under the default `"media"` strategy a stray `dark:` variant would
activate for every visitor whose OS prefers dark — most of them — silently
applying a value nobody designed against, on a palette that is already dark.
`"class"` makes such a variant inert. `tests/dead-code.test.ts` fails if any
token is ever declared twice, which is the shape a second palette would take on
its way back in.

**The `#CC1F86` vs `#EE4FA5` contrast decision (the interesting one).**
The brief specified vivid magenta `#CC1F86` for CTAs *and* accent-bright
`#EE4FA5` for hover/links, plus a non-negotiable WCAG AA bar. These collide:

- White text on `#CC1F86` = **5.11:1** ✓ (good button).
- White text on the brighter `#EE4FA5` = **3.33:1** ✗ — a *lighter* hover fill
  fails AA for button labels.
- `#CC1F86` as small *text* on the near-black bg = **3.66:1** ✗.

So the two magentas were given distinct, non-overlapping jobs:
`#CC1F86` is a **fill** (buttons, progress, logo, large numbers) that carries
white text; `#EE4FA5` is the **accessible text/link/focus-ring** colour on dark
(**5.97:1**). Button hover **darkens** to `#B81A78` (white 6.07:1) instead of
brightening — the "metallic pop" comes from a glow, not a lower-contrast fill.
The result honours both exact brand colours *and* AA, verified with computed
ratios rather than eyeballing.

## Verified metrics

All measured on the production build — method reproducible from the repo.

> **Dated measurements, not standing claims.** Every number below says when it
> was taken, because the honest version of a number is the one that does — an
> earlier draft of `README.md` advertised "94 passing tests" against an actual
> 367, and an earlier draft of *this file* claimed 655 when the real figure had
> passed 1,000. That is the most expensive kind of error for a project whose
> whole argument is that its claims are checkable, and it is why the numbers
> here are now re-measured rather than carried forward. The current baseline is
> always in [`docs/PROGRESS.md`](./docs/PROGRESS.md).

- **axe-core (2026-07-28)** — WCAG 2.0, 2.1 **and 2.2**, A + AA, plus the
  best-practice ruleset, injected into a real Chrome over CDP and run on **36
  routes at two viewports — 72 page-loads, 0 violations.** Adding the 2.2 tags
  is what surfaced the previous round's findings: five link and control targets
  under the 24 × 24 px minimum in SC 2.5.8, invisible to an A+AA-only run.
- **Console and page errors (2026-07-28)** — **0** across the same 72
  page-loads: nothing thrown, no hydration mismatch, no broken image, no
  duplicate `id`, no anchor nested inside another.
- **Lighthouse (desktop preset, 2026-07-28)** — `/`: **Accessibility 100 ·
  Best Practices 100 · SEO 100 · CLS 0.** Performance reaches 100 on an idle
  machine but is load-sensitive: three consecutive runs of the same build gave
  87 / 95 / 100 as total blocking time moved 240 ms → 150 ms → 20 ms. Both
  numbers are real, which is the point — a single Lighthouse performance score
  measures the machine as much as the page.
- **Responsive (2026-07-28)** — no horizontal overflow on any of the 36 routes
  at 390 px or 1440 px (`scrollWidth <= innerWidth`).
- **Tests (2026-07-29)** — **1494 / 1494** Vitest across 45 files, covering
  IBAN/MOD-97, FX, pagination, storage provider selection, admin auth (HMAC
  round-trip, tamper, expiry), session signing, RLS-backed profile reads, CSV
  injection-safety, and the analytics funnel (unique-session counting,
  drop-off, completion, divide-by-zero) — plus a set of source lints that
  assert properties the other gates cannot see: no anchor inside an anchor, no
  bare `overflow-x-auto`, no colour utility naming an undefined token, no page
  claiming the build collects nothing, and a length budget on every `<title>`
  and meta description.
- **Types / lint / audit** — `tsc` clean, ESLint clean, `npm audit --omit=dev`
  0 vulnerabilities, **zero `any`**.
- **Contrast** — every fg/bg pair computed ≥ AA; e.g. body text 17.0:1, muted
  5.85:1, links 5.97:1, button labels 5.11:1, success 9.0:1. Recomputed from
  `styles/globals.css` on every test run rather than trusted from a table.
- **End-to-end** — drove the full `/demo` flow through real Chrome; the live
  ECB conversion checked out ($4,820 − $3,000 = $1,820.00, and $3,000 at the
  day's 0.8797 gave €2,639.22), and all six funnel events landed in the store.

## What it is not

Phase B — the regulated money product (KYC, a double-entry ledger, BaaS money
movement, transaction monitoring) — is intentionally **not** built. Stubbing
security-critical flows would be dishonest and worse than absent. This repo is
the credible front door and demand engine for that product, not the product.

**Authentication is the exception, and it is real.** It was the one item on
that list that needs no licence, so it was built rather than described:
Supabase Auth over its REST API with no SDK, an HMAC-signed `httpOnly` session
cookie, silent token renewal in middleware, and a role model enforced by Row
Level Security in Postgres rather than by a filter in a route handler. See
[`AUTHENTICATION.md`](./AUTHENTICATION.md).

**It is still not a business, and the site says so on every page.** There is no
company, no licence, no partner institution, no money. The *marketing* forms
validate what you type and then discard it — nothing transmitted, nothing
stored, nobody contacted. Creating an account is the single exception and the
only personal data this build holds: an email address and, if you give one, a
name. It opens a profile page and nothing else, because there is no balance
behind it. Everything that previously implied otherwise (a regulatory claim,
nine testimonials, five job openings, three contact addresses at a domain
nobody owns) was found by auditing the site against its own claims and removed.
That programme is the more interesting half of this project's history, and it
is recorded batch by batch in [`docs/PROGRESS.md`](./docs/PROGRESS.md).

---

## Catalog blurb

> **Marsa** — a cross-border multi-currency account concept, delivered as a
> production-grade marketing site, an interactive live-FX demo, customer
> accounts on Postgres row-level security, and a first-party analytics backend.
> Dark "black rose" design system on one set of role-named tokens; 1,494
> passing tests and 0 axe violations across 72 page-loads; illustrations drawn
> from those tokens rather than sourced; and a hard line between real software
> and a build that tells you exactly what it is not. Next.js 15 / React 19 /
> TypeScript, four runtime dependencies.

**Tagline:** *One account for every currency you get paid in.*
