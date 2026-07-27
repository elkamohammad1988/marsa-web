import { setReporter } from "@/lib/observability";

/**
 * Silence the observability seam by default.
 *
 * Several suites deliberately drive failure paths — a storage write that
 * cannot happen, an FX provider that refuses the connection, a rate limiter
 * with no database. Each now captures an event, and the default reporter
 * writes it to stderr, so a *passing* run printed a wall of JSON that made a
 * real failure harder to find.
 *
 * Tests that care about what was captured install their own reporter (see
 * `tests/observability.test.ts` and `tests/api-health.test.ts`), which is
 * strictly better than asserting on console spies.
 */
setReporter(() => {});
