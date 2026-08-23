import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { CTACard } from "@/components/sections/CTACard";
import { regulatoryDisclosure } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compliance & Regulation",
  description:
    "The regulatory model this concept assumes: how an e-money institution is authorised, and how safeguarding differs from deposit protection.",
  path: "/company/compliance",
});

const sections = [
  {
    heading: "Regulatory standing",
    body: [regulatoryDisclosure()],
  },
  {
    heading: "How safeguarding would work",
    body: [
      "An e-money institution does not lend customer funds. It holds them in segregated safeguarding accounts at partner banks, separate from its own operating money, so that the balance is protected if the institution itself fails. That is the model this concept assumes.",
      "Electronic money is not a bank deposit and is not covered by a deposit-guarantee scheme. Safeguarding is a different mechanism with a different failure mode, and any product making this comparison should say so plainly rather than imply equivalence.",
    ],
  },
  {
    heading: "How onboarding would work",
    body: [
      "Before an account could be opened, a real operator would verify identity (Know Your Customer) and, for a business, its ownership structure, then monitor transactions against anti-money-laundering, counter-terrorist-financing and sanctions obligations.",
      "The interactive demo walks through a simulated version of that check so the shape of the flow is visible. It verifies nothing and screens nobody.",
    ],
  },
  {
    heading: "Data protection",
    body: [
      // Was "This build collects no personal data." True until customer
      // accounts shipped; false the moment registration began writing an email
      // address to Postgres. A data-protection claim on the compliance page is
      // the last place a stale sentence is harmless, so it now names exactly
      // what is stored and where.
      "The marketing forms validate what you type using the same rules the API would, then discard it. Creating an account is the one place this build stores personal data: an email address and, if given, a name. The demo records anonymous, cookieless step counts and honours Do Not Track.",
      "A real product would handle personal data under the EU and UK GDPR; the Privacy Policy on this site is written as an illustration of what that document would need to cover.",
    ],
  },
];

export default function Page() {
  return (
    <>
      <Section tone="deep" size="md">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Company" }, { label: "Compliance" }]}
            tone="white"
            className="mb-6"
          />
          <div className="max-w-3xl">
            <Heading level="display" className="text-white">
              Compliance &amp; Regulation
            </Heading>
            <p className="mt-5 text-base text-white/75 md:text-lg">
              Marsa is a concept build, not an authorised institution. This page describes the
              regulatory model such a product would have to operate under, because getting that
              model right is most of the work, and a design that ignores it is a design that could
              never ship.
            </p>
          </div>
        </Container>
      </Section>

      <RegulatedBand />

      <Section tone="canvas" size="md">
        <Container>
          <article className="mx-auto max-w-3xl">
            {sections.map((s, i) => (
              <section key={i} className="mt-10 first:mt-0" aria-labelledby={`c-${i}`}>
                <h2 id={`c-${i}`} className="text-xl font-semibold text-ink md:text-2xl">
                  {s.heading}
                </h2>
                {s.body.map((p, j) => (
                  <p key={j} className="mt-4 text-base leading-relaxed text-ink-muted">
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </article>
        </Container>
      </Section>

      {/* There is no compliance team. This used to say "Talk To Our Compliance
          Team — we're happy to help", pointing at a contact form that stores
          nothing and reaches nobody. */}
      <CTACard
        eyebrow="Read Further"
        title="The Documents This Model Would Need"
        description="The privacy policy and terms on this site are written as illustrations of what a real operator would have to publish, not as agreements anybody has entered into."
        primaryCta={{ label: "Read The Privacy Policy", href: "/legal/privacy" }}
        secondaryCta={{ label: "Read The Terms", href: "/legal/terms" }}
        art="coin"
      />
    </>
  );
}
