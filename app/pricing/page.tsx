import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { PricingHeader } from "@/components/sections/PricingHeader";
import { CTACard } from "@/components/sections/CTACard";
import { FAQ } from "@/components/sections/FAQ";

export const metadata: Metadata = buildMetadata({
  title: "Pricing",
  description:
    "Compare Marsa accounts and cards. Find the plan that fits your needs: Classic, Plus, or Premium.",
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
              "Marsa issues European multi-currency IBANs to residents of 180+ countries. Physical cards ship to EU and UK addresses.",
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
        eyebrow="For individuals"
        title="Your Money, Accessible Everywhere You Go"
        description="Interbank FX rates, free SEPA transfers, and support across 180+ countries."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        // Not "See Pricing": this is the pricing page, and a call to action
        // that reloads the page it sits on is a dead control.
        secondaryCta={{ label: "Try the demo", href: "/demo" }}
        art="coin"
        footnote="Physical cards available for Europe and UK customers only. All other features (IBAN, SEPA, SWIFT, FX conversion) are available worldwide."
      />
    </>
  );
}
