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
    badge: "Ideal For First Steps",
    price: "Free",
    description:
      "A No-Cost Account Built For Freelancers Starting Out. Simple, Efficient Tools To Manage Money From Day One — Without Paying A Cent.",
    features: [
      "Virtual Card",
      "Free Withdrawals",
      "Instant Alerts",
      "Multi-Currency",
      "SEPA Transfers",
      "Encrypted Login",
    ],
    primaryCta: { label: "Get Started For Free", href: "/get-started?type=personal&plan=classic" },
    secondaryCta: { label: "Compare Cards", href: "/pricing" },
    audience: "personal",
  },
  {
    id: "plus",
    name: "Marsa Plus",
    badge: "Most Popular",
    price: "€4.99",
    priceSuffix: "/ month",
    description:
      "Everything in Classic plus higher transfer limits, premium FX rates, and priority support across all Marsa channels.",
    features: [
      "Physical Card",
      "Free SWIFT Transfers",
      "Premium FX Rates",
      "Priority Support",
      "Joint Account",
      "Spending Insights",
    ],
    primaryCta: { label: "Get Marsa Plus", href: "/get-started?type=personal&plan=plus" },
    secondaryCta: { label: "Compare Cards", href: "/pricing" },
    audience: "personal",
  },
  {
    id: "premium",
    name: "Marsa Premium",
    badge: "For Globals",
    price: "€14.99",
    priceSuffix: "/ month",
    description:
      "Designed for frequent travellers and high-volume users. Metal card, concierge support, lounge access and elevated limits.",
    features: [
      "Metal Card",
      "Airport Lounges",
      "Travel Insurance",
      "Free SWIFT Out",
      "Best FX Rates",
      "Concierge",
    ],
    primaryCta: { label: "Go Premium", href: "/get-started?type=personal&plan=premium" },
    secondaryCta: { label: "Compare Cards", href: "/pricing" },
    audience: "personal",
  },
];

export const businessPlans: Plan[] = [
  {
    id: "biz-starter",
    name: "Business Starter",
    badge: "For Founders",
    price: "Free",
    description:
      "Open an EU business account in one day. Multi-currency IBAN, no monthly fee, perfect for early-stage operations.",
    features: [
      "EU IBAN",
      "Multi-Currency",
      "Business card",
      "SEPA Transfers",
      "Team Members",
      "Accounting Exports",
    ],
    primaryCta: { label: "Open A Business Account", href: "/get-started?type=business&plan=biz-starter" },
    secondaryCta: { label: "Compare Plans", href: "/pricing" },
    audience: "business",
  },
  {
    id: "biz-growth",
    name: "Business Growth",
    badge: "Most Popular",
    price: "€19.99",
    priceSuffix: "/ month",
    description:
      "Built for scaling teams. Higher SWIFT limits, FX hedging tools, and dedicated account manager.",
    features: [
      "Higher Limits",
      "FX Hedging",
      "Dedicated Manager",
      "Bulk Payments",
      "API Access",
      "Priority Support",
    ],
    primaryCta: { label: "Get Growth Plan", href: "/get-started?type=business&plan=biz-growth" },
    secondaryCta: { label: "Compare Plans", href: "/pricing" },
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
      "Treasury Services",
      "White Label",
      "Mass Payouts",
      "SLA Support",
      "Compliance Suite",
    ],
    primaryCta: { label: "Talk To Sales", href: "/contact?topic=sales" },
    secondaryCta: { label: "Compare Plans", href: "/pricing" },
    audience: "business",
  },
];
