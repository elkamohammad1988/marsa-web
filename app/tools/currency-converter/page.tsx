import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { CurrencyConverter } from "@/components/sections/CurrencyConverter";
import { FeatureBullets } from "@/components/sections/FeatureBullets";
import { ProcessSteps } from "@/components/sections/ProcessSteps";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { BrandArt } from "@/components/art/BrandArt";
import { IconExchange, IconChart, IconLightning } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Instant Currency Converter — Live Exchange Rates",
  description:
    "Convert any currency with Marsa's free converter using real European Central Bank mid-market rates across 30 currencies — the rate banks pay, before any markup.",
  path: "/tools/currency-converter",
});

const concepts = [
  { label: "Mid-market rate", value: "Average between bid and ask" },
  { label: "FX Margin", value: "Spread on top of the mid rate" },
  { label: "EUR/USD Volatility", value: "Daily fluctuation range" },
  { label: "ECB Reference Rate", value: "Published each ECB business day" },
];

const tools = [
  {
    icon: <IconChart />,
    title: "IBAN Checker",
    description: "Verify the validity of any IBAN in seconds, free.",
  },
  {
    icon: <IconExchange />,
    title: "SEPA vs SWIFT",
    description: "Compare the two main European transfer rails.",
  },
  {
    icon: <IconLightning />,
    title: "FX rate calculator",
    description: "Calculate the all-in cost of any FX transfer.",
  },
];

export default function Page() {
  return (
    <>
      <CurrencyConverter />

      <Section tone="canvas" size="md">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Heading level="h2">What is a currency converter?</Heading>
              <p className="mt-4 text-base text-ink-muted">
                A currency converter is a tool that calculates how much one currency is worth in
                another at any given moment. Marsa&apos;s converter uses European Central Bank reference
                rates — the mid-market rate banks use between themselves — so you always see the
                rate before any markup.
              </p>
              <p className="mt-4 text-base text-ink-muted">
                Use it to plan transfers, budget for travel, price international invoices, or just
                follow the markets.
              </p>
            </div>
            {/*
              This slot used to be an empty tinted box containing the words
              "Live FX Insights" and nothing else — the last surviving hole
              from `public/images/`, missed when every other image slot was
              replaced by a drawing. It read as an asset that had failed to
              load, on the page most likely to be linked as a demonstration of
              the FX work.
            */}
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card-lg bg-surface-tint">
              <BrandArt name="phone-accounts" />
            </div>
          </div>
        </Container>
      </Section>

      <ProcessSteps
        eyebrow="How to use"
        title="How to use the Marsa currency converter"
        description="Three steps to a precise conversion."
        steps={[
          {
            number: "01",
            title: "Choose Currencies",
            description: "Pick the pair you want to convert.",
          },
          {
            number: "02",
            title: "Enter the amount",
            description: "Type the source amount — we recalculate live.",
          },
          {
            number: "03",
            title: "See the live rate",
            description: "Get the mid-market rate, plus historical chart.",
          },
        ]}
      />

      <Section tone="canvas" size="md">
        <Container>
          <Heading level="h2">Key FX concepts explained</Heading>
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

      <FeatureBullets items={tools} tone="tint" />

      <FAQ
        items={[
          {
            question: "What is the mid-market rate?",
            answer:
              "The mid-market rate is the midpoint between the buy and sell prices of two currencies — the rate banks use to settle between each other.",
          },
          {
            question: "Why is your rate different from my bank?",
            answer:
              "Most banks add a 2-4% markup on top of the mid-market rate. Marsa's converter shows the rate before any markup.",
          },
          {
            question: "Can I use this rate to send money?",
            answer:
              "Yes — Marsa customers transfer at the mid-market rate up to €10,000/month, then a small 0.4% markup applies.",
          },
          {
            question: "How often are rates updated?",
            answer:
              "The converter uses European Central Bank reference rates, which are published once every ECB business day (around 16:00 CET).",
          },
        ]}
      />

      <CTACard
        eyebrow="For Individuals"
        title="Your Money, Accessible Everywhere You Go"
        description="Up to 2% FX fees, free SEPA transfers, and support in 180+ countries."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="coin"
      />
    </>
  );
}
