/**
 * Casing convention, applied throughout this file.
 *
 * Title Case is for proper nouns only — plan names ("Marsa Classic") and
 * acronyms (SEPA, SWIFT, FX, IBAN, EU, API, SLA). Everything a human reads as
 * a sentence or a label is sentence case: descriptions, badges, feature chips
 * and CTA labels.
 *
 * This file previously mixed both, which is the reason for the rule rather
 * than a style preference. `classic.description` read "A No-Cost Account Built
 * For Freelancers Starting Out. Simple, Efficient Tools To Manage Money From
 * Day One" while the two plans directly beside it were ordinary sentences, and
 * "Business card" sat among six Title Case siblings. Title-casing a full
 * sentence is the single strongest "generated copy" signal a marketing page can
 * emit, and doing it inconsistently reads as nobody having proofread the page —
 * on a pricing table, the one screen where a buyer is looking hardest.
 *
 * Stripe, Mercury and Linear all set button and heading copy in sentence case.
 */
export type PlanFeature = string;

export type Plan = {
  id: string;
  name: string;
  badge?: string;
  price: string;
  priceSuffix?: string;
  description: string;
  features: PlanFeature[];
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  audience: "personal" | "business";
};

export const plans: Plan[] = [
  {
    id: "classic",
    name: "Marsa Classic",
    badge: "Ideal for first steps",
    price: "Free",
    description:
      "A no-cost account for freelancers starting out. The tools to manage money from day one, without paying a cent.",
    features: [
      "Virtual card",
      "Free withdrawals",
      "Instant alerts",
      "Multi-currency",
      "SEPA transfers",
      "Encrypted login",
    ],
    primaryCta: { label: "Get started for free", href: "/get-started?type=personal&plan=classic" },
    secondaryCta: { label: "Compare cards", href: "/pricing" },
    audience: "personal",
  },
  {
    id: "plus",
    name: "Marsa Plus",
    badge: "Most popular",
    price: "€4.99",
    priceSuffix: "/ month",
    description:
      "Everything in Classic plus higher transfer limits, premium FX rates, and priority support across all Marsa channels.",
    features: [
      "Physical card",
      "Free SWIFT transfers",
      "Premium FX rates",
      "Priority support",
      "Joint account",
      "Spending insights",
    ],
    primaryCta: { label: "Get Marsa Plus", href: "/get-started?type=personal&plan=plus" },
    secondaryCta: { label: "Compare cards", href: "/pricing" },
    audience: "personal",
  },
  {
    id: "premium",
    name: "Marsa Premium",
    badge: "For frequent travellers",
    price: "€14.99",
    priceSuffix: "/ month",
    description:
      "Designed for frequent travellers and high-volume users. Metal card, concierge support, lounge access and elevated limits.",
    features: [
      "Metal card",
      "Airport lounges",
      "Travel insurance",
      "Free SWIFT out",
      "Best FX rates",
      "Concierge",
    ],
    primaryCta: { label: "Go Premium", href: "/get-started?type=personal&plan=premium" },
    secondaryCta: { label: "Compare cards", href: "/pricing" },
    audience: "personal",
  },
];

export const businessPlans: Plan[] = [
  {
    id: "biz-starter",
    name: "Business Starter",
    badge: "For founders",
    price: "Free",
    description:
      "Open an EU business account in one day. Multi-currency IBAN, no monthly fee, perfect for early-stage operations.",
    features: [
      "EU IBAN",
      "Multi-currency",
      "Business card",
      "SEPA transfers",
      "Team members",
      "Accounting exports",
    ],
    primaryCta: { label: "Open a business account", href: "/get-started?type=business&plan=biz-starter" },
    secondaryCta: { label: "Compare plans", href: "/pricing" },
    audience: "business",
  },
  {
    id: "biz-growth",
    name: "Business Growth",
    badge: "Most popular",
    price: "€19.99",
    priceSuffix: "/ month",
    description:
      "Built for scaling teams. Higher SWIFT limits, FX hedging tools, and dedicated account manager.",
    features: [
      "Higher limits",
      "FX hedging",
      "Dedicated manager",
      "Bulk payments",
      "API access",
      "Priority support",
    ],
    primaryCta: { label: "Get the Growth plan", href: "/get-started?type=business&plan=biz-growth" },
    secondaryCta: { label: "Compare plans", href: "/pricing" },
    audience: "business",
  },
  {
    id: "biz-enterprise",
    name: "Business Enterprise",
    badge: "Custom",
    price: "Custom",
    description:
      "Tailored for enterprises and marketplaces. Custom SWIFT pricing, white-labelled cards, and treasury services.",
    features: [
      "Custom FX",
      "Treasury services",
      "White label",
      "Mass payouts",
      "SLA support",
      "Compliance suite",
    ],
    primaryCta: { label: "Talk to sales", href: "/contact?topic=sales" },
    secondaryCta: { label: "Compare plans", href: "/pricing" },
    audience: "business",
  },
];
