import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { IconDocument, IconCoin, IconClock } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Business accounts for agencies & freelancers",
  description:
    "Invoice international clients and get paid in their currency. Marsa gives agencies and freelancers multi-currency IBANs, interbank FX and same-day SEPA payouts.",
  path: "/solutions/agencies-freelancers",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Solutions" },
          { label: "Agencies & Freelancers" },
        ]}
        title="Get paid by international clients in their currency"
        description="Invoice in EUR, USD or GBP, receive with local account details, and keep more of every fee with interbank exchange rates."
        chips={[
          { label: "Local EUR, USD, GBP details" },
          { label: "Interbank FX" },
          { label: "Free SEPA payouts" },
        ]}
        primaryCta={{ label: "Open a business account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact?topic=sales" }}
        art="card-and-phone"
        tone="deep"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconDocument />,
            title: "Invoice in any currency",
            description:
              "Share local account details so clients pay you in their own currency without costly international wires.",
          },
          {
            icon: <IconCoin />,
            title: "Keep more of each fee",
            description:
              "Convert client payments at interbank rates instead of losing 3-4% to a high-street bank spread.",
          },
          {
            icon: <IconClock />,
            title: "Get paid faster",
            description:
              "Same-day SEPA and local receiving mean invoices clear in hours, not the usual multi-day wait.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How it works"
        title="From invoice to paid, without the FX loss"
        steps={[
          {
            number: "01",
            title: "Open Marsa Business",
            description:
              "Register as a freelancer or agency and pass compliance online in as little as 48 hours.",
          },
          {
            number: "02",
            title: "Add your details to invoices",
            description:
              "Give clients local EUR, USD and GBP account details so they pay you as if you were down the street.",
          },
          {
            number: "03",
            title: "Convert & Withdraw",
            description:
              "Move earnings to your home currency at interbank rates and pay yourself whenever you like.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="Why Independent Businesses Choose Marsa"
        rows={[
          { label: "Client Payment Options", marsa: "Local EUR, USD, GBP", traditional: "SWIFT wire only" },
          { label: "FX on payouts", marsa: "Interbank + 0.3%", traditional: "3-4%" },
          { label: "SEPA Payouts", marsa: "Free, same day", traditional: "€5-15 each" },
          { label: "Monthly Fee", marsa: "From €0", traditional: "€10-25" },
          { label: "Client Sub-Accounts", marsa: "Yes", traditional: "No" },
          { label: "Setup Time", marsa: "Under 48h", traditional: "1-3 weeks" },
        ]}
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Can clients pay me in their local currency?",
            answer:
              "Yes. Marsa gives you local EUR, USD and GBP details so clients can pay domestically, and you receive the funds in one account.",
          },
          {
            question: "Is Marsa suitable for sole traders?",
            answer:
              "Absolutely. Both registered agencies and self-employed freelancers can open a Marsa Business account and invoice international clients.",
          },
          {
            question: "How much do transfers cost?",
            answer:
              "SEPA payments are free and same day. Currency conversion uses the interbank rate with a small, transparent margin shown before you confirm.",
          },
          {
            question: "Can I separate income by client or project?",
            answer:
              "Yes. You can organise incoming payments across sub-accounts to track each client or retainer without opening multiple bank accounts.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Agencies & Freelancers"
        title="Invoice the world, keep more of it"
        primaryCta={{ label: "Open a business account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk to sales", href: "/contact?topic=sales" }}
        art="coin"
      />
    </>
  );
}
