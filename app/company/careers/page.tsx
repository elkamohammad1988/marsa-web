import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Section } from "@/components/ui/Section";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { BreadcrumbEyebrow } from "@/components/sections/BreadcrumbEyebrow";
import { CTACard } from "@/components/sections/CTACard";
import { CheckBullet } from "@/components/ui/CheckBullet";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Careers At Marsa",
  description:
    "Help build borderless money. Explore open roles at Marsa across engineering, compliance, product, and operations — remote-friendly across Europe.",
  path: "/company/careers",
});

const benefits = [
  "Remote-friendly across Europe",
  "Meaningful equity for every employee",
  "Learning & conference budget",
  "26 days holiday + local public holidays",
  "Private health cover",
  "Latest hardware of your choice",
];

const roles = [
  { title: "Senior Backend Engineer", team: "Engineering", location: "Remote (EU) · Full-time" },
  { title: "Compliance Officer (AML)", team: "Compliance", location: "Amsterdam / Remote · Full-time" },
  { title: "Product Designer", team: "Product", location: "Remote (EU) · Full-time" },
  { title: "Customer Operations Specialist", team: "Operations", location: "Remote (EU) · Full-time" },
  { title: "Payments Partnerships Manager", team: "Business", location: "London / Remote · Full-time" },
];

export default function Page() {
  return (
    <>
      <Section tone="cream" size="md">
        <Container>
          <BreadcrumbEyebrow
            items={[{ label: "Home", href: "/" }, { label: "Company" }, { label: "Careers" }]}
            className="mb-6"
          />
          <div className="max-w-3xl">
            <Heading level="display">Build Borderless Money With Us</Heading>
            <p className="mt-5 text-base text-ink-muted md:text-lg">
              We&apos;re a small, senior team on a big mission. If you care about fair finance,
              craftsmanship, and moving fast without cutting corners, we&apos;d love to hear from you.
            </p>
          </div>
        </Container>
      </Section>

      <Section tone="white" size="md">
        <Container>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <Heading level="h2">Why Marsa</Heading>
              <p className="mt-4 text-ink-muted">
                Real ownership, real impact, and a product used across 180+ countries.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {benefits.map((b) => (
                <CheckBullet key={b} tone="blue">
                  {b}
                </CheckBullet>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section tone="blue-tint" size="lg">
        <Container>
          <Heading level="h2">Open Roles</Heading>
          <div className="mt-8 flex flex-col gap-4">
            {roles.map((r) => (
              <div
                key={r.title}
                className="flex flex-col gap-4 rounded-card-lg border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between md:p-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    {r.team} · {r.location}
                  </p>
                </div>
                <Button href="/contact?topic=general" variant="outline" size="md">
                  Apply
                </Button>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-ink-muted">
            Don&apos;t see the right role?{" "}
            <a href="/contact?topic=general" className="font-medium text-brand-strong hover:underline">
              Send us a speculative application
            </a>{" "}
            — we&apos;re always keen to meet exceptional people.
          </p>
        </Container>
      </Section>

      <CTACard
        eyebrow="Careers"
        title="Ready To Make An Impact?"
        description="Tell us about yourself and the role you're interested in."
        primaryCta={{ label: "Get In Touch", href: "/contact?topic=general" }}
        imageSrc="/images/coin-blue.png"
        imageAlt="Marsa coin"
      />
    </>
  );
}
