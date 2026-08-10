import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { IconExchange, IconGlobe, IconShield } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Multi-currency accounts for import & export businesses",
  description:
    "Pay overseas suppliers and collect from international buyers at interbank FX, with multi-currency IBANs built for import-export businesses.",
  path: "/solutions/import-export",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Solutions" },
          { label: "Import & Export" },
        ]}
        title="Multi-currency accounts for import & export businesses"
        description="Pay overseas suppliers and collect from international buyers in one account — at real exchange rates, with fast SEPA and SWIFT settlement."
        chips={[
          { label: "40+ currencies" },
          { label: "SEPA + SWIFT" },
          { label: "Interbank FX" },
        ]}
        primaryCta={{ label: "Open a business account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact?topic=sales" }}
        art="phone-accounts"
        tone="deep"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconExchange />,
            title: "Hold 40+ Currencies",
            description:
              "Keep EUR, USD, GBP, CNY and more in one account and convert only when the rate protects your margin.",
          },
          {
            icon: <IconGlobe />,
            title: "Pay suppliers worldwide",
            description:
              "Send SWIFT and SEPA payments to manufacturers across Asia, Europe and the Americas with transparent, upfront fees.",
          },
          {
            icon: <IconShield />,
            title: "Lock in your landed cost",
            description:
              "Convert at interbank rates so currency swings never quietly erode the margin on a shipment.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="Move goods and money across borders"
        steps={[
          {
            number: "01",
            title: "Open Marsa Business",
            description:
              "Apply online and clear compliance in as little as 48 hours — no branch visit required.",
          },
          {
            number: "02",
            title: "Fund in any currency",
            description:
              "Receive from buyers or top up in EUR, USD, GBP and more using local rails and your own IBAN.",
          },
          {
            number: "03",
            title: "Pay & convert on demand",
            description:
              "Settle supplier invoices and convert balances at interbank rates the moment your purchase order is confirmed.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="Why Trading Businesses Switch"
        rows={[
          { label: "Supplier Payments", marsa: "SEPA + SWIFT, upfront fees", traditional: "SWIFT only, hidden fees" },
          { label: "FX Markup", marsa: "Interbank + 0.3%", traditional: "2-4%" },
          { label: "Currencies Held", marsa: "40+", traditional: "1-2" },
          { label: "Incoming SWIFT Fee", marsa: "Flat, disclosed", traditional: "Lifting fees apply" },
          { label: "Settlement Speed", marsa: "Same-day SEPA", traditional: "2-5 days" },
          { label: "Account Manager", marsa: "Dedicated", traditional: "Call centre" },
        ]}
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Can I pay suppliers outside the EU?",
            answer:
              "Yes. Marsa supports SWIFT payments to suppliers across Asia, the Americas and beyond, alongside instant SEPA transfers within Europe.",
          },
          {
            question: "Which currencies can I hold?",
            answer:
              "You can hold and convert 40+ currencies, including EUR, USD, GBP, CNY, JPY and CHF, all inside a single business account.",
          },
          {
            question: "How are your exchange rates set?",
            answer:
              "Conversions use the live interbank mid-market rate with a small, transparent margin — never a hidden spread baked into the price.",
          },
          {
            question: "Do incoming payments carry hidden fees?",
            answer:
              "No. Marsa discloses any receiving fee upfront, so lifting and correspondent charges never surprise you on international transfers.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Import & Export"
        title="Trade globally on one account"
        primaryCta={{ label: "Open a business account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact?topic=sales" }}
        art="coin-warm"
      />
    </>
  );
}
