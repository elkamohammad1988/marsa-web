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

- **Lighthouse (desktop preset)** — `/` and `/demo` both:
  **Performance 100 · Accessibility 100 · Best Practices 100 · SEO 100.**
  (Run via the Chrome I manage over CDP to avoid a chrome-launcher temp-cleanup
  crash on Windows.)
- **axe-core (WCAG 2.0 + 2.1, A + AA)** — injected the local axe build over CDP
  and ran on **29 routes: 0 violations.**
- **Responsive** — no horizontal overflow at 375 / 768 / 1440 px on `/` or
  `/demo` (`scrollWidth === viewport`).
- **Tests** — **94 / 94** Vitest, covering IBAN/MOD-97, FX, pagination, storage
  provider selection, admin auth (HMAC round-trip, tamper/expiry), CSV
  injection-safety, and the analytics funnel (unique-session counting,
  drop-off, completion, divide-by-zero).
- **Types / lint / audit** — `tsc` clean, ESLint clean, `npm audit` 0
  vulnerabilities, **zero `any`**.
- **Contrast** — every fg/bg pair computed ≥ AA; e.g. body text 17.0:1, muted
  5.85:1, links 5.97:1, button labels 5.11:1, success 9.0:1.
- **End-to-end** — drove the full `/demo` flow through real Chrome via CDP; the
  live ECB conversion checked out ($3,000 × 0.87781 = €2,633.43; $4,820 − $3,000
  = $1,820.00; €2,633.43 − €1,150 = €1,483.43), and all six funnel events landed
  in the store.

## What it is not

Phase B — the regulated money product (real auth, accounts, KYC, double-entry
ledger, BaaS money movement) — is intentionally **not** built. Stubbing
security-critical flows would be dishonest and worse than absent. This repo is
the credible front door and demand engine for that product, not the product.

---

## Catalog blurb

> **Marsa** — a cross-border multi-currency account concept, delivered as a
> production-grade marketing site + interactive live-FX demo + first-party
> analytics backend. Dark "black rose" design system, Lighthouse 100s across
> the board, 0 accessibility violations on 29 routes, 94 passing tests, and a
> hard line between real software and clearly-labelled sandbox. Next.js 15 /
> React 19 / TypeScript, zero runtime bloat.

**Tagline:** *One account for every currency you get paid in.*
