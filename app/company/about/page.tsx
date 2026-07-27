import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { CTACard } from "@/components/sections/CTACard";
import { FeatureIcon } from "@/components/ui/FeatureIcon";
import { IconGlobe, IconShield, IconUsers, IconLightning } from "@/components/icons";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Marsa",
  description:
    "Marsa is on a mission to make money borderless. Learn about the company building multi-currency accounts, SEPA payments, and fair FX for people and businesses everywhere.",
  path: "/company/about",
});

const values = [
  { icon: <IconGlobe />, title: "Borderless by default", text: "Money should move as freely as the people and businesses who use it." },
  { icon: <IconShield />, title: "Trust is earned", text: "A money product earns trust by being explicit about what it is — including when it is a concept." },
  { icon: <IconLightning />, title: "Speed with substance", text: "Fast onboarding and instant payments, backed by real compliance." },
  { icon: <IconUsers />, title: "Customer-obsessed", text: "Every decision starts with the person on the other side of the screen." },
];

const stats = [
  { value: "180+", label: "Countries served" },
  { value: "30+", label: "Currencies held" },
  { value: "36", label: "SEPA countries" },
  { value: "<5 min", label: "To open an account" },
];

export default function Page() {
  return (
    <>
      <Section tone="cream" size="md">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Company" }, { label: "About" }]}
            className="mb-6"
          />
          <div className="max-w-3xl">
            <Heading level="display">Money Without Borders, For Everyone</Heading>
            <p className="mt-5 text-base text-ink-muted md:text-lg">
              Marsa was founded on a simple belief: sending, holding, and converting money across
              currencies and countries should be instant, transparent, and fair. We build the
              multi-currency account we always wished existed — for individuals, freelancers, and
              growing businesses alike.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="navy" size="md">
        <Container>
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <div className="text-4xl font-bold text-white">{s.value}</div>
                <div className="mt-2 text-sm text-white/65">{s.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="white" size="lg">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <Heading level="h2">What We Stand For</Heading>
            <p className="mt-3 text-ink-muted">
              Our values guide the products we build and the way we treat customers.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v) => (
              <div key={v.title} className="rounded-card-lg border border-line bg-card p-6">
                <FeatureIcon tone="blue">{v.icon}</FeatureIcon>
                <h3 className="mt-4 text-lg font-semibold text-ink">{v.title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{v.text}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <Section tone="blue-tint" size="lg">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <Heading level="h2">Our Story</Heading>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-ink-muted">
              <p>
                Cross-border payments have long been slow, opaque, and expensive. Founders couldn&apos;t
                open a European account without a local address; freelancers lost a slice of every
                invoice to FX markups; families paid to send money home. We set out to fix that.
              </p>
              <p>
                Today Marsa gives people and businesses a genuine European multi-currency IBAN, free
                SEPA transfers, and interbank exchange rates — all from an app that opens in minutes.
                We build on regulated, licensed financial infrastructure, so speed never comes at the
                cost of safety.
              </p>
              <p>
                We&apos;re just getting started. As we grow, our goal stays the same: make money truly
                borderless for everyone who needs it.
              </p>
            </div>
          </div>
        </Container>
      </Section>

      <CTACard
        eyebrow="See It Working"
        title="The Parts That Actually Run"
        description="Live ECB rates, offline IBAN validation, and a walkthrough of the onboarding flow — the software, without the company."
        primaryCta={{ label: "Try The Demo", href: "/demo" }}
        secondaryCta={{ label: "Check An IBAN", href: "/tools/iban-checker" }}
        art="coin-warm"
      />
    </>
  );
}
