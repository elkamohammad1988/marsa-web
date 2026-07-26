import { describe, it, expect } from "vitest";
import {
  DEMO_SCRIPT,
  DEMO_STEPS,
  advanceFrom,
  previousStep,
  type DemoProgress,
  type DemoStepId,
  formatIbanBlocks,
  generateSampleIban,
  ibanWithCheckDigits,
  money,
  stepIndex,
} from "@/lib/demo";
import { validateIban } from "@/lib/iban";

describe("generateSampleIban", () => {
  it("produces a structurally valid IBAN that passes real MOD-97 validation", () => {
    const iban = generateSampleIban();
    const result = validateIban(iban);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.countryCode).toBe("NL");
    }
  });

  it("is deterministic for a given seed and encodes the Marsa bank code", () => {
    expect(generateSampleIban(123)).toBe(generateSampleIban(123));
    expect(generateSampleIban(123).slice(4, 8)).toBe("MRSA");
  });

  it("stays valid across many seeds", () => {
    for (const seed of [1, 42, 999, 123456, 41703962, 9_999_999_999]) {
      expect(validateIban(generateSampleIban(seed)).valid).toBe(true);
    }
  });
});

describe("ibanWithCheckDigits", () => {
  it("computes check digits that satisfy validation", () => {
    const iban = ibanWithCheckDigits("NL", "MRSA0123456789");
    expect(validateIban(iban).valid).toBe(true);
  });
});

describe("formatIbanBlocks", () => {
  it("groups into 4-char blocks", () => {
    expect(formatIbanBlocks("NL00MRSA0123456789")).toBe("NL00 MRSA 0123 4567 89");
  });
});

describe("money", () => {
  it("formats with the right symbol and two decimals", () => {
    expect(money(4820, "USD")).toBe("$4,820.00");
    expect(money(1150.5, "EUR")).toBe("€1,150.50");
    expect(money(420.15, "GBP")).toBe("£420.15");
  });
});

describe("step ordering", () => {
  it("runs welcome → done in order", () => {
    expect(DEMO_STEPS[0].id).toBe("welcome");
    expect(DEMO_STEPS[DEMO_STEPS.length - 1].id).toBe("done");
    expect(stepIndex("convert")).toBeGreaterThan(stepIndex("receive"));
    expect(stepIndex("send")).toBeGreaterThan(stepIndex("convert"));
  });
});

/**
 * The flow's gates.
 *
 * These lived as a seven-branch ternary embedded in JSX, where the only way to
 * check them was to click through the demo. They are the product rules — what
 * a reader has to do before the next step opens — so they are now a pure
 * function and asserted here.
 *
 * The blocker text matters as much as the boolean. A disabled Continue with no
 * explanation is a dead end; every gate in this flow is one action away from
 * opening, so each one names that action.
 */

const NOTHING_DONE: DemoProgress = {
  kycComplete: false,
  usd: 0,
  eur: 0,
  hasSentSepa: false,
  rateReady: false,
};

const ALL_DONE: DemoProgress = {
  kycComplete: true,
  usd: DEMO_SCRIPT.payoutUsd,
  eur: 4400,
  hasSentSepa: true,
  rateReady: true,
};

describe("advanceFrom", () => {
  it("walks every step to the next one in the rail", () => {
    for (let i = 0; i < DEMO_STEPS.length - 1; i++) {
      const advance = advanceFrom(DEMO_STEPS[i].id, ALL_DONE);
      expect(advance?.next, `from "${DEMO_STEPS[i].id}"`).toBe(DEMO_STEPS[i + 1].id);
    }
  });

  it("ends the flow at done", () => {
    // The final step's controls are calls to action, not a next step.
    expect(advanceFrom("done", ALL_DONE)).toBeNull();
  });

  it("lets the informational steps through unconditionally", () => {
    for (const step of ["welcome", "profile", "account"] as DemoStepId[]) {
      expect(advanceFrom(step, NOTHING_DONE)?.blockedBy, step).toBeNull();
    }
  });

  it("holds the identity step until the check finishes", () => {
    expect(advanceFrom("identity", NOTHING_DONE)?.blockedBy).toMatch(/identity check/i);
    expect(advanceFrom("identity", { ...NOTHING_DONE, kycComplete: true })?.blockedBy).toBeNull();
  });

  it("names the amount a reader has to receive", () => {
    // "Receive the payout" is vague when the button on screen says $4,820.00.
    const blocked = advanceFrom("receive", NOTHING_DONE)?.blockedBy;
    expect(blocked).toContain(money(DEMO_SCRIPT.payoutUsd, "USD"));
    expect(advanceFrom("receive", { ...NOTHING_DONE, usd: 10 })?.blockedBy).toBeNull();
  });

  it("distinguishes 'you have not converted' from 'the rate has not loaded'", () => {
    // Two different situations that look identical from a disabled button:
    // one is the reader's move, the other is the network's.
    expect(advanceFrom("convert", { ...NOTHING_DONE, rateReady: false })?.blockedBy).toMatch(
      /exchange rate/i,
    );
    expect(advanceFrom("convert", { ...NOTHING_DONE, rateReady: true })?.blockedBy).toMatch(
      /convert to euros/i,
    );
    expect(advanceFrom("convert", { ...NOTHING_DONE, eur: 1 })?.blockedBy).toBeNull();
  });

  it("holds the send step until a transfer has actually gone out", () => {
    expect(advanceFrom("send", { ...ALL_DONE, hasSentSepa: false })?.blockedBy).toMatch(/SEPA/);
    expect(advanceFrom("send", ALL_DONE)?.blockedBy).toBeNull();
  });

  it("always gives a blocker the reader can act on, never a bare refusal", () => {
    for (const { id } of DEMO_STEPS) {
      const blocked = advanceFrom(id, NOTHING_DONE)?.blockedBy;
      if (blocked) expect(blocked, id).toMatch(/\.$/);
    }
  });
});

describe("previousStep", () => {
  it("has nowhere to go back to from the start", () => {
    expect(previousStep("welcome")).toBeNull();
  });

  it("is the inverse of advancing, at every step", () => {
    for (let i = 1; i < DEMO_STEPS.length; i++) {
      expect(previousStep(DEMO_STEPS[i].id)).toBe(DEMO_STEPS[i - 1].id);
    }
  });
});
