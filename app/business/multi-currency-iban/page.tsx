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
import { IconGlobe, IconExchange, IconBank } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Multi-Currency IBAN Business Account",
  description:
    "Open a European multi-currency business IBAN with Marsa. Hold, convert, and pay in 15+ currencies at interbank rates — no EU residency needed.",
  path: "/business/multi-currency-iban",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Business" },
          { label: "Multi-Currency IBAN" },
        ]}
        title="Multi-Currency IBAN Business Account — No EU Residency Needed"
        description="European Multi-Currency Business IBAN. Hold, Convert, And Pay In 15+ Currencies — All From A Single Account."
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="card-stack"
        tone="navy"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconGlobe />,
            title: "15+ Currencies, 1 IBAN",
            description:
              "Hold EUR, USD, GBP, CHF, JPY, AUD and more — settle in your home currency anytime.",
          },
          {
            icon: <IconExchange />,
            title: "Interbank FX",
            description:
              "Real-time interbank rates with no markup on the first €10,000/month.",
          },
          {
            icon: <IconBank />,
            title: "Local Receiving Details",
            description:
              "UK Sort Code, EU IBAN, US ACH and more — receive like a local everywhere.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How It Works"
        title="Set Up In 3 Steps"
        steps={[
          { number: "01", title: "Open Marsa Business", description: "Submit your company documents online." },
          { number: "02", title: "Verify Company", description: "Our team approves within 24-48h." },
          { number: "03", title: "Start Transacting", description: "Receive, hold, and convert across 15+ currencies." },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="Built For Cross-Border Operations"
        rows={[
          { label: "Currencies Supported", marsa: "15+", traditional: "1-3" },
          { label: "FX Markup", marsa: "0% (up to €10k)", traditional: "2-4%" },
          { label: "Local Receiving", marsa: "EU + UK + US", traditional: "Home country only" },
          { label: "Bulk Payments", marsa: "Native + API", traditional: "Manual" },
          { label: "SWIFT Out", marsa: "Low flat fee", traditional: "€20-40" },
          { label: "Support", marsa: "Dedicated", traditional: "Generic" },
        ]}
      />

      <CardShowcase
        eyebrow="Business Card"
        title="Issue Cards To Your Team Instantly"
        description="Spin up virtual cards in seconds, enforce spend rules, and reconcile in your accounting software."
        bullets={[
          "Unlimited virtual cards",
          "Per-card spending rules",
          "Real-time transactions",
          "Accounting exports (Xero, QuickBooks)",
          "Multi-user permissions",
          "Receipt capture",
        ]}
        art="card-and-phone"
        reverse
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Which currencies can I hold?",
            answer:
              "EUR, USD, GBP, CHF, AUD, CAD, JPY, CNY, NOK, SEK, DKK, PLN, HUF, CZK, RON and more.",
          },
          {
            question: "Can I receive USD as a non-US company?",
            answer:
              "Yes. We provide local ACH receiving details that work for US clients and marketplaces.",
          },
          {
            question: "Is there an FX markup?",
            answer:
              "Conversions up to €10,000/month are at real interbank rates with no markup. Above that, a small 0.4% applies.",
          },
          {
            question: "Does Marsa support FX hedging?",
            answer:
              "Yes — forward FX and limit orders are available on Growth and Enterprise plans.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Business"
        title="Your Business, Limitless"
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="coin-warm"
      />
    </>
  );
}
