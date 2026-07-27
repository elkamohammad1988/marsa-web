import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { IconChart, IconGlobe, IconExchange } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "EU Business Account For E-Commerce Sellers",
  description:
    "An EU business account for e-commerce sellers. Get an IBAN accepted by Amazon, Shopify and Stripe — receive payouts locally and convert at real interbank rates.",
  path: "/business/e-commerce-sellers",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Solutions" },
          { label: "E-Commerce Sellers" },
        ]}
        title="EU Business Account For E-Commerce Sellers"
        description="Optimised Receiving From Amazon, Shopify, Stripe, And All Major Marketplaces. Settle Inside SEPA."
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="phone-accounts"
        tone="navy"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconChart />,
            title: "Marketplace-Ready IBAN",
            description:
              "Accepted by Amazon, Shopify, Stripe, PayPal, Etsy, Wayfair and 100+ marketplaces.",
          },
          {
            icon: <IconGlobe />,
            title: "Local Receiving Worldwide",
            description:
              "Receive in EUR, USD, GBP locally — no SWIFT routing, no lifting fees.",
          },
          {
            icon: <IconExchange />,
            title: "Convert At Interbank Rate",
            description:
              "Bring your global earnings to your home currency at real interbank rates.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How It Works"
        title="Plug Marsa Into Your Marketplace Stack"
        steps={[
          {
            number: "01",
            title: "Open Marsa Business",
            description: "Apply online — our compliance team approves within 48h.",
          },
          {
            number: "02",
            title: "Connect Marketplaces",
            description: "Add your Marsa EU IBAN as the payout destination across Amazon, Shopify, Stripe.",
          },
          {
            number: "03",
            title: "Settle In Your Currency",
            description: "Convert payouts to your home currency at interbank rates — instantly.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Generic EMIs"
        title="Why Sellers Choose Marsa"
        rows={[
          { label: "Amazon Acceptance", marsa: "Yes — EU IBAN", traditional: "Limited" },
          { label: "Stripe Acceptance", marsa: "Yes", traditional: "Often rejected" },
          { label: "FX Markup", marsa: "0% up to €10k", traditional: "1-3%" },
          { label: "USD Receiving", marsa: "Local ACH", traditional: "SWIFT only" },
          { label: "Payout Speed", marsa: "Same day", traditional: "2-5 days" },
          { label: "Support", marsa: "Dedicated", traditional: "Generic" },
        ]}
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Will Amazon accept Marsa's IBAN?",
            answer:
              "Yes. Marsa's EU IBANs are accepted by Amazon EU and Amazon US (for European sellers).",
          },
          {
            question: "Can I use Marsa for Stripe payouts?",
            answer:
              "Yes. Marsa EU IBANs are accepted by Stripe Atlas, Stripe EU, and most Stripe entities.",
          },
          {
            question: "What about Shopify Payments?",
            answer:
              "Shopify Payments is supported in EU markets where Marsa operates.",
          },
          {
            question: "Are there per-transaction limits?",
            answer:
              "Standard limits apply to all plans, with higher caps on Growth and Enterprise tiers.",
          },
        ]}
      />

      <CTACard
        eyebrow="For E-Commerce"
        title="Open Your EU E-Commerce Business Account"
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="coin-warm"
      />
    </>
  );
}
