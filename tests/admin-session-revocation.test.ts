import { describe, it, expect } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  sessionVersion,
  DEFAULT_SESSION_VERSION,
} from "@/lib/admin-session";
import { signPayload } from "@/lib/signed-cookie";

/**
 * Revoking an admin session without rotating the signing secret (audit P7).
 *
 * The problem this closes: the only way to end a live admin session early was
 * to change `ADMIN_SESSION_SECRET` and redeploy. That is a heavy answer to a
 * routine question — a stolen laptop, a session left open on a shared machine —
 * and it conflates two separate events. Rotating the secret asserts the signing
 * key may have leaked; revoking a session usually asserts nothing of the kind.
 *
 * The mechanism is a version inside the signed payload, compared on every
 * verification. What the tests below have to establish is not that it *can*
 * revoke, but that it cannot be *evaded*: the version must be inside the
 * signature, a token from a previous generation must fail, and a token from a
 * *future* generation must fail too.
 */

const SECRET = "0123456789abcdef0123456789abcdef";
const NOW = Date.parse("2026-08-19T12:00:00Z");

describe("the version is part of the signed payload", () => {
  it("cannot be edited without breaking the signature", async () => {
    const { token } = await createSessionToken(SECRET, NOW, "1");

    // Rewrite the version in place, leaving the signature alone — the edit an
    // attacker holding the cookie would make.
    const forged = token.replace(/^(\d+)\.1\./, "$1.2.");
    expect(forged).not.toBe(token);
    expect(await verifySessionToken(forged, SECRET, NOW, "2")).toBe(false);
  });

  it("cannot be re-signed without the secret", async () => {
    const expiry = Math.floor(NOW / 1000) + 3600;
    const wrongKey = await signPayload(`${expiry}.9`, "ffffffffffffffffffffffffffffffff");
    expect(await verifySessionToken(wrongKey, SECRET, NOW, "9")).toBe(false);
  });
});

describe("bumping the version ends every existing session", () => {
  it("accepts a token from the current generation", async () => {
    const { token } = await createSessionToken(SECRET, NOW, "1");
    expect(await verifySessionToken(token, SECRET, NOW, "1")).toBe(true);
  });

  it("refuses a token from the previous generation", async () => {
    const { token } = await createSessionToken(SECRET, NOW, "1");
    expect(await verifySessionToken(token, SECRET, NOW, "2")).toBe(false);
  });

  it("refuses a token from a later generation", async () => {
    // Not symmetry for its own sake: rolling the variable back — an accidental
    // redeploy of an older environment — must not resurrect the sessions the
    // bump was meant to kill.
    const { token } = await createSessionToken(SECRET, NOW, "3");
    expect(await verifySessionToken(token, SECRET, NOW, "2")).toBe(false);
  });

  it("still enforces expiry within the right generation", async () => {
    const { token } = await createSessionToken(SECRET, NOW, "1");
    const nineHoursLater = NOW + 9 * 60 * 60 * 1000;
    expect(await verifySessionToken(token, SECRET, nineHoursLater, "1")).toBe(false);
  });

  it("accepts a version that is not a number", async () => {
    // Compared for equality only, so a date or a word is a valid generation
    // marker — and "2026-08-19" is a far more useful thing to find in an
    // environment variable than "7".
    const { token } = await createSessionToken(SECRET, NOW, "2026-08-19");
    expect(await verifySessionToken(token, SECRET, NOW, "2026-08-19")).toBe(true);
    expect(await verifySessionToken(token, SECRET, NOW, "2026-08-20")).toBe(false);
  });
});

describe("tokens that predate versioning are not accepted", () => {
  it("refuses a correctly signed bare-expiry token", async () => {
    // The shape `createSessionToken` used to mint. Treating it as version 1
    // would mean the tokens issued before the feature existed are exactly the
    // ones it cannot revoke — so it is refused, and the operator signs in once.
    const expiry = Math.floor(NOW / 1000) + 3600;
    const legacy = await signPayload(String(expiry), SECRET);
    expect(await verifySessionToken(legacy, SECRET, NOW, "1")).toBe(false);
  });

  it("refuses an empty version", async () => {
    const expiry = Math.floor(NOW / 1000) + 3600;
    const empty = await signPayload(`${expiry}.`, SECRET);
    expect(await verifySessionToken(empty, SECRET, NOW, "1")).toBe(false);
  });

  it("refuses a payload with no expiry at all", async () => {
    const noExpiry = await signPayload(".1", SECRET);
    expect(await verifySessionToken(noExpiry, SECRET, NOW, "1")).toBe(false);
  });
});

describe("the version is read from the environment with a safe default", () => {
  it("defaults when unset", () => {
    expect(sessionVersion({})).toBe(DEFAULT_SESSION_VERSION);
  });

  it("defaults when set to whitespace", () => {
    // An empty variable is a common shape in a dashboard, and it must mean
    // "unset" rather than "a generation whose marker is the empty string" —
    // which would never match a token.
    expect(sessionVersion({ ADMIN_SESSION_VERSION: "   " })).toBe(DEFAULT_SESSION_VERSION);
  });

  it("trims, so a stray newline does not silently revoke everything", () => {
    expect(sessionVersion({ ADMIN_SESSION_VERSION: " 4\n" })).toBe("4");
  });

  it("round-trips a session through the environment default", async () => {
    const { token } = await createSessionToken(SECRET, NOW, sessionVersion({}));
    expect(await verifySessionToken(token, SECRET, NOW, sessionVersion({}))).toBe(true);
  });
});
