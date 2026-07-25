import { describe, it, expect } from "vitest";
import {
  DEMO_STEPS,
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
