import { describe, it, expect } from "vitest";
import { validateIban, normalizeIban, formatIban } from "@/lib/iban";

describe("normalizeIban", () => {
  it("strips whitespace and uppercases", () => {
    expect(normalizeIban("gb82 west 1234 5698 7654 32")).toBe("GB82WEST12345698765432");
    expect(normalizeIban("  de89\t3704 0044 0532 0130 00 ")).toBe("DE89370400440532013000");
  });
});

describe("formatIban", () => {
  it("groups characters in blocks of four", () => {
    expect(formatIban("GB82WEST12345698765432")).toBe("GB82 WEST 1234 5698 7654 32");
    expect(formatIban("nl91abna0417164300")).toBe("NL91 ABNA 0417 1643 00");
  });
});

describe("validateIban — valid IBANs across countries", () => {
  const valids: [string, string][] = [
    ["GB82 WEST 1234 5698 7654 32", "GB"],
    ["DE89 3704 0044 0532 0130 00", "DE"],
    ["FR14 2004 1010 0505 0001 3M02 606", "FR"],
    ["NL91 ABNA 0417 1643 00", "NL"],
    ["ES91 2100 0418 4502 0005 1332", "ES"],
    ["IT60 X054 2811 1010 0000 0123 456", "IT"],
    ["CH93 0076 2011 6238 5295 7", "CH"],
  ];

  it.each(valids)("accepts %s", (iban, cc) => {
    const result = validateIban(iban);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.countryCode).toBe(cc);
      expect(result.checkDigits).toHaveLength(2);
      expect(result.formatted).toContain(" ");
    }
  });

  it("handles lowercase and irregular whitespace", () => {
    expect(validateIban("gb82 west 1234 5698 7654 32").valid).toBe(true);
    expect(validateIban("  DE89370400440532013000  ").valid).toBe(true);
    expect(validateIban("nl91abna0417164300").valid).toBe(true);
  });
});

describe("validateIban — invalid checksums", () => {
  it("rejects a single mutated digit", () => {
    const r1 = validateIban("GB82WEST12345698765431"); // last digit changed
    expect(r1.valid).toBe(false);
    if (!r1.valid) expect(r1.reason).toMatch(/check digits/i);

    const r2 = validateIban("DE89370400440532013001"); // last digit changed
    expect(r2.valid).toBe(false);
  });
});

describe("validateIban — malformed input", () => {
  it("rejects empty input", () => {
    const r = validateIban("   ");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/enter an iban/i);
  });

  it("rejects non-alphanumeric characters", () => {
    const r = validateIban("GB82-WEST-1234");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/letters and digits/i);
  });

  it("rejects strings that are too short or too long", () => {
    expect(validateIban("GB82").valid).toBe(false);
    expect(validateIban("GB82" + "1".repeat(40)).valid).toBe(false);
  });

  it("rejects a missing country/check-digit prefix", () => {
    const r = validateIban("1234WEST12345698765432");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/country code|2-letter/i);
  });

  it("rejects an unrecognised country code", () => {
    const r = validateIban("ZZ82WEST12345698765432");
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.reason).toMatch(/not a recognised/i);
      expect(r.countryCode).toBe("ZZ");
    }
  });

  it("rejects a correct country with the wrong length", () => {
    // DE requires 22 chars; give it 21.
    const r = validateIban("DE8937040044053201300");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toMatch(/must be 22 characters/i);
  });
});
