import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * The browser smoke suite, kept separate from the unit suite on purpose.
 *
 * `npm test` runs 1,800-odd pure-logic checks in about ten seconds, and that
 * speed is why anyone runs it. Folding a suite that builds the application,
 * starts a server and launches Chrome into the same command would make the
 * fast feedback loop slow enough to skip, and the fastest way to lose a test
 * suite is to make it inconvenient.
 *
 * So: two commands, two configs, both gates in CI.
 *   npm test         unit — no browser, no server, no build
 *   npm run test:smoke   browser — needs `npm run build` first
 */
export default defineConfig({
  resolve: {
    alias: { "@": resolve(root) },
  },
  test: {
    environment: "node",
    include: ["tests/smoke/**/*.smoke.ts"],

    /*
     * One file at a time. Each smoke file starts its own `next start` on its
     * own port, and running several in parallel would put three Node servers
     * and three Chrome instances on a two-core CI runner — which does not fail
     * outright, it just makes every timing-sensitive assertion slower and less
     * reliable. Determinism is worth more here than wall-clock.
     */
    fileParallelism: false,

    /*
     * Generous, because these budgets are for a cold CI runner rather than a
     * warm laptop. They are ceilings, not waits: every assertion polls for a
     * condition and returns the moment it holds, so a healthy run never comes
     * near them. What they buy is a *loud* failure with the server log attached
     * instead of a hang that eventually gets cancelled with no diagnosis.
     */
    testTimeout: 120_000,
    hookTimeout: 180_000,
    teardownTimeout: 30_000,

    // No `tests/setup.ts`: that silences the observability reporter for the
    // unit suite, and here the server runs in its own process anyway. The
    // reporter's output is captured from the child and printed on failure.
  },
});
