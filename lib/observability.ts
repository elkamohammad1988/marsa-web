/**
 * The seam between "something went wrong" and whoever needs to know.
 *
 * Audit finding B2: ten `console.*` calls were the entire observability story,
 * and `app/error.tsx` said so outright — *"Surface the error to
 * logs/monitoring. Swap console for your provider."* The three failures that
 * matter most are all deliberately swallowed, and correctly so: a storage
 * write that failed, an insert that fell back, an email that never sent, a
 * rate limiter running degraded. None should break the visitor's request. But
 * each was also invisible unless a human happened to be reading raw platform
 * logs at the moment it happened, which means the detection path for "we have
 * been silently losing leads for a week" was a customer complaint.
 *
 * Three properties this is built for:
 *
 * **No dependency.** The project ships four runtime dependencies and that is a
 * deliberate constraint. The default reporter writes one line of JSON to
 * stderr, which every log platform already parses. A Sentry (or equivalent)
 * adapter plugs in through `setReporter` when a DSN exists — that is
 * PROJECT-PLAN H7, and it is the *only* part of B2 that waits on a human.
 *
 * **Isomorphic.** `app/error.tsx` is a client component, so nothing here may
 * import `node:*`. Everything is plain data plus one function reference.
 *
 * **Nothing personal leaves the process.** Capture sites deal in submission
 * ids, error bodies and provider names, and it would take one careless
 * `captureException(err, { submission })` to start posting names and email
 * addresses to a third-party service. `redact()` drops the value of any key
 * whose name looks personal or secret, whatever the caller passes.
 */

export type Severity = "error" | "warning";

/** Structured, non-personal detail attached to an event. */
export type EventContext = Record<string, unknown>;

export type CapturedEvent = {
  /** Stable identifier for the failure site, e.g. `storage.write`. */
  event: string;
  severity: Severity;
  message: string;
  /** Error class name, when the thrown value was an Error. */
  name?: string;
  stack?: string;
  context: EventContext;
  timestamp: string;
};

export type Reporter = (event: CapturedEvent) => void;

/**
 * Keys whose values are never reported. Matched case-insensitively against the
 * whole key, so `userEmail`, `reply_to` and `SUPABASE_SERVICE_ROLE_KEY` are all
 * covered.
 */
const SENSITIVE_KEY = /(email|name|password|secret|token|key|authorization|cookie|address|phone|ip)/i;

/** Longest stack we keep. Enough to identify a call path, not a core dump. */
const MAX_STACK_CHARS = 2000;

export function redact(context: EventContext): EventContext {
  const out: EventContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[redacted]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = redact(value as EventContext);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function describe(error: unknown): { message: string; name?: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.slice(0, MAX_STACK_CHARS),
    };
  }
  return { message: typeof error === "string" ? error : JSON.stringify(error) };
}

/**
 * One line of JSON per event.
 *
 * Deliberately not pretty-printed: a multi-line log entry is a multi-line
 * *grep result*, and platform log viewers split on newlines. `severity` is a
 * top-level field so an alert rule can filter on it without a parser.
 */
export const consoleReporter: Reporter = (event) => {
  const line = JSON.stringify(event);
  if (event.severity === "error") console.error(line);
  else console.warn(line);
};

let reporter: Reporter = consoleReporter;

/**
 * Install a different reporter — a Sentry adapter, a test spy, a fan-out to
 * both. Returns the previous one so a caller can restore it.
 */
export function setReporter(next: Reporter): Reporter {
  const previous = reporter;
  reporter = next;
  return previous;
}

/**
 * Report a failure. Never throws: an observability layer that can break the
 * request it is observing is worse than none, and every call site here sits in
 * a `catch` that has already decided the user should not be affected.
 */
export function captureException(
  error: unknown,
  options: { event: string; severity?: Severity; context?: EventContext } & EventContext,
): void {
  const { event, severity = "error", context, ...rest } = options;
  try {
    reporter({
      event,
      severity,
      ...describe(error),
      context: redact({ ...rest, ...context }),
      timestamp: new Date().toISOString(),
    });
  } catch {
    // The reporter itself failed. There is nowhere left to report that to.
  }
}

/**
 * A short, unambiguous reference for one failed request.
 *
 * Shown to the visitor and written into the captured event, so a support email
 * saying "it said reference K3F9QW2A" lands on one log line. Uppercase
 * Crockford-ish alphabet: no `0`/`O`, no `1`/`I`/`L`, so it survives being read
 * aloud or retyped.
 */
const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newReference(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");
}
