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
import { IconLightning, IconShield, IconCoin } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Free SEPA Transfer Personal Account",
  description:
    "Send free, instant SEPA transfers with a Marsa personal account. Money moves across all 36 SEPA countries in under 10 seconds — no fees, no EU residency required.",
  path: "/personal/sepa-transfers",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Personal" },
          { label: "SEPA Transfers" },
        ]}
        title="Free SEPA Transfer Personal Account — No EU Residency Required"
        description="European SEPA Payments For Modern Lifestyles. Send Money Across All 36 SEPA Countries For Free."
        primaryCta={{ label: "Open A Personal Account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="card-stack"
        tone="cream"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconLightning />,
            title: "Instant SEPA Transfers",
            description:
              "Send and receive SEPA payments in under 10 seconds to any EU bank account.",
          },
          {
            icon: <IconCoin />,
            title: "Zero Transfer Fees",
            description:
              "All standard SEPA transfers are free, regardless of amount or destination country.",
          },
          {
            icon: <IconShield />,
            title: "Bank-Grade Security",
            description:
              "End-to-end encryption, biometric authentication, and 24/7 fraud monitoring.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How It Works"
        title="Send SEPA Payments In 3 Easy Steps"
        steps={[
          {
            number: "01",
            title: "Open Marsa",
            description: "Sign up online in under 5 minutes and complete KYC.",
          },
          {
            number: "02",
            title: "Add Recipient",
            description: "Enter any European IBAN — we'll verify it in real time.",
          },
          {
            number: "03",
            title: "Send Instantly",
            description: "Transfer with one tap. Track status live until settled.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="See How SEPA Should Work"
        rows={[
          { label: "Settlement Time", marsa: "< 10 seconds", traditional: "1-2 business days" },
          { label: "Transfer Fee", marsa: "€0", traditional: "€0-3 per transfer" },
          { label: "Daily Limit", marsa: "€50,000", traditional: "€10,000" },
          { label: "Mobile Support", marsa: "Full-feature", traditional: "Limited" },
          { label: "Cancel In Flight", marsa: "Yes (within 5 sec)", traditional: "No" },
          { label: "Multi-Currency", marsa: "15+ currencies", traditional: "EUR only" },
        ]}
      />

      <CardShowcase
        eyebrow="The Card"
        title="Spend Anywhere With The Marsa Card"
        description="Pair your SEPA account with a Marsa card for real-time spend control everywhere."
        bullets={[
          "Real-time payment notifications",
          "Apple & Google Pay support",
          "Freeze instantly from the app",
          "Free ATM withdrawals",
          "Auto-categorised spending",
          "Tap to send to a friend",
        ]}
        art="card-stack"
        reverse
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Is SEPA really free with Marsa?",
            answer:
              "Yes — standard SEPA transfers are free on all plans, with no monthly cap.",
          },
          {
            question: "Which SEPA countries are supported?",
            answer:
              "All 36 SEPA countries are supported, including all EU/EEA states, the UK, Switzerland, Monaco, and others.",
          },
          {
            question: "Can I receive SEPA salaries?",
            answer:
              "Yes. Your Marsa IBAN works like any other European bank account for salary deposits.",
          },
          {
            question: "How fast are SEPA transfers?",
            answer:
              "SEPA Instant transfers settle in under 10 seconds. Standard SEPA settles within the same business day.",
          },
        ]}
      />

      <CTACard
        title="Fast SEPA, Your Way"
        description="Open a free Marsa personal account and start sending SEPA payments today."
        primaryCta={{ label: "Open A Personal Account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="coin"
      />
    </>
  );
}
