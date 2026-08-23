/**
 * IBAN validation per ISO 13616 / ISO 7064 (MOD-97-10). Fully offline and
 * deterministic — no third-party calls.
 */

/** Expected total IBAN length by ISO country code (SEPA + common others). */
export const IBAN_LENGTHS: Record<string, number> = {
  AD: 24, AE: 23, AL: 28, AT: 20, AZ: 28, BA: 20, BE: 16, BG: 22, BH: 22, BR: 29,
  BY: 28, CH: 21, CR: 22, CY: 28, CZ: 24, DE: 22, DK: 18, DO: 28, EE: 20, EG: 29,
  ES: 24, FI: 18, FO: 18, FR: 27, GB: 22, GE: 22, GI: 23, GL: 18, GR: 27, GT: 28,
  HR: 21, HU: 28, IE: 22, IL: 23, IS: 26, IT: 27, JO: 30, KW: 30, KZ: 20, LB: 28,
  LC: 32, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MD: 24, ME: 22, MK: 19, MR: 27,
  MT: 31, MU: 30, NL: 18, NO: 15, PK: 24, PL: 28, PS: 29, PT: 25, QA: 29, RO: 24,
  RS: 22, SA: 24, SE: 24, SI: 19, SK: 24, SM: 27, TN: 24, TR: 26, UA: 29, VA: 22,
  VG: 24, XK: 20,
};

export const COUNTRY_NAMES: Record<string, string> = {
  AD: "Andorra", AE: "United Arab Emirates", AT: "Austria", BE: "Belgium", BG: "Bulgaria",
  CH: "Switzerland", CY: "Cyprus", CZ: "Czech Republic", DE: "Germany", DK: "Denmark",
  EE: "Estonia", ES: "Spain", FI: "Finland", FR: "France", GB: "United Kingdom", GR: "Greece",
  HR: "Croatia", HU: "Hungary", IE: "Ireland", IS: "Iceland", IT: "Italy", LI: "Liechtenstein",
  LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", MC: "Monaco", MT: "Malta", NL: "Netherlands",
  NO: "Norway", PL: "Poland", PT: "Portugal", RO: "Romania", SE: "Sweden", SI: "Slovenia",
  SK: "Slovakia", SM: "San Marino",
};

export type IbanResult =
  | { valid: true; countryCode: string; countryName: string; checkDigits: string; formatted: string }
  | { valid: false; reason: string; countryCode?: string };

export function normalizeIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function formatIban(raw: string): string {
  return normalizeIban(raw).replace(/(.{4})/g, "$1 ").trim();
}

/** ISO 7064 MOD-97-10 over the rearranged, letter-expanded IBAN. */
function mod97(input: string): number {
  let remainder = 0;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    // Digits 0-9 => "0".."9"; letters A-Z => "10".."35".
    const piece = code >= 65 && code <= 90 ? String(code - 55) : input[i];
    for (let j = 0; j < piece.length; j++) {
      remainder = (remainder * 10 + (piece.charCodeAt(j) - 48)) % 97;
    }
  }
  return remainder;
}

export function validateIban(raw: string): IbanResult {
  const iban = normalizeIban(raw);

  if (!iban) return { valid: false, reason: "Enter an IBAN to check." };
  if (!/^[A-Z0-9]+$/.test(iban))
    return { valid: false, reason: "An IBAN may only contain letters and digits." };
  if (iban.length < 15 || iban.length > 34)
    return { valid: false, reason: "An IBAN must be between 15 and 34 characters." };
  if (!/^[A-Z]{2}\d{2}/.test(iban))
    return { valid: false, reason: "An IBAN must start with a 2-letter country code and 2 check digits." };

  const countryCode = iban.slice(0, 2);
  const expectedLength = IBAN_LENGTHS[countryCode];

  if (!expectedLength)
    return { valid: false, reason: `Country code "${countryCode}" is not a recognised IBAN country.`, countryCode };
  if (iban.length !== expectedLength)
    return {
      valid: false,
      reason: `${COUNTRY_NAMES[countryCode] ?? countryCode} IBANs must be ${expectedLength} characters. This one is ${iban.length}.`,
      countryCode,
    };

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  if (mod97(rearranged) !== 1)
    return { valid: false, reason: "The check digits don't match. This IBAN is invalid.", countryCode };

  return {
    valid: true,
    countryCode,
    countryName: COUNTRY_NAMES[countryCode] ?? countryCode,
    checkDigits: iban.slice(2, 4),
    formatted: formatIban(iban),
  };
}
