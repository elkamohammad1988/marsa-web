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
import { IconBank, IconCard, IconLock } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Form An EU Company & Open A Business Account",
  description:
    "Launch your EU company and open a business account in one flow. Marsa gives founders a multi-currency IBAN, fast onboarding and cards from day one.",
  path: "/solutions/company-formation",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Solutions" },
          { label: "Company Formation" },
        ]}
        title="Form Your EU Company And Bank In One Place"
        description="Incorporate in the EU and open a multi-currency business account with a real IBAN — ready before your first invoice goes out."
        chips={[
          { label: "EU IBAN" },
          { label: "Cards from day one" },
          { label: "Onboarding under 48h" },
        ]}
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="phone-home"
        tone="navy"
      />

      <FeatureBullets
        items={[
          {
            icon: <IconBank />,
            title: "A Real EU IBAN",
            description:
              "Receive your dedicated business IBAN as soon as the company is registered — no waiting weeks for a high-street bank.",
          },
          {
            icon: <IconCard />,
            title: "Cards From Day One",
            description:
              "Issue physical and virtual cards to founders and staff and start spending the moment you incorporate.",
          },
          {
            icon: <IconLock />,
            title: "Compliance Built In",
            description:
              "KYB, UBO and AML checks are handled digitally, so onboarding stays fast without cutting regulatory corners.",
          },
        ]}
      />

      <ProcessSteps
        eyebrow="How It Works"
        title="From Idea To Incorporated, Online"
        steps={[
          {
            number: "01",
            title: "Choose Your Structure",
            description:
              "Pick the EU jurisdiction and company type that fit your business, with guidance from our onboarding team.",
          },
          {
            number: "02",
            title: "Incorporate Online",
            description:
              "Submit your documents digitally and let us coordinate registration and verification end to end.",
          },
          {
            number: "03",
            title: "Bank On Day One",
            description:
              "Activate your Marsa Business account, receive your IBAN and issue cards as soon as the company is live.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Vs Traditional Banks"
        title="Why Founders Start With Marsa"
        rows={[
          { label: "Formation + Account", marsa: "One flow", traditional: "Two separate processes" },
          { label: "Account Opening Time", marsa: "From day one", traditional: "2-6 weeks" },
          { label: "IBAN Type", marsa: "Dedicated EU IBAN", traditional: "Local IBAN, if approved" },
          { label: "Cards", marsa: "Physical + virtual", traditional: "Ordered separately" },
          { label: "Currencies", marsa: "Multi-currency", traditional: "1-2" },
          { label: "Onboarding", marsa: "Fully digital", traditional: "In-branch appointment" },
        ]}
      />

      <CardShowcase
        eyebrow="Everything In One Onboarding"
        title="From Idea To First Invoice, Without The Bank Queue"
        description="Founders no longer need to incorporate first and then spend weeks chasing a business account. Marsa runs both in parallel."
        bullets={[
          "Multi-currency IBAN for EUR, USD and GBP",
          "Physical and virtual cards for the whole team",
          "Interbank exchange rates on every conversion",
          "Accounting exports and receipt capture",
          "A dedicated onboarding specialist",
          "SEPA and SWIFT from a single dashboard",
        ]}
        art="card-stack"
        cta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Which EU countries can I incorporate in?",
            answer:
              "Marsa supports company formation across several EU jurisdictions. Our onboarding team helps you choose the structure and country that suit your plans.",
          },
          {
            question: "How long does the whole process take?",
            answer:
              "Many founders go from application to a live company and active account within a week, depending on the jurisdiction and how quickly documents arrive.",
          },
          {
            question: "Do I get a business account automatically?",
            answer:
              "Yes. Formation and account opening run together, so your multi-currency IBAN and cards are ready as soon as the company is registered.",
          },
          {
            question: "What documents do I need to provide?",
            answer:
              "Typically proof of identity for each director and shareholder, plus company details for KYB and UBO verification. We guide you through each step.",
          },
        ]}
      />

      <CTACard
        eyebrow="For New Founders"
        title="Start Your EU Company With Marsa"
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        art="coin-warm"
      />
    </>
  );
}
