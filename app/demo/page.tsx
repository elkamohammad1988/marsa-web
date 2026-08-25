import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { DemoFlow } from "@/components/demo/DemoFlow";
import { CTACard } from "@/components/sections/CTACard";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Interactive Demo. See Marsa Work End to End",
  description:
    "Try Marsa in your browser: open an account, get a European IBAN, receive a payout, and convert at the live ECB rate. A labelled sandbox, no sign-up.",
  path: "/demo",
});

export default function DemoPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-surface-deep py-14 text-white md:py-16">
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
              No sign-up, no download. Walk the exact loop a cross-border business runs: get paid
              from abroad, convert at the real interbank rate, pay out over SEPA, in about a minute.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-surface-alt py-12 md:py-16">
        <Container>
          <DemoFlow />
        </Container>
      </section>

      {/*
        This card used to read "Open the real thing in about 5 minutes — same
        loop, real money." It sat roughly four hundred pixels below the sandbox
        banner that says, in as many words, *sample data, no real money*, and it
        was the only sentence on the site that promised real money at all.

        Two readers are hurt by that pairing. One takes the banner seriously,
        reaches the card, and now cannot tell which of the two statements the
        site means. The other skips the banner — most people skip banners — and
        leaves believing there is an account here to open. A disclosure that a
        call to action contradicts is not a disclosure; it is a formality with a
        rebuttal underneath it.

        So the ask changed rather than being deleted. The page still ends with
        somewhere to go, but it goes to the thing that is actually true about
        this build: the rate was live, the IBAN checksum was real, and the
        arithmetic is unit-tested — and none of that needs a licence to be
        worth showing.
      */}
      <CTACard
        eyebrow="Concept build"
        title="Everything you just used is real code"
        description="The rate came from the European Central Bank, the IBAN passes a real ISO 13616 checksum, and every figure was computed by unit-tested arithmetic. The money is the one thing that is not real. There is none here, and no licence to move it."
        primaryCta={{ label: "What's real, and what isn't", href: "/company/compliance" }}
        secondaryCta={{ label: "See Pricing", href: "/pricing" }}
        art="coin"
      />
    </>
  );
}
