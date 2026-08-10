export type NavLink = { label: string; href: string };

export type NavGroup = {
  label: string;
  href?: string;
  children?: NavLink[];
};

export const mainNav: NavGroup[] = [
  {
    label: "Product",
    children: [
      { label: "Interactive demo", href: "/demo" },
      { label: "EU business account", href: "/business/eu-business-account" },
      { label: "Multi-currency IBAN (business)", href: "/business/multi-currency-iban" },
      { label: "Multi-currency IBAN (personal)", href: "/personal/multi-currency-iban" },
      { label: "SEPA transfers", href: "/personal/sepa-transfers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    label: "Solutions",
    children: [
      { label: "E-commerce sellers", href: "/business/e-commerce-sellers" },
      { label: "Import & export", href: "/solutions/import-export" },
      { label: "Agencies & freelancers", href: "/solutions/agencies-freelancers" },
      { label: "Company formation", href: "/solutions/company-formation" },
    ],
  },
  {
    label: "Tools",
    children: [
      { label: "Currency converter", href: "/tools/currency-converter" },
      { label: "IBAN checker", href: "/tools/iban-checker" },
      { label: "SEPA vs SWIFT", href: "/tools/sepa-vs-swift" },
      { label: "FX rate calculator", href: "/tools/fx-calculator" },
    ],
  },
  {
    label: "Resources",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "How it works (personal)", href: "/personal/how-it-works" },
      { label: "How it works (business)", href: "/business/how-it-works" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  { label: "FAQ", href: "/faq" },
];

export const footerColumns: Array<{ title: string; links: NavLink[] }> = [
  {
    title: "Product",
    links: [
      { label: "Interactive demo", href: "/demo" },
      { label: "EU business account", href: "/business/eu-business-account" },
      { label: "Multi-currency IBAN", href: "/business/multi-currency-iban" },
      { label: "SEPA payments", href: "/personal/sepa-transfers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "E-commerce sellers", href: "/business/e-commerce-sellers" },
      { label: "Import & export", href: "/solutions/import-export" },
      { label: "Agencies & freelancers", href: "/solutions/agencies-freelancers" },
      { label: "Company formation", href: "/solutions/company-formation" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Currency converter", href: "/tools/currency-converter" },
      { label: "IBAN checker", href: "/tools/iban-checker" },
      { label: "SEPA vs SWIFT", href: "/tools/sepa-vs-swift" },
      { label: "FX rate calculator", href: "/tools/fx-calculator" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "How it works", href: "/personal/how-it-works" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/company/about" },
      { label: "Contact", href: "/contact" },
      { label: "Compliance", href: "/company/compliance" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Cookie policy", href: "/legal/cookies" },
      // `Compliance` is not repeated here. It appeared in both this column and
      // Company, same label and same href — one page listed twice in one
      // footer, eight inches apart.
    ],
  },
];

/**
 * Shown as a row of chips in the footer, on every page. These used to read
 * "Regulated Partners · Segregated Accounts · Safeguarded Funds" — a list of
 * credentials, asserted sitewide, that nobody holds. They now describe what
 * the build actually is.
 *
 * "No data collected" was one of them until accounts existed. It was true of
 * the marketing forms and is not true of a sign-up, and a privacy claim that
 * is true of most of a site is a false one — so it is replaced by a statement
 * about the stack rather than reworded into something narrower that a reader
 * would still take sitewide. The precise disclosure of what an account stores
 * lives in `ConceptBadge`, which is also on every page and has room to say it
 * exactly.
 *
 * `Next.js 15 · React 19` was removed from the list. A framework version is a
 * fact about the repository, not about the product, and a customer reading the
 * foot of a banking page learns nothing from it — what it signals is that the
 * page was built to impress developers. The vendor name went the same way:
 * "Supabase Auth + row-level security" says who supplies the database, where
 * the reassuring part is that per-row permissions exist at all.
 */
export const footerBadges = [
  "Concept build",
  "Live ECB reference rates",
  "ISO 13616 IBAN validation",
  "Row-level database security",
  "Open source",
];
