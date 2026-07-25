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
      { label: "Interactive Demo", href: "/demo" },
      { label: "EU Business Account", href: "/business/eu-business-account" },
      { label: "Multi-Currency IBAN (Business)", href: "/business/multi-currency-iban" },
      { label: "Multi-Currency IBAN (Personal)", href: "/personal/multi-currency-iban" },
      { label: "SEPA Transfers", href: "/personal/sepa-transfers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    label: "Solutions",
    children: [
      { label: "E-Commerce Sellers", href: "/business/e-commerce-sellers" },
      { label: "Import & Export", href: "/solutions/import-export" },
      { label: "Agencies & Freelancers", href: "/solutions/agencies-freelancers" },
      { label: "Company Formation", href: "/solutions/company-formation" },
    ],
  },
  {
    label: "Tools",
    children: [
      { label: "Currency Converter", href: "/tools/currency-converter" },
      { label: "IBAN Checker", href: "/tools/iban-checker" },
      { label: "SEPA Vs SWIFT", href: "/tools/sepa-vs-swift" },
      { label: "FX Rate Calculator", href: "/tools/fx-calculator" },
    ],
  },
  {
    label: "Resources",
    children: [
      { label: "Blog", href: "/blog" },
      { label: "How It Works (Personal)", href: "/personal/how-it-works" },
      { label: "How It Works (Business)", href: "/business/how-it-works" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  { label: "FAQ", href: "/faq" },
];

export const footerColumns: Array<{ title: string; links: NavLink[] }> = [
  {
    title: "Product",
    links: [
      { label: "Interactive Demo", href: "/demo" },
      { label: "EU Business Account", href: "/business/eu-business-account" },
      { label: "Multi-Currency IBAN", href: "/business/multi-currency-iban" },
      { label: "SEPA Payments", href: "/personal/sepa-transfers" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "E-Commerce Sellers", href: "/business/e-commerce-sellers" },
      { label: "Import & Export", href: "/solutions/import-export" },
      { label: "Agencies & Freelancers", href: "/solutions/agencies-freelancers" },
      { label: "Company Formation", href: "/solutions/company-formation" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Currency Converter", href: "/tools/currency-converter" },
      { label: "IBAN Checker", href: "/tools/iban-checker" },
      { label: "SEPA Vs SWIFT", href: "/tools/sepa-vs-swift" },
      { label: "FX Rate Calculator", href: "/tools/fx-calculator" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "How It Works", href: "/personal/how-it-works" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/company/about" },
      { label: "Careers", href: "/company/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Compliance", href: "/company/compliance" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms Of Service", href: "/legal/terms" },
      { label: "Cookie Policy", href: "/legal/cookies" },
      { label: "Compliance", href: "/company/compliance" },
    ],
  },
];

export const footerBadges = [
  "Regulated Partners",
  "Segregated Accounts",
  "Netherlands",
  "IBAN Opening",
  "180+ Countries",
  "Safeguarded Funds",
];
