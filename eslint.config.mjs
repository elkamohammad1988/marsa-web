import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint 9 flat configuration (audit P6).
 *
 * Replaces `.eslintrc.json` plus `next lint`, which was deprecated in Next
 * 15.5 and is removed in Next 16 — so this was a deadline, not a preference.
 * It also retired the ESLint 8 dependency chain, which was the whole source of
 * the repository's dev-tree advisories: `npm audit` on the full tree now
 * reports **0 vulnerabilities**, where it previously reported 13 high.
 *
 * `npm run lint` calls the ESLint CLI directly. `next lint` did two things —
 * discover the files worth linting and apply Next's config — and only the
 * second is worth keeping, so the first is written out here as `files` and
 * `ignores`. That is a gain rather than a loss: `next lint` silently limited
 * itself to a fixed set of directories, so a rule violation in `scripts/` or a
 * config file at the root was never going to be reported.
 *
 * `FlatCompat` is here because `eslint-config-next` is still published in the
 * eslintrc format. It is a documented bridge, not a workaround, and it is the
 * shape Next's own codemod produces.
 */

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    /*
     * Build output, dependencies, and the dot-prefixed scratch scripts the
     * repository convention keeps in the root (see .gitignore). Linting
     * generated JavaScript reports thousands of problems nobody can act on.
     */
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".vercel/**",
      "portfolio-screenshots/**",
      ".*.mjs",
    ],
  },

  ...compat.extends("next/core-web-vitals"),

  {
    rules: {
      /*
       * Kept from `.eslintrc.json`. Next's config warns; this repository
       * treats a raw `<img>` as an error, because every one of them is an
       * unoptimised asset on a page whose weight was an audit finding (F9).
       *
       * The four legitimate exceptions are the `ImageResponse` routes, where
       * `next/image` cannot run at all, and each carries an inline disable
       * naming that reason.
       */
      "@next/next/no-img-element": "error",
    },
  },
];

export default config;
