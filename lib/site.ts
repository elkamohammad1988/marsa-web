/**
 * Central site configuration. Everything that might differ between
 * environments (URLs, contact addresses, social handles) is read from the
 * environment. Where a value would otherwise have to be invented — a domain,
 * a mailbox, a social profile — the default is *absent*, not a guess, and each
 * consumer renders nothing instead.
 */

function cleanUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * The canonical origin, resolved in order of how much it can be trusted.
 *
 * This used to fall back to `https://www.marsa.money` — a domain nobody owns —
 * which meant an unconfigured build emitted canonical tags, a sitemap, robots
 * directives, OG tags and JSON-LD all pointing at somebody else's future
 * property. A wrong canonical is the one metadata error that asks search
 * engines to attribute this site's content to another origin.
 *
 * 1. `NEXT_PUBLIC_SITE_URL` — set this in production. It is the only value that
 *    is stable across deploys, so it is the only one a canonical should use.
 * 2. Vercel's per-deployment host, so preview deploys describe themselves
 *    rather than localhost. `NEXT_PUBLIC_VERCEL_URL` is the browser-visible
 *    half of the same pair; `VERCEL_URL` is server-only. Neither is stable —
 *    each deployment gets its own — which is why they rank below the explicit
 *    value rather than replacing it.
 * 3. `http://localhost:3000` — the dev server, and the only honest answer when
 *    nothing else is configured.
 */
export function resolveSiteUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return cleanUrl(configured);

  const vercelHost = (env.NEXT_PUBLIC_VERCEL_URL ?? env.VERCEL_URL)?.trim();
  if (vercelHost) return cleanUrl(`https://${vercelHost}`);

  return "http://localhost:3000";
}

export const siteConfig = {
  name: "Marsa",
  legalName: "Marsa Money Ltd.",
  /** Short brand line — a marsa is the harbour a ship comes home to. */
  tagline: "Where your money lands.",
  /** Canonical origin, used for metadata, sitemap, robots, and JSON-LD. */
  url: resolveSiteUrl(),
  description:
    "Multi-currency IBAN accounts, SEPA transfers, and interbank FX for people and businesses moving money between Europe and the rest of the world.",
  /**
   * Where an authenticated "Log in" should send users. In production this is
   * the banking app on a separate origin. Until that origin is provided we
   * fall back to the on-site onboarding flow so the link is never dead.
   */
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "/get-started",
  /**
   * Contact addresses, configured or absent — never invented.
   *
   * These defaulted to `support@`, `sales@` and `press@marsa.money`, rendered
   * as live `mailto:` links on the contact page and emitted in
   * `Organization.contactPoint`. That domain is not owned, so every one of
   * them was an invitation to write to a mailbox that does not exist. Set the
   * environment variables to publish a real address; leave them unset and the
   * site stops offering one.
   */
  email: {
    support: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "",
    sales: process.env.NEXT_PUBLIC_SALES_EMAIL ?? "",
    press: process.env.NEXT_PUBLIC_PRESS_EMAIL ?? "",
  },
  /**
   * Same rule. These defaulted to `x.com/marsamoney` and friends and were
   * emitted in `Organization.sameAs`, which is a machine-readable claim to own
   * those profiles.
   */
  social: {
    x: process.env.NEXT_PUBLIC_SOCIAL_X ?? "",
    youtube: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ?? "",
    linkedin: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ?? "",
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

/**
 * The `@handle` for Twitter card attribution, read off the configured profile
 * URL so there is one place to change the account rather than two.
 *
 * Returns null for anything that is not a recognisable profile path, because a
 * card attributing a page to `@undefined` is worse than one attributing it to
 * nobody.
 */
export function socialHandle(url: string = siteConfig.social.x): string | null {
  const match = url.match(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?$/);
  return match ? `@${match[1]}` : null;
}

/** Build an absolute URL for a given path (for canonicals, OG, sitemap). */
export function absoluteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${suffix === "/" ? "" : suffix}`;
}
