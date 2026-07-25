import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { FAQ } from "@/components/sections/FAQ";
import { JsonLd } from "@/components/JsonLd";
import { faqSchema } from "@/lib/schema";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about Marsa accounts, cards, SEPA and SWIFT transfers, FX, fees, and security.",
  path: "/faq",
});

const accounts = [
  {
    question: "Who can open a Marsa account?",
    answer:
      "Residents of 180+ countries can open a personal account, and companies from 100+ jurisdictions can open a business account, subject to identity verification and our acceptance policies.",
  },
  {
    question: "How long does it take to open an account?",
    answer:
      "Personal accounts are typically ready in about 5 minutes, with identity checks completing within a few hours. Business applications are usually approved within 24–48 hours.",
  },
  {
    question: "Do I need to be an EU resident?",
    answer:
      "No. Marsa issues European multi-currency IBANs to non-residents. Physical cards are available to EU and UK addresses; all other features work worldwide.",
  },
  {
    question: "Is there a minimum deposit?",
    answer: "No. There is no minimum deposit to open or maintain a Marsa account.",
  },
];

const payments = [
  {
    question: "Are SEPA transfers really free?",
    answer:
      "Yes — standard SEPA transfers are free on every plan, with no monthly cap. SEPA Instant settles in under 10 seconds.",
  },
  {
    question: "Can I send SWIFT payments?",
    answer:
      "Yes. Marsa supports SWIFT transfers in multiple currencies. A low flat fee applies and decreases as you upgrade your plan.",
  },
  {
    question: "What exchange rate do I get?",
    answer:
      "You convert at the real interbank (mid-market) rate with no markup up to your plan's monthly allowance, after which a small 0.4% applies.",
  },
];

const feesSecurity = [
  {
    question: "How much does Marsa cost?",
    answer:
      "The Classic and Business Starter plans are free. Paid plans add higher limits and premium features — see the Pricing page for a full breakdown.",
  },
  {
    question: "Is my money safe?",
    answer:
      "Marsa runs on regulated partner institutions. Customer funds are safeguarded in segregated accounts at those partners, separate from Marsa's own funds, so they stay protected even in the unlikely event of our insolvency.",
  },
  {
    question: "How is my account protected?",
    answer:
      "We use end-to-end encryption, biometric login, and 24/7 fraud monitoring. You can freeze your card instantly from the app at any time.",
  },
];

export default function Page() {
  return (
    <>
      <Section tone="cream" size="md">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Heading level="display">Frequently Asked Questions</Heading>
            <p className="mt-4 text-base text-ink-muted md:text-lg">
              Everything you need to know about Marsa accounts, payments, fees, and security.
              Can&apos;t find an answer? Our team is one message away.
            </p>
            <div className="mt-6 flex justify-center">
              <Button href="/contact?topic=support" variant="primary" size="md">
                Contact support
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <JsonLd data={faqSchema([...accounts, ...payments, ...feesSecurity])} />
      <FAQ title="Accounts & onboarding" items={accounts} tone="white" emitSchema={false} />
      <FAQ title="Payments & FX" items={payments} tone="blue-tint" emitSchema={false} />
      <FAQ title="Fees & security" items={feesSecurity} tone="white" emitSchema={false} />
    </>
  );
}
