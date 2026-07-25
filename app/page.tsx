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
import { TrustStrip } from "@/components/sections/TrustStrip";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { IconGlobe, IconExchange, IconShield } from "@/components/icons";

const title = "Marsa — Multi-Currency Accounts For Cross-Border Business";
const description =
  "Open a European multi-currency IBAN with Marsa. Get paid by marketplaces and clients abroad, convert at interbank rates, and send free SEPA transfers — for freelancers, sellers and businesses.";

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
        description="Marsa gives you a European multi-currency IBAN: receive marketplace payouts and client invoices from abroad, hold 30+ currencies, convert at the interbank rate, and pay out over SEPA — without a second bank in the middle."
        chips={[
          { label: "European IBAN" },
          { label: "30+ currencies" },
          { label: "SEPA & SWIFT" },
        ]}
        primaryCta={{ label: "Open An Account", href: "/get-started" }}
        secondaryCta={{ label: "Try The Demo", href: "/demo" }}
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

      <TrustStrip />

      <FeatureBullets
        items={[
          {
            icon: <IconGlobe />,
            title: "Multi-Currency IBAN",
            description:
              "Receive a real European IBAN in your own name and hold 30+ currencies from a single account — personal or business.",
          },
          {
            icon: <IconExchange />,
            title: "Free SEPA, Low-Cost SWIFT",
            description:
              "Send free SEPA transfers across 36 countries and low-cost SWIFT payments worldwide, all from one place.",
          },
          {
            icon: <IconShield />,
            title: "Safeguarded By Design",
            description:
              "Accounts run on licensed partner institutions, and your balance sits in segregated safeguarding accounts kept separate from ours.",
          },
        ]}
      />

      <CorridorMap />

      <CurrencyConverter
        headingLevel="h2"
        title="See Live Exchange Rates"
        subtitle="Try our free converter with real European Central Bank rates across 30 currencies — then get the same interbank rate on every Marsa conversion."
      />

      <ProcessSteps
        eyebrow="Get Started"
        title="Open Your Account In 3 Steps"
        description="No branch visits, no paperwork — fully online from any device."
        steps={[
          { number: "01", title: "Sign Up", description: "Create your free account online in about 5 minutes." },
          { number: "02", title: "Verify Your Identity", description: "Complete our secure digital KYC — available in 180+ countries." },
          { number: "03", title: "Start Getting Paid", description: "Receive your IBAN and start sending, receiving, and converting." },
        ]}
      />

      <CardShowcase
        eyebrow="Marsa Mastercard"
        title="Spend Anywhere, Without The Hidden Fees"
        description="Pair your account with a Marsa Mastercard for real-time control and interbank rates everywhere you go."
        bullets={[
          "Apple Pay & Google Pay",
          "Real-time spend notifications",
          "Freeze or unfreeze instantly",
          "Free ATM withdrawals up to your limit",
          "Virtual & disposable cards",
          "Auto-categorised spending",
        ]}
        imageSrc="/images/card-phone.png"
        imageAlt="Marsa Mastercard and mobile app"
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="Banking Without The Friction"
        rows={[
          { label: "Account Opening", marsa: "Online, ~5 min", traditional: "Branch visit, 1–4 weeks" },
          { label: "Residency Required", marsa: "No", traditional: "Usually yes" },
          { label: "Currencies", marsa: "30+", traditional: "1–3" },
          { label: "SEPA Transfers", marsa: "Free, instant", traditional: "Free, 1–2 days" },
          { label: "FX Rate", marsa: "Interbank", traditional: "2–4% markup" },
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
              "Marsa runs on licensed partner institutions. Customer funds are safeguarded in segregated accounts at those partners, separate from Marsa's own funds, so they stay protected even in the unlikely event of our insolvency.",
          },
          {
            question: "What does it cost to send money?",
            answer:
              "Standard SEPA transfers are free on every plan. SWIFT transfers carry a low flat fee, and you convert currencies at the interbank rate up to your plan's monthly allowance.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Individuals & Business"
        title="Your Money, Accessible Everywhere You Go"
        description="Low FX fees, free SEPA transfers, and support across 180+ countries."
        primaryCta={{ label: "Open An Account", href: "/get-started" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
        footnote="Physical cards available for Europe and UK customers only. All other features — IBAN, SEPA, SWIFT, FX conversion — are available worldwide."
      />
    </>
  );
}
