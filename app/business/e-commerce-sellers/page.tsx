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
  title: "EU business account for e-commerce sellers",
  description:
    "An EU business account for e-commerce sellers. Get an IBAN accepted by Amazon, Shopify and Stripe. Receive payouts locally and convert at real interbank rates.",
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
        title="EU business account for e-commerce sellers"
        description="Optimised receiving from Amazon, Shopify, Stripe, and all major marketplaces. Settle inside SEPA."
        primaryCta={{ label: "Open a business account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact?topic=sales" }}
        art="phone-accounts"
        tone="deep"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconChart />,
            title: "Marketplace-ready IBAN",
            description:
              "Accepted by Amazon, Shopify, Stripe, PayPal, Etsy, Wayfair and 100+ marketplaces.",
          },
          {
            icon: <IconGlobe />,
            title: "Local Receiving Worldwide",
            description:
              "Receive in EUR, USD, GBP locally, no SWIFT routing, no lifting fees.",
          },
          {
            icon: <IconExchange />,
            title: "Convert at interbank rate",
            description:
              "Bring your global earnings to your home currency at real interbank rates.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="Plug Marsa into your marketplace stack"
        steps={[
          {
            number: "01",
            title: "Open Marsa Business",
            description: "Apply online and our compliance team approves within 48h.",
          },
          {
            number: "02",
            title: "Connect Marketplaces",
            description: "Add your Marsa EU IBAN as the payout destination across Amazon, Shopify, Stripe.",
          },
          {
            number: "03",
            title: "Settle in your currency",
            description: "Convert payouts to your home currency at interbank rates, instantly.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Generic EMIs"
        title="Why Sellers Choose Marsa"
        rows={[
          { label: "Amazon Acceptance", subject: "Yes, EU IBAN", comparator: "Limited" },
          { label: "Stripe Acceptance", subject: "Yes", comparator: "Often rejected" },
          { label: "FX Markup", subject: "0% up to €10k", comparator: "1-3%" },
          { label: "USD Receiving", subject: "Local ACH", comparator: "SWIFT only" },
          { label: "Payout Speed", subject: "Same day", comparator: "2-5 days" },
          { label: "Support", subject: "Dedicated", comparator: "Generic" },
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
        title="Open your EU e-commerce business account"
        primaryCta={{ label: "Open a business account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact?topic=sales" }}

      />
    </>
  );
}
