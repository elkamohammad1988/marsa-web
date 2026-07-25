# Contributing to `marsa-web`

## Prerequisites

- **Node.js 22 or newer** (see `engines` in `package.json`). CI runs 24.x, which
  is also the version `package-lock.json` was generated with — use it locally if
  you can.
- **npm** (this repo uses `package-lock.json`; do not introduce a second lockfile).

```bash
npm ci        # install exactly what the lockfile pins
npm run dev   # http://localhost:3000
```

The site runs with **zero configuration**. Copy `.env.example` to `.env.local`
only when you need to exercise a specific integration (database, email, admin
area). Never put real values in `.env.example`, and never commit `.env*` or
anything under `.data/` — both are gitignored, and `.data/` holds personal data
from real form submissions.

## Branch naming

Work happens on a branch off `main`. `main` is always releasable.

```
<type>/<short-kebab-description>
```

| Type | Use for |
|---|---|
| `feat/` | a new user-facing capability |
| `fix/` | a bug fix |
| `chore/` | tooling, CI, dependencies, config |
| `docs/` | documentation only |
| `refactor/` | behaviour-preserving code changes |
| `test/` | adding or repairing tests |

Examples: `fix/iban-checker-dark-theme`, `chore/eslint-9-flat-config`,
`test/validation-coverage`.

Commit messages follow the same prefixes: `fix: correct IBAN panel contrast`.

## Running the checks locally

One command runs the whole gate, in the same order as CI:

```bash
npm run verify
```

That is `typecheck` → `lint` → `test` → `build`. Run the pieces individually
while iterating:

| Command | What it checks |
|---|---|
| `npm run typecheck` | `tsc --noEmit` — types, zero errors expected |
| `npm run lint` | `next lint` — zero warnings expected |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run build` | production Next.js build |
| `npm audit --omit=dev --audit-level=high` | production dependency advisories |

`npm run verify` deliberately excludes the audit step so that a new upstream
advisory never blocks local work; CI runs it as its own step.

> **Note on the dev dependency tree.** `npm audit` (without `--omit=dev`) reports
> high-severity advisories from the end-of-life ESLint 8 chain. Nothing there
> ships to users, which is why CI audits production dependencies only. Migrating
> off ESLint 8 is tracked separately.

## Opening a pull request

1. Branch from an up-to-date `main`.
2. Run `npm run verify` before you push. CI runs the same commands — a failure
   locally is a failure on the PR.
3. Open the PR against `main` and describe what changed and why.
4. **CI must be green before merge.** The `Verify` job runs, in order:
   `npm ci` → `npx tsc --noEmit` → `npx next lint` → `npx vitest run` →
   `npm run build` → `npm audit --omit=dev --audit-level=high`. Each is a
   separate named step, so a red check tells you immediately which gate broke.
   Do not merge on red, and do not disable a step to get past it — fix the cause
   or raise it in the PR.

Once the pipeline has been green for a few runs, enable branch protection on
`main` requiring the `Verify` check to pass.

## Adding tests

Tests live in `tests/` as `*.test.ts` and run under Vitest in the `node`
environment (`vitest.config.ts`). The suite is pure-logic today — no component or
end-to-end tests yet. New business logic in `lib/` should arrive with tests.
