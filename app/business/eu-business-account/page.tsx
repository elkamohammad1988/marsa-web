import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { CardShowcase } from "@/components/sections/CardShowcase";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { IconBank, IconExchange, IconLightning } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Open An EU Business Account For Non-Residents",
  description:
    "Open an EU business account with a real IBAN as a non-resident. Marsa onboards non-EU companies online in 24–48h — SEPA payments, 15+ currencies, bulk payouts.",
  path: "/business/eu-business-account",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Business" },
          { label: "EU Business Account" },
        ]}
        title="Open An EU Business Account For Non-Residents"
        description="European Business IBAN For Modern Operations. No Branch Visits. Funds Settle Inside SEPA In Seconds."
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="phone-home"
        tone="deep"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconBank />,
            title: "Real EU IBAN",
            description:
              "Receive a true European IBAN accepted by all SEPA processors, marketplaces, and payment partners.",
          },
          {
            icon: <IconExchange />,
            title: "Multi-Currency Vaults",
            description:
              "Hold and convert 15+ currencies at interbank rates — settle in EUR, USD, GBP and more.",
          },
          {
            icon: <IconLightning />,
            title: "Bulk Payouts",
            description:
              "Pay suppliers and contractors at scale with a CSV import or our REST API.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="3 Step Onboarding"
        title="Open Your EU Business Account Online"
        description="No travel. No legalese. Fully digital onboarding for non-residents."
        steps={[
          {
            number: "01",
            title: "Submit Application",
            description:
              "Tell us about your company in under 8 minutes — directors, KYC, and use-case.",
          },
          {
            number: "02",
            title: "EOR Business Approves",
            description:
              "Our compliance team reviews your application within 24-48 hours.",
          },
          {
            number: "03",
            title: "Receive IBAN",
            description:
              "Start receiving SEPA payments from European clients immediately.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="A Business Account Without The Friction"
        rows={[
          { label: "Account Opening", marsa: "Fully Online", traditional: "In-person, 2-6 weeks" },
          { label: "EU IBAN", marsa: "Yes", traditional: "Often denied to non-residents" },
          { label: "Multi-Currency", marsa: "15+ currencies", traditional: "Limited" },
          { label: "Bulk Payments", marsa: "Native + API", traditional: "Manual" },
          { label: "SWIFT Fees", marsa: "Low flat fee", traditional: "€20-40 per transfer" },
          { label: "Support", marsa: "Dedicated Manager", traditional: "Generic call center" },
        ]}
      />

      <CardShowcase
        eyebrow="Business Card"
        title="The Marsa Business Card"
        description="Issue physical and virtual cards to your team with spend rules and real-time visibility."
        bullets={[
          "Unlimited virtual cards",
          "Spending rules per card",
          "Real-time team transactions",
          "Auto-categorisation",
          "Accounting integrations",
          "Apple & Google Pay",
        ]}
        art="card-stack"
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Can my non-EU company open a Marsa Business Account?",
            answer:
              "Yes. We onboard non-EU companies from 100+ jurisdictions, subject to compliance review.",
          },
          {
            question: "What documents do I need?",
            answer:
              "Certificate of incorporation, directors' IDs, proof of business activity, and beneficial owner declaration.",
          },
          {
            question: "How long does approval take?",
            answer:
              "Most Marsa business applications are approved within 24-48 hours.",
          },
          {
            question: "Do you support marketplaces like Amazon and Stripe?",
            answer:
              "Yes. Our European IBAN is accepted by Amazon, Stripe, PayPal, Shopify, and most major platforms.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Business"
        title="Manage Your Business Finance Globally With Marsa"
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="coin-warm"
      />
    </>
  );
}
