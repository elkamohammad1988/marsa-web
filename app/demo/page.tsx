import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { DemoFlow } from "@/components/demo/DemoFlow";
import { CTACard } from "@/components/sections/CTACard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Interactive Demo — See Marsa Work End to End",
  description:
    "Try Marsa in your browser: open an account, get a European IBAN, receive a payout from abroad, convert at the live interbank rate, and send over SEPA. Sandbox with real ECB rates — no sign-up.",
  path: "/demo",
});

export default function DemoPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-surface-navy py-14 text-white md:py-16">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-mesh-deep opacity-90" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-noise" />
        <Container className="relative">
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Demo" }]}
            tone="white"
            className="mb-6"
          />
          <div className="max-w-2xl">
            <Heading level="h1" className="text-white">
              Try Marsa, right here
            </Heading>
            <p className="mt-4 text-white/70">
              No sign-up, no download. Walk the exact loop a cross-border business runs — get paid
              from abroad, convert at the real interbank rate, pay out over SEPA — in about a minute.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-surface-cream py-12 md:py-16">
        <Container>
          <DemoFlow />
        </Container>
      </section>

      <CTACard
        eyebrow="Ready when you are"
        title="Open the real thing in about 5 minutes"
        description="Same loop, real money. Free plan available, online application, no branch visit."
        primaryCta={{ label: "Open An Account", href: "/get-started" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
      />
    </>
  );
}
