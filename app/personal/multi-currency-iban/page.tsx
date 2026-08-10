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
import { IconGlobe, IconExchange, IconShield } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Multi-currency IBAN for expats and non-residents",
  description:
    "A multi-currency IBAN account for expats and non-residents. Open a European IBAN online and hold, convert, and spend in 15+ currencies at real interbank rates.",
  path: "/personal/multi-currency-iban",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Personal" },
          { label: "Multi-Currency IBAN" },
        ]}
        title="Multi-currency IBAN account for expats and non-residents"
        description="European multi-currency account for modern lifestyles. Hold, convert, and spend in 15+ currencies from a single IBAN."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="phone-home"
        tone="alt"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconGlobe />,
            title: "Welcome to Marsa",
            description:
              "Open a European IBAN in minutes — even if you don't live in the EU. Receive SEPA payments instantly.",
          },
          {
            icon: <IconExchange />,
            title: "Free FX Conversion",
            description:
              "Convert between 15+ currencies at the real interbank rate, with no markup on the first €5,000.",
          },
          {
            icon: <IconShield />,
            title: "Safeguarded Funds",
            description:
              "Funds are safeguarded with regulated partner banks across the EU and UK.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="Open your IBAN in 3 steps"
        description="Everything you need to start receiving payments from European clients."
        steps={[
          {
            number: "01",
            title: "Sign Up",
            description:
              "Create your Marsa account in under 5 minutes — fully online from any device.",
          },
          {
            number: "02",
            title: "Verify Identity",
            description:
              "Verify your ID via our automated KYC flow. We support 180+ countries.",
          },
          {
            number: "03",
            title: "Get your IBAN",
            description:
              "Receive your personal European IBAN, ready to receive SEPA transfers worldwide.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="A modern account without the banking friction"
        rows={[
          { label: "Account Opening", marsa: "Online, 5 min", traditional: "Branch visit, 2-4 weeks" },
          { label: "Verification", marsa: "Fully Digital", traditional: "Paper documentation" },
          { label: "Multi-Currency", marsa: "15+ currencies", traditional: "Usually EUR only" },
          { label: "FX Fees", marsa: "Real interbank rate", traditional: "2-4% markup" },
          { label: "SEPA Transfers", marsa: "Free, instant", traditional: "Free, 1-2 days" },
          { label: "Mobile App", marsa: "Native, full-feature", traditional: "Limited" },
        ]}
      />

      <CardShowcase
        eyebrow="The Card"
        title="The Marsa Card"
        description="Premium spending in 180+ countries with no hidden FX fees and instant transaction alerts."
        bullets={[
          "Free withdrawals up to €200/month",
          "Real-time spending insights",
          "Apple Pay & Google Pay",
          "Tap to pay worldwide",
          "Lock or freeze instantly",
          "Disposable virtual cards",
        ]}
        art="card-and-phone"
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Who can open a Marsa personal account?",
            answer:
              "Residents of 180+ countries can open a Marsa personal account, subject to identity verification.",
          },
          {
            question: "Is my money safe with Marsa?",
            answer:
              "Yes. Customer funds are safeguarded in segregated accounts with our regulated partner banks across the EU and UK.",
          },
          {
            question: "Can I receive my salary in my Marsa IBAN?",
            answer:
              "Yes. Your Marsa IBAN works like any other European bank account for SEPA transfers — including salary payments.",
          },
          {
            question: "Are there any monthly fees?",
            answer:
              "The Classic plan is completely free. Plus and Premium are subscription-based with additional perks.",
          },
        ]}
      />

      <CTACard
        title="Bring your finance wherever life takes you"
        description="Open a free Marsa personal account and start receiving SEPA payments in minutes."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="coin"
      />
    </>
  );
}
