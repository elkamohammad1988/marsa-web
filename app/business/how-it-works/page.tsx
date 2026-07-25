import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Hero } from "@/components/sections/Hero";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { ComparisonTable } from "@/components/sections/ComparisonTable";
import { Testimonial } from "@/components/sections/Testimonial";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";

export const metadata: Metadata = buildMetadata({
  title: "How To Open EU Business Account Online",
  description:
    "See how to open an EU business account online with Marsa — submit your company documents, get approved in 24–48h, and receive an EU IBAN to send and receive SEPA.",
  path: "/business/how-it-works",
});

export default function Page() {
  return (
    <>
      <Hero
        breadcrumb={[
          { label: "Home", href: "/" },
          { label: "Business" },
          { label: "How It Works" },
        ]}
        title="How To Open EU Business Account Online"
        description="Personal And Business Accounts With A Multi-Currency IBAN. In Minutes, From Any Country."
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        imageSrc="/images/coin-gold.png"
        imageAlt="Marsa business coin"
        tone="navy"
      />

      <ProcessSteps
        eyebrow="3 Step Onboarding"
        title="Even Faster Than Most EU Business Banks"
        description="Everything you need to start banking — without going to a branch."
        steps={[
          {
            number: "01",
            title: "Submit Application",
            description: "Provide company documents online — incorporation, IDs, beneficial ownership.",
          },
          {
            number: "02",
            title: "Compliance Approves",
            description: "Our compliance team verifies your application within 24-48 hours.",
          },
          {
            number: "03",
            title: "Start Transacting",
            description: "Receive your EU IBAN and start sending and receiving payments.",
          },
        ]}
      />

      <ComparisonTable
        eyebrow="Marsa Business"
        title="Marsa Vs Traditional Banks"
        rows={[
          { label: "Account Opening", marsa: "Fully online", traditional: "In-person, 2-6 weeks" },
          { label: "Non-EU Companies", marsa: "Yes", traditional: "Often rejected" },
          { label: "EU IBAN", marsa: "Provided", traditional: "Limited" },
          { label: "Bulk Payments", marsa: "API + CSV", traditional: "Manual" },
          { label: "FX Markup", marsa: "0% (up to €10k)", traditional: "2-4%" },
          { label: "Support", marsa: "Dedicated", traditional: "Generic" },
        ]}
      />

      <Testimonial
        quote="Opened A Business Account Online In One Day — After Multiple EU Bank Rejections."
        authorName="Marco P."
        authorTitle="Founder, Verona"
      />

      <RegulatedBand />

      <FAQ
        items={[
          {
            question: "Who can apply for a Marsa Business Account?",
            answer:
              "Companies registered in 100+ jurisdictions can apply, subject to compliance review.",
          },
          {
            question: "What if my application is rejected?",
            answer:
              "We provide clear feedback so you can re-apply with additional documentation if needed.",
          },
          {
            question: "How much does it cost?",
            answer:
              "Business Starter is free. Growth and Enterprise tiers carry a monthly subscription with additional features.",
          },
          {
            question: "Can I migrate from another provider?",
            answer:
              "Yes. We offer a free white-glove migration service for established companies.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Business"
        title="Manage Your Business Finance Globally"
        primaryCta={{ label: "Open A Business Account", href: "/get-started?type=business" }}
        secondaryCta={{ label: "Talk To Sales", href: "/contact?topic=sales" }}
        imageSrc="/images/card-phone.png"
        imageAlt="Marsa Business app"
      />
    </>
  );
}
