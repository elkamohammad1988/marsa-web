import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { startFxStub, type FxStub } from "./fx-stub";

/**
 * Start and stop the application under test.
 *
 * Always a **production build** served by `next start`, never `next dev`. The
 * development server compiles each route on first request, which on this
 * project is seconds per page — slower than a client component takes to
 * hydrate under any reasonable wait. Driving it that way reports working
 * controls as broken, which is the failure mode this suite exists to rule out
 * rather than reproduce.
 */

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** A port the OS has just confirmed is free. */
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (typeof address === "string" || address === null) {
        probe.close();
        return reject(new Error("could not acquire a port"));
      }
      const { port } = address;
      probe.close(() => resolve(port));
    });
  });
}

export type AppServer = {
  origin: string;
  /** Everything the server wrote to stdout/stderr, for diagnosing a failure. */
  log(): string;
  stop(): Promise<void>;
};

export type StartOptions = {
  /**
   * Extra environment for the server process. The suite uses this to point the
   * application at the PostgREST stub, or deliberately to point it at nothing.
   */
  env?: Record<string, string>;
};

/**
 * Poll until the server answers, or give up with the log attached.
 *
 * A readiness *probe*, not a sleep: on a fast machine this returns in one
 * attempt, and on a loaded CI runner it keeps trying instead of failing at
 * whatever fixed delay somebody guessed. The failure message carries the
 * server's own output, because "timed out waiting for the server" on its own
 * is the least useful sentence a CI log can contain.
 */
async function waitForReady(origin: string, log: () => string, budgetMs = 60_000): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let lastError = "no attempt made";

  while (Date.now() < deadline) {
    try {
      // Any answer at all means the listener is up. A 200 is not required —
      // `/api/health` deliberately reports 503 when a dependency is absent, and
      // that is a state this suite tests rather than waits out.
      const res = await fetch(`${origin}/api/health`, { cache: "no-store" });
      if (res.status > 0) return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(
    `Server at ${origin} was not ready within ${budgetMs}ms (last error: ${lastError}).\n` +
      `--- server output ---\n${log()}`,
  );
}

export async function startApp(options: StartOptions = {}): Promise<AppServer> {
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  let output = "";

  const fx: FxStub = await startFxStub();

  const child: ChildProcess = spawn(
    process.execPath,
    [path.join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(port)],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        // Cleared unless a caller sets them, so a developer's `.env.local` can
        // never leak into a test run. A smoke suite that silently talks to the
        // maintainer's real Supabase project would be both flaky and dangerous:
        // one of the flows below deletes a record.
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
        SUPABASE_ANON_KEY: "",
        AUTH_SESSION_SECRET: "",
        RESEND_API_KEY: "",
        RESEND_FROM: "",
        ADMIN_PASSWORD: "",
        ADMIN_SESSION_VERSION: "",
        ADMIN_SESSION_SECRET: "",
        /*
         * The last external dependency, pointed at a local stand-in.
         *
         * `lib/fx.ts` falls back to `https://api.frankfurter.dev/v1` when this
         * is unset, so until now every smoke run reached across the public
         * internet to a free, key-less, rate-limited third party — and went red
         * when that third party was busy. Two CI runs failed on commits whose
         * whole diff was Markdown; see `fx-stub.ts` for the signature that
         * identified it.
         *
         * Set here rather than in each smoke file for the same reason the
         * credentials above are blanked here: a default that has to be
         * remembered at three call sites is a default that will be missed at
         * the fourth. A caller can still override it — `options.env` spreads
         * last — which is what a test asserting the *failure* path would do.
         */
        FX_API_BASE: fx.url,
        ...options.env,
      },
      stdio: ["ignore", "pipe", "pipe"],
      // Detached on POSIX so the whole process group can be signalled: `next
      // start` spawns workers, and killing only the parent leaves them holding
      // the port. Windows gets `taskkill /T` in `stop()` for the same reason.
      detached: process.platform !== "win32",
    },
  );

  child.stdout?.on("data", (chunk) => (output += chunk));
  child.stderr?.on("data", (chunk) => (output += chunk));

  const log = () => output;

  const stop = async (): Promise<void> => {
    // The FX stub closes whether or not the server is still up, so a run that
    // fails before `next start` came alive does not leave a listener behind.
    await fx.close().catch(() => {});
    if (child.exitCode !== null || child.signalCode !== null) return;

    const ended = new Promise<void>((resolve) => child.once("exit", () => resolve()));

    if (process.platform === "win32") {
      // `child.kill()` on Windows terminates only the named process, and the
      // Next.js server survives holding the port — after which the *next*
      // `next start` fails with EADDRINUSE and, if nobody reads the log, the
      // suite silently tests the previous build. `taskkill /T` takes the tree.
      spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }

    await Promise.race([ended, new Promise((r) => setTimeout(r, 10_000))]);
  };

  try {
    await waitForReady(origin, log);
  } catch (err) {
    await stop();
    throw err;
  }

  return { origin, log, stop };
}
