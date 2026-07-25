import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { IbanChecker } from "@/components/tools/IbanChecker";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "IBAN Checker — Validate Any IBAN Free",
  description:
    "Validate any IBAN instantly. Marsa's free IBAN checker verifies the country, length, and ISO 13616 check digits — entirely in your browser.",
  path: "/tools/iban-checker",
});

const concepts = [
  { label: "Country code", value: "First 2 letters identify the country (e.g. DE, GB)." },
  { label: "Check digits", value: "2 digits that validate the whole IBAN via MOD-97." },
  { label: "BBAN", value: "The domestic bank and account number that follows." },
  { label: "Length", value: "Fixed per country — Germany 22, UK 22, France 27." },
];

export default function Page() {
  return (
    <>
      <Section tone="cream" size="md">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Heading level="display">IBAN Checker</Heading>
            <p className="mt-4 text-base text-ink-muted md:text-lg">
              Validate any international bank account number in seconds. We check the country,
              length, and check digits — privately, right in your browser.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <IbanChecker />
          </div>
        </Container>
      </Section>

      <Section tone="white" size="md">
        <Container>
          <Heading level="h2">How IBAN validation works</Heading>
          <p className="mt-4 max-w-3xl text-base text-ink-muted">
            An IBAN (International Bank Account Number) has a strict structure defined by ISO 13616.
            Our checker rearranges the IBAN, converts letters to numbers, and runs the ISO 7064
            MOD-97 checksum — the same maths banks use to catch typos before a payment is sent.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {concepts.map((c) => (
              <div key={c.label} className="rounded-card border border-line bg-card p-5">
                <div className="text-sm font-semibold text-ink">{c.label}</div>
                <p className="mt-2 text-sm text-ink-muted">{c.value}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <FAQ
        items={[
          {
            question: "Does a valid result mean the account exists?",
            answer:
              "No. The checker confirms the IBAN is correctly formed and the check digits pass. It cannot confirm the account is open or belongs to a particular person — only the bank can do that.",
          },
          {
            question: "Is my IBAN sent anywhere?",
            answer:
              "No. Validation runs entirely in your browser. Nothing you type is transmitted to our servers.",
          },
          {
            question: "Which countries are supported?",
            answer:
              "All countries in the IBAN registry, including every SEPA country plus many others across the Middle East, Americas, and beyond.",
          },
          {
            question: "Why was my IBAN marked invalid?",
            answer:
              "Usually a mistyped character or the wrong length for that country. Double-check the country code and that you copied every character.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Individuals"
        title="Get Your Own European IBAN"
        description="Open a free Marsa account and receive a multi-currency IBAN in minutes."
        primaryCta={{ label: "Open A Personal Account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
      />
    </>
  );
}
