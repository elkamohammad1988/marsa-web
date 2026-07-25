/**
 * Central site configuration. Everything that might differ between
 * environments (URLs, contact addresses, social handles) is read from
 * environment variables with sensible production defaults, so the code
 * never hard-codes deployment-specific values.
 */

function cleanUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export const siteConfig = {
  name: "Marsa",
  legalName: "Marsa Money Ltd.",
  /** Short brand line — a marsa is the harbour a ship comes home to. */
  tagline: "Where your money lands.",
  /** Canonical origin, used for metadata, sitemap, robots, and JSON-LD. */
  url: cleanUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.marsa.money"),
  description:
    "Multi-currency IBAN accounts, SEPA transfers, and interbank FX for people and businesses moving money between Europe and the rest of the world.",
  /**
   * Where an authenticated "Log in" should send users. In production this is
   * the banking app on a separate origin. Until that origin is provided we
   * fall back to the on-site onboarding flow so the link is never dead.
   */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "/get-started",
  email: {
    support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@marsa.money",
    sales: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "sales@marsa.money",
    press: process.env.NEXT_PUBLIC_PRESS_EMAIL ?? "press@marsa.money",
  },
  social: {
    x: process.env.NEXT_PUBLIC_SOCIAL_X ?? "https://x.com/marsamoney",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? "https://www.youtube.com/@marsamoney",
    linkedin:
      process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? "https://www.linkedin.com/company/marsamoney",
  },
  /**
   * Regulatory reference shown in the footer / legal pages.
   *
   * An authorisation claim is a legal statement, not marketing copy, so both
   * values come from the environment and the claim is only rendered once BOTH
   * are set (see `hasRegulatorDetails`). Until then the site describes the
   * licensed-partner model instead, which is what is actually true.
   */
  regulator: {
    authority: process.env.NEXT_PUBLIC_REGULATOR_AUTHORITY ?? "",
    reference: process.env.NEXT_PUBLIC_REGULATOR_REFERENCE ?? "",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/** True only when a complete, real authorisation reference is configured. */
export function hasRegulatorDetails(): boolean {
  return Boolean(siteConfig.regulator.authority && siteConfig.regulator.reference);
}

/** Build an absolute URL for a given path (for canonicals, OG, sitemap). */
export function absoluteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${suffix === "/" ? "" : suffix}`;
}
