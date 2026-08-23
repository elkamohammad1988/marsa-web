import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { AccountPreview } from "@/components/sections/AccountPreview";
import { RateTicker } from "@/components/sections/RateTicker";
import { CorridorMap } from "@/components/sections/CorridorMap";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { CurrencyConverter } from "@/components/sections/CurrencyConverter";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { CardShowcase } from "@/components/sections/CardShowcase";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { IconGlobe, IconExchange, IconShield } from "@/components/icons";

const title = "Marsa multi-currency accounts for cross-border business";
// Kept under 160 characters: past that Google truncates in the results page,
// and the clause that gets cut is always the last one — which is where a
// description written long tends to put the audience it is trying to reach.
const description =
  "Open a European multi-currency IBAN. Get paid by marketplaces and clients abroad, hold 30+ currencies, convert at interbank rates, and send free SEPA.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    title,
    description,
    url: absoluteUrl("/"),
    siteName: siteConfig.name,
    type: "website",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title, description },
};

export default function HomePage() {
  return (
    <>
      <Hero
        eyebrow="Cross-border money, done right"
        title="One account for every currency"
        titleAccent="you get paid in."
        description="Marsa gives you a European multi-currency IBAN: receive marketplace payouts and client invoices from abroad, hold 30+ currencies, convert at the interbank rate, and pay out over SEPA, without a second bank in the middle."
        chips={[
          { label: "European IBAN" },
          { label: "30+ currencies" },
          { label: "SEPA & SWIFT" },
        ]}
        primaryCta={{ label: "Open an account", href: "/get-started" }}
        secondaryCta={{ label: "Try the demo", href: "/demo" }}
        footnote="Free plan available · Online application in about 5 minutes · No branch visit"
        visual={<AccountPreview />}
        stats={[
          { value: "30+", label: "Currencies in one account" },
          { value: "€0", label: "Standard SEPA transfers" },
          { value: "~5 min", label: "To complete an application" },
          { value: "180+", label: "Countries we onboard from" },
        ]}
        tone="spotlight"
      />

      <RateTicker />

      <FeatureBullets
        items={[
          {
            icon: <IconGlobe />,
            title: "Multi-Currency IBAN",
            description:
              "Receive a real European IBAN in your own name and hold 30+ currencies from a single account, personal or business.",
          },
          {
            icon: <IconExchange />,
            title: "Free SEPA, low-cost SWIFT",
            description:
              "Send free SEPA transfers across 36 countries and low-cost SWIFT payments worldwide, all from one place.",
          },
          {
            icon: <IconShield />,
            title: "Safeguarded by design",
            description:
              "The model a product like this needs: licensed partner institutions holding customer balances in segregated safeguarding accounts, separate from the operator's own funds.",
          },
        ]}
      />

      <CorridorMap />

      <CurrencyConverter
        headingLevel="h2"
        title="See Live Exchange Rates"
        subtitle="Try our free converter with real European Central Bank rates across 30 currencies, then get the same interbank rate on every Marsa conversion."
      />

      <ProcessSteps
        eyebrow="Get Started"
        title="Open your account in 3 steps"
        description="No branch visits, no paperwork, fully online from any device."
        steps={[
          { number: "01", title: "Sign Up", description: "Create your free account online in about 5 minutes." },
          { number: "02", title: "Verify Your Identity", description: "Complete our secure digital KYC, available in 180+ countries." },
          { number: "03", title: "Start Getting Paid", description: "Receive your IBAN and start sending, receiving, and converting." },
        ]}
      />

      <CardShowcase
        eyebrow="The Marsa Card"
        title="Spend anywhere, without the hidden fees"
        description="Pair your account with a Marsa card for real-time control and interbank rates everywhere you go."
        bullets={[
          "Apple Pay & Google Pay",
          "Real-time spend notifications",
          "Freeze or unfreeze instantly",
          "Free ATM withdrawals up to your limit",
          "Virtual & disposable cards",
          "Auto-categorised spending",
        ]}
        art="card-and-phone"
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="Banking without the friction"
        rows={[
          { label: "Account Opening", marsa: "Online, ~5 min", traditional: "Branch visit, 1-4 weeks" },
          { label: "Residency Required", marsa: "No", traditional: "Usually yes" },
          { label: "Currencies", marsa: "30+", traditional: "1-3" },
          { label: "SEPA Transfers", marsa: "Free, instant", traditional: "Free, 1-2 days" },
          { label: "FX Rate", marsa: "Interbank", traditional: "2-4% markup" },
          { label: "Support", marsa: "Fast, human", traditional: "Generic call centre" },
        ]}
      />

      <RegulatedBand />

      <FAQ
        title="Frequently Asked Questions"
        description="The essentials about opening and using a Marsa account."
        items={[
          {
            question: "Is it free to open a Marsa account?",
            answer:
              "Yes. Opening a Marsa Classic or Business Starter account is free and takes about 5 minutes. You only pay if you choose a premium plan.",
          },
          {
            question: "Do I need to live in the EU?",
            answer:
              "No. Marsa issues European multi-currency IBANs to residents of 180+ countries. Physical cards ship to EU and UK addresses.",
          },
          {
            question: "How safe is my money?",
            answer:
              "Marsa is a concept build and holds no funds. In the product it describes, customer money would sit in segregated safeguarding accounts at licensed partner institutions, separate from the operator's own funds.",
          },
          {
            question: "What does it cost to send money?",
            answer:
              "Standard SEPA transfers are free on every plan. SWIFT transfers carry a low flat fee, and you convert currencies at the interbank rate up to your plan's monthly allowance.",
          },
        ]}
      />

      <CTACard
        eyebrow="For individuals & business"
        title="Your money, accessible everywhere you go"
        description="Low FX fees, free SEPA transfers, and support across 180+ countries."
        primaryCta={{ label: "Open an account", href: "/get-started" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="coin"
        footnote="Physical cards available for Europe and UK customers only. All other features (IBAN, SEPA, SWIFT, FX conversion) are available worldwide."
      />
    </>
  );
}
