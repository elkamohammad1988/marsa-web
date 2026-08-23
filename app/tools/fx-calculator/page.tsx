import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { FxCalculator } from "@/components/tools/FxCalculator";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "FX rate calculator. See the real cost of a transfer",
  description:
    "Calculate the all-in cost of an international transfer. Compare the live mid-market rate against a typical bank markup and see how much you save with Marsa.",
  path: "/tools/fx-calculator",
});

export default function Page() {
  return (
    <>
      <Section tone="alt" size="md">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <Heading level="display">FX Rate Calculator</Heading>
            <p className="mt-4 text-base text-ink-muted md:text-lg">
              See what an international transfer really costs. Compare the live mid-market rate with
              a typical bank markup, and how much you keep with Marsa.
            </p>
          </div>
          <div className="mx-auto mt-10 max-w-2xl">
            <FxCalculator />
          </div>
        </Container>
      </Section>

      <Section tone="canvas" size="md">
        <Container>
          <Heading level="h2">Where FX costs hide</Heading>
          <p className="mt-4 max-w-3xl text-base text-ink-muted">
            The advertised “no fee” transfer is rarely free. Most providers bake their profit into
            the exchange rate as a markup on top of the mid-market rate. On a €5,000 transfer, a 3%
            markup quietly costs €150, every single time.
          </p>
        </Container>
      </Section>

      <FAQ
        items={[
          {
            question: "What is the mid-market rate?",
            answer:
              "It's the midpoint between the buy and sell price of two currencies, the rate banks use between themselves, before any markup. We source it from European Central Bank reference rates.",
          },
          {
            question: "How does Marsa keep costs low?",
            answer:
              "Marsa gives you the interbank rate with no markup up to your plan's monthly allowance, then a small 0.4% applies. There are no hidden spreads.",
          },
          {
            question: "Are these figures guaranteed?",
            answer:
              "They're estimates based on live reference rates. The exact amount depends on your plan, allowance, and the rate at the moment you transfer.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Everyone"
        title="Stop Paying Hidden FX Markups"
        description="Open a Marsa account and convert 30+ currencies at the real interbank rate."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "Try the converter", href: "/tools/currency-converter" }}
        art="coin-warm"
      />
    </>
  );
}
