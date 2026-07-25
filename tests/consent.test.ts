import { describe, it, expect, afterEach, vi } from "vitest";
import {
  CONSENT_STORAGE_KEY,
  readConsent,
  hasRejectedNonEssential,
} from "@/lib/consent";

/**
 * Audit finding S7: the cookie banner wrote a decision to localStorage and
 * broadcast a `marsa:cookie-consent` event that nothing in the repository
 * listened for, so "Reject non-essential" changed nothing and the demo funnel
 * kept tracking visitors who had explicitly refused.
 *
 * `hasRejectedNonEssential()` is the gate `DemoFlow` now checks before posting
 * a funnel event, so it is asserted directly here. The behaviour that matters
 * is a refusal being honoured, and — just as important — an *undecided*
 * visitor not being mistaken for a refusing one.
 */

/** Minimal localStorage stand-in; the node test environment has none. */
function stubStorage(value: string | null) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === CONSENT_STORAGE_KEY ? value : null),
    setItem: () => {},
    removeItem: () => {},
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readConsent", () => {
  it("reads an explicit acceptance", () => {
    stubStorage("accepted");
    expect(readConsent()).toBe("accepted");
  });

  it("reads an explicit refusal", () => {
    stubStorage("rejected");
    expect(readConsent()).toBe("rejected");
  });

  it("reports no decision when nothing is stored", () => {
    stubStorage(null);
    expect(readConsent()).toBeNull();
  });

  it("treats an unrecognised stored value as no decision, not as consent", () => {
    for (const value of ["yes", "true", "ACCEPTED", "1", ""]) {
      stubStorage(value);
      expect(readConsent(), `stored ${JSON.stringify(value)}`).toBeNull();
    }
  });

  it("reports no decision when storage is unavailable", () => {
    // Safari private mode, a hardened browser, or server-side rendering.
    vi.stubGlobal("localStorage", undefined);
    expect(readConsent()).toBeNull();
  });

  it("reports no decision when storage throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("SecurityError: storage is disabled");
      },
    });
    expect(readConsent()).toBeNull();
  });
});

describe("hasRejectedNonEssential", () => {
  it("is true only after an explicit refusal", () => {
    stubStorage("rejected");
    expect(hasRejectedNonEssential()).toBe(true);
  });

  it("is false when the visitor accepted", () => {
    stubStorage("accepted");
    expect(hasRejectedNonEssential()).toBe(false);
  });

  it("is false when the visitor has not decided yet", () => {
    // The distinction that matters: undecided is not refusal. Collapsing the
    // two would silence telemetry for every first-time visitor, and collapsing
    // them the other way is the bug S7 describes.
    stubStorage(null);
    expect(hasRejectedNonEssential()).toBe(false);
  });

  it("is false when storage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(hasRejectedNonEssential()).toBe(false);
  });
});
