/**
 * Pure helpers for the interactive product demo (`/demo`).
 *
 * Everything here is deterministic and side-effect-free so it can be unit
 * tested. The demo it powers is a SANDBOX: sample data, no real money, no real
 * customer. The one thing that is real is the FX rate, which the flow fetches
 * live from `/api/rates` — so a viewer sees the actual interbank number.
 */

export type AccountType = "business" | "personal";

export type DemoCountry = { code: string; name: string; flag: string };

/** A short, honest list of onboarding countries for the picker. */
export const DEMO_COUNTRIES: DemoCountry[] = [
  { code: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "TR", name: "Türkiye", flag: "🇹🇷" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
];

/** ISO 7064 MOD-97-10 over an already letter-expanded, rearranged string. */
function mod97(input: string): number {
  let remainder = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const piece = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
    for (let j = 0; j < piece.length; j++) {
      remainder = (remainder * 10 + (piece.charCodeAt(j) - 48)) % 97;
    }
  }
  return remainder;
}

/** Expand a BBAN into a full, checksum-valid IBAN for `country`. */
export function ibanWithCheckDigits(country: string, bban: string): string {
  const base = `${bban}${country}00`;
  const check = (98 - mod97(base)).toString().padStart(2, "0");
  return `${country}${check}${bban}`;
}

/**
 * Build a structurally valid sample Dutch IBAN for the demo, with the bank
 * code "MRSA". `seed` makes the account digits deterministic (and testable);
 * the result passes real MOD-97 validation, but it is sample data — never a
 * live account.
 */
export function generateSampleIban(seed = 41703962): string {
  const digits = String(Math.abs(seed) % 10_000_000_000).padStart(10, "0");
  return ibanWithCheckDigits("NL", `MRSA${digits}`);
}

/** Group an IBAN into 4-char blocks for display. */
export function formatIbanBlocks(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

export type DemoStepId =
  | "welcome"
  | "profile"
  | "identity"
  | "account"
  | "receive"
  | "convert"
  | "send"
  | "done";

/** Ordered demo steps with the labels shown in the progress rail. */
export const DEMO_STEPS: { id: DemoStepId; label: string }[] = [
  { id: "welcome", label: "Start" },
  { id: "profile", label: "Account" },
  { id: "identity", label: "Verify" },
  { id: "account", label: "IBAN" },
  { id: "receive", label: "Get paid" },
  { id: "convert", label: "Convert" },
  { id: "send", label: "Send" },
  { id: "done", label: "Done" },
];

export function stepIndex(id: DemoStepId): number {
  return DEMO_STEPS.findIndex((s) => s.id === id);
}

export type Balances = { USD: number; EUR: number; GBP: number };

export const CURRENCY_SYMBOL: Record<keyof Balances, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Format a money amount with its symbol and thousands separators. */
export function money(amount: number, ccy: keyof Balances): string {
  return `${CURRENCY_SYMBOL[ccy]}${new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/** The scripted amounts the demo walks through. */
export const DEMO_SCRIPT = {
  payoutUsd: 4820,
  convertUsd: 3000,
  sendEur: 1150,
} as const;
