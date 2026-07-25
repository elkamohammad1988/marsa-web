import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { Testimonial } from "@/components/sections/Testimonial";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { IconExchange, IconGlobe, IconShield } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Multi-Currency Accounts For Import & Export Businesses",
  description:
    "Pay overseas suppliers and collect from international buyers at interbank FX. Marsa gives import-export businesses multi-currency IBANs and fast global payments.",
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
        title="Multi-Currency Accounts For Import & Export Businesses"
        description="Pay overseas suppliers and collect from international buyers in one account — at real exchange rates, with fast SEPA and SWIFT settlement."
        chips={[
          { label: "40+ currencies" },
          { label: "SEPA + SWIFT" },
          { label: "Interbank FX" },
        ]}
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        imageSrc="/images/phone-apps.png"
        imageAlt="Marsa multi-currency account for importers and exporters"
        tone="navy"
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
            title: "Pay Suppliers Worldwide",
            description:
              "Send SWIFT and SEPA payments to manufacturers across Asia, Europe and the Americas with transparent, upfront fees.",
          },
          {
            icon: <IconShield />,
            title: "Lock In Your Landed Cost",
            description:
              "Convert at interbank rates so currency swings never quietly erode the margin on a shipment.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How It Works"
        title="Move Goods And Money Across Borders"
        steps={[
          {
            number: "01",
            title: "Open Marsa Business",
            description:
              "Apply online and clear compliance in as little as 48 hours — no branch visit required.",
          },
          {
            number: "02",
            title: "Fund In Any Currency",
            description:
              "Receive from buyers or top up in EUR, USD, GBP and more using local rails and your own IBAN.",
          },
          {
            number: "03",
            title: "Pay & Convert On Demand",
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

      <Testimonial
        quote="We import ceramics from three countries and used to lose thousands each quarter to bank FX spreads. With Marsa we hold euros and dollars, pay our factories the same day, and finally know our landed cost before the container ships."
        authorName="Marco Bianchi"
        authorTitle="Founder, Terra Imports — Milan"
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
        title="Trade Globally On One Account"
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        imageSrc="/images/coin-gold.png"
        imageAlt="Marsa multi-currency coin"
      />
    </>
  );
}
