/**
 * Runs once when the server starts, before it accepts a request.
 *
 * This is the only place a configuration problem can be caught *early* rather
 * than on the first visitor who happens to hit the affected path (audit B8).
 *
 * Deliberately not run during `next build`. The build compiles the app without
 * production credentials — CI has no Supabase project and needs none to
 * typecheck, lint, test and compile — so throwing there would fail the
 * pipeline for a configuration that is only required at runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertEnvironment } = await import("@/lib/env");
  assertEnvironment();
}
