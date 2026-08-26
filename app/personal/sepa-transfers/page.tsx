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
    "Send free, instant SEPA transfers with a Marsa personal account, across all 36 SEPA countries in under 10 seconds, no EU residency required.",
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
        title="Free SEPA Transfer Personal Account. No EU Residency Required"
        description="European SEPA payments for modern lifestyles. Send money across all 36 SEPA countries for free."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        // `phone-home`, not `card-stack`. The showcase further down this page
        // is *about* the card and draws the stack there, so the hero was
        // showing the reader the same picture twice — and showing a fan of
        // cards above a headline about SEPA transfers. The phone screen has the
        // balance and the Send action on it, which is what this page is for.
        art="phone-home"
        tone="alt"
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
            title: "Account Security",
            description:
              "Signed, expiring sessions, rate-limited sign-in, and a strict Content-Security-Policy, each one implemented in this build rather than promised.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="Send SEPA payments in 3 easy steps"
        steps={[
          {
            number: "01",
            title: "Open Marsa",
            description: "Sign up online in under 5 minutes and complete KYC.",
          },
          {
            number: "02",
            title: "Add Recipient",
            description: "Enter any European IBAN and we'll verify it in real time.",
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
          { label: "Settlement Time", subject: "< 10 seconds", comparator: "1-2 business days" },
          { label: "Transfer Fee", subject: "€0", comparator: "€0-3 per transfer" },
          { label: "Daily Limit", subject: "€50,000", comparator: "€10,000" },
          { label: "Mobile Support", subject: "Full-feature", comparator: "Limited" },
          { label: "Cancel in flight", subject: "Yes (within 5 sec)", comparator: "No" },
          { label: "Multi-Currency", subject: "30+ currencies", comparator: "EUR only" },
        ]}
      />

      <CardShowcase
        eyebrow="The Card"
        title="Spend anywhere with the Marsa card"
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
              "Yes. Standard SEPA transfers are free on all plans, with no monthly cap.",
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
        title="Fast SEPA, your way"
        description="Open a free Marsa personal account and start sending SEPA payments today."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
      />
    </>
  );
}
