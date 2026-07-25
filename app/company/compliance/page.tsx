import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { RegulatedBand } from "@/components/sections/RegulatedBand";
import { CTACard } from "@/components/sections/CTACard";
import { siteConfig } from "@/lib/site";
import { regulatoryDisclosure } from "@/lib/legal";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Compliance & Regulation",
  description:
    "How Marsa is regulated and how we safeguard your funds. Details on our EMI authorisation, AML/KYC obligations, safeguarding, and how to make a complaint.",
  path: "/company/compliance",
});

const sections = [
  {
    heading: "Regulatory authorisation",
    body: [regulatoryDisclosure()],
  },
  {
    heading: "Safeguarding of funds",
    body: [
      "100% of customer funds are safeguarded. Money you hold with Marsa is kept in segregated safeguarding accounts at regulated partner institutions, separate from Marsa's own operating funds, in line with applicable safeguarding requirements.",
      "Electronic money is not a bank deposit. It is not covered by the Financial Services Compensation Scheme or equivalent deposit-guarantee schemes. Instead, safeguarding is designed to ensure that, in the unlikely event of our insolvency, customer funds are protected and can be returned.",
    ],
  },
  {
    heading: "Anti-money-laundering & KYC",
    body: [
      "We are committed to preventing financial crime. Before opening an account we verify your identity (Know Your Customer) and, for businesses, your ownership structure. We monitor transactions for suspicious activity and comply with applicable anti-money-laundering (AML), counter-terrorist-financing, and sanctions obligations.",
      "These checks are a legal requirement and help keep every customer safe. We may request additional information at any time to meet our obligations.",
    ],
  },
  {
    heading: "Data protection",
    body: [
      "We handle personal data in accordance with the EU and UK GDPR. Our Privacy Policy explains what we collect, why, and the rights you have over your data.",
    ],
  },
  {
    heading: "Making a complaint",
    body: [
      `We aim to get things right first time, but if something goes wrong we want to know. Contact us at ${siteConfig.email.support} and we'll acknowledge your complaint and work to resolve it promptly. If you're not satisfied with our final response, you may be entitled to refer your complaint to the relevant financial ombudsman service.`,
    ],
  },
];

export default function Page() {
  return (
    <>
      <Section tone="navy" size="md">
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
              Trust underpins everything we do. Here&apos;s how Marsa is regulated, how we safeguard
              your money, and how to reach us if you have a concern.
            </p>
          </div>
        </Container>
      </Section>

      <RegulatedBand />

      <Section tone="white" size="md">
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

      <CTACard
        eyebrow="Questions?"
        title="Talk To Our Compliance Team"
        description="Have a regulatory or safeguarding question? We're happy to help."
        primaryCta={{ label: "Contact Compliance", href: "/contact?topic=compliance" }}
        secondaryCta={{ label: "Read Our Privacy Policy", href: "/legal/privacy" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
      />
    </>
  );
}
