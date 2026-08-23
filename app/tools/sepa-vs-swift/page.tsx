import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { ScrollRegion } from "@/components/ui/ScrollRegion";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { FAQ } from "@/components/sections/FAQ";
import { CTACard } from "@/components/sections/CTACard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "SEPA vs SWIFT. Which Transfer Rail Should You Use?",
  description:
    "SEPA vs SWIFT explained: speed, cost, currencies, and reach. A clear side-by-side comparison to help you choose the right rail for every payment.",
  path: "/tools/sepa-vs-swift",
});

type Row = { feature: string; sepa: string; swift: string };

const rows: Row[] = [
  { feature: "Coverage", sepa: "36 SEPA countries", swift: "200+ countries worldwide" },
  { feature: "Currency", sepa: "Euro only", swift: "Any currency" },
  { feature: "Speed", sepa: "Seconds (SEPA Instant) to 1 day", swift: "1-5 business days" },
  { feature: "Cost", sepa: "Free or very low", swift: "€15-40+ plus FX markup" },
  { feature: "Intermediary banks", sepa: "None", swift: "Often 1-3 (lifting fees)" },
  { feature: "Best for", sepa: "Euro payments within Europe", swift: "Cross-border, non-euro payments" },
];

export default function Page() {
  return (
    <>
      <Section tone="alt" size="md">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Tools" }, { label: "SEPA vs SWIFT" }]}
            className="mb-6"
          />
          <div className="max-w-3xl">
            <Heading level="display">SEPA vs SWIFT</Heading>
            <p className="mt-4 text-base text-ink-muted md:text-lg">
              Two networks move most of the world&apos;s bank payments, but they work very
              differently. Here&apos;s how SEPA and SWIFT compare on speed, cost, and reach, so you
              can pick the right rail every time.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="canvas" size="md">
        <Container>
          <ScrollRegion label="SEPA and SWIFT compared">
            <div className="min-w-[640px] overflow-hidden rounded-card-lg border border-line">
              <div className="grid grid-cols-3 bg-surface-deep text-sm font-semibold text-white">
                <div className="px-5 py-4">Feature</div>
                <div className="px-5 py-4 text-center">SEPA</div>
                <div className="px-5 py-4 text-center">SWIFT</div>
              </div>
              {rows.map((r, i) => (
                <div
                  key={r.feature}
                  className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? "bg-card" : "bg-surface-tint-2"}`}
                >
                  <div className="px-5 py-4 font-medium text-ink">{r.feature}</div>
                  <div className="px-5 py-4 text-center text-ink">{r.sepa}</div>
                  <div className="px-5 py-4 text-center text-ink-muted">{r.swift}</div>
                </div>
              ))}
            </div>
          </ScrollRegion>
        </Container>
      </Section>

      <Section tone="canvas" size="md">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Heading level="h2">What is SEPA?</Heading>
              <p className="mt-4 text-base text-ink-muted">
                The Single Euro Payments Area (SEPA) lets you send euro payments across 36 European
                countries as easily as a domestic transfer. Standard SEPA settles within a business
                day; SEPA Instant settles in under 10 seconds, around the clock. There are no
                intermediary banks, so costs stay low or free.
              </p>
            </div>
            <div>
              <Heading level="h2">What is SWIFT?</Heading>
              <p className="mt-4 text-base text-ink-muted">
                SWIFT is a global messaging network that connects banks in more than 200 countries
                and supports any currency. Because a payment may hop through several correspondent
                banks, each taking a fee, SWIFT transfers are slower and more expensive, but
                they&apos;re essential for payments outside the eurozone.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <FAQ
        items={[
          {
            question: "Is SEPA cheaper than SWIFT?",
            answer:
              "Almost always. SEPA transfers are free or near-free with no intermediary fees, while SWIFT transfers typically cost €15-40 plus an FX markup and possible lifting fees from correspondent banks.",
          },
          {
            question: "Can I send US dollars over SEPA?",
            answer:
              "No. SEPA is euro-only. To send USD or other non-euro currencies you'll use SWIFT (or a local rail like ACH where available). Marsa supports both.",
          },
          {
            question: "How long does each take?",
            answer:
              "SEPA Instant settles in seconds; standard SEPA within one business day. SWIFT usually takes 1-5 business days depending on the route and countries involved.",
          },
          {
            question: "Which should I use?",
            answer:
              "Use SEPA for euro payments within Europe, and SWIFT for cross-border or non-euro payments. With a Marsa account you can do both from one place.",
          },
        ]}
      />

      <CTACard
        eyebrow="For Everyone"
        title="Send SEPA and SWIFT from one account"
        description="Open a Marsa account for free SEPA transfers and low-cost SWIFT payments worldwide."
        primaryCta={{ label: "Open a personal account", href: "/get-started?type=personal" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="coin"
      />
    </>
  );
}
