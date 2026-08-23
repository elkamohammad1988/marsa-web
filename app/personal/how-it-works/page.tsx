import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";

export const metadata: Metadata = buildMetadata({
  title: "How to open EU bank account online",
  description:
    "Open an EU account online with Marsa: sign up in minutes from any country, verify your ID, and get a multi-currency IBAN, no EU residency needed.",
  path: "/personal/how-it-works",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Personal" },
          { label: "How it works" },
        ]}
        title="How to open EU bank account online"
        description="Personal and business accounts with a multi-currency IBAN. In minutes, from any country, 100% online."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="phone-accounts"
        tone="canvas"
      />

      <ProcessSteps
        eyebrow="3 Simple Steps"
        title="Even Simpler Than Most Personal Banks"
        description="Everything you need to open a Marsa Personal Account online, no branch, no paperwork."
        steps={[
          {
            number: "01",
            title: "Try Marsa App",
            description:
              "Download the Marsa app and create your free account in under five minutes.",
          },
          {
            number: "02",
            title: "Pay with Marsa",
            description:
              "Transfer money worldwide and pay across 180+ countries with your Marsa card.",
          },
          {
            number: "03",
            title: "Receive Faster",
            description:
              "Get your personal IBAN delivered instantly to start receiving SEPA transfers.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Compare Marsa"
        title="Marsa Personal Vs Traditional Banks"
        rows={[
          { label: "Account Opening", marsa: "Online, 5 min", traditional: "Branch visit, 1-3 weeks" },
          { label: "Residency Required", marsa: "No", traditional: "Yes" },
          { label: "Multi-Currency", marsa: "30+ currencies", traditional: "EUR only" },
          { label: "FX Fees", marsa: "Interbank rate", traditional: "2-4% markup" },
          { label: "SWIFT Fees", marsa: "Low flat fee", traditional: "€20-40 per transfer" },
          { label: "Mobile App", marsa: "Award-winning", traditional: "Limited features" },
        ]}
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "How long does account opening take?",
            answer:
              "Most Marsa accounts are opened within 5 minutes, with KYC verification taking 1-24 hours.",
          },
          {
            question: "Do I need to be an EU resident?",
            answer:
              "No. Marsa accepts customers from 180+ countries with valid identification documents.",
          },
          {
            question: "Can I get a physical card?",
            answer:
              "Yes. Physical Marsa cards are shipped within 5-7 business days to all EU/UK addresses.",
          },
          {
            question: "Is there a minimum deposit?",
            answer:
              "No minimum deposit is required to open and maintain a Marsa personal account.",
          },
        ]}
      />

      <CTACard
        title="Simplify your finance wherever life takes you"
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="card-stack"
      />
    </>
  );
}
