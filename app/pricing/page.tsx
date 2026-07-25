import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PricingHeader } from "@/components/sections/PricingHeader";
import { CTACard } from "@/components/sections/CTACard";
import { FAQ } from "@/components/sections/FAQ";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description:
    "Compare Marsa accounts and cards. Find the plan that fits your needs — Classic, Plus, or Premium.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <PricingHeader />

      <FAQ
        title="Frequently Asked Questions"
        description="Everything you need to know about Marsa accounts, cards, and fees."
        items={[
          {
            question: "Is there a fee to open a Marsa account?",
            answer:
              "No. Opening a Marsa Classic account is completely free and takes less than 5 minutes. You only pay for premium features if you upgrade.",
          },
          {
            question: "Which countries are supported?",
            answer:
              "Marsa supports residents of 30+ EU/EEA countries and the UK. Card delivery is available across the same region.",
          },
          {
            question: "Can I switch between plans later?",
            answer:
              "Yes. You can upgrade or downgrade at any time directly from the Marsa app, and changes take effect on your next billing cycle.",
          },
          {
            question: "Do you charge for SEPA transfers?",
            answer:
              "Standard SEPA transfers are free on all plans. SWIFT transfers carry a low flat fee that decreases as you upgrade.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Individuals"
        title="Your Money, Accessible Everywhere You Go"
        description="Up To 2% FX Fees, Free SEPA Transfers, And Support In 180+ Countries."
        primaryCta={{ label: "Open A Personal Account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
        footnote="Physical Cards Available For Europe And UK Customers Only. All Other Features — IBAN, SEPA, SWIFT, FX Conversion — Are Available Worldwide."
      />
    </>
  );
}
