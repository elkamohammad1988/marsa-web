import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { ContactForm } from "@/components/forms/ContactForm";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";
import { CONTACT_TOPICS, type ContactTopic } from "@/lib/validation";
import { IconClock, IconGlobe, IconShield } from "@/components/icons";

export const metadata: Metadata = buildMetadata({
  title: "Contact Marsa",
  description:
    "Get in touch with the Marsa team. Talk to sales, reach customer support, or send a compliance or press enquiry.",
  path: "/contact",
});

const highlights = [
  { icon: <IconClock />, title: "Fast replies", text: "We answer every enquiry within one business day." },
  { icon: <IconGlobe />, title: "Global support", text: "Assistance across EU, UK and 180+ countries." },
  { icon: <IconShield />, title: "Secure by default", text: "Your details are handled per our Privacy Policy." },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic } = await searchParams;
  const defaultTopic: ContactTopic = CONTACT_TOPICS.includes(topic as ContactTopic)
    ? (topic as ContactTopic)
    : "general";

  return (
    <section className="bg-surface-cream py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-16">
          <div className="lg:pt-4">
            <h1 className="text-display-sm font-bold text-ink">Talk to us</h1>
            <p className="mt-4 max-w-md text-base text-ink-muted">
              Whether you&apos;re scaling a business or opening your first account, our team is
              here to help. Send us a message and we&apos;ll get back to you shortly.
            </p>

            <ul className="mt-8 flex flex-col gap-5">
              {highlights.map((h) => (
                <li key={h.title} className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-strong [&_svg]:h-5 [&_svg]:w-5">
                    {h.icon}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">{h.title}</div>
                    <p className="mt-1 text-sm text-ink-muted">{h.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-card border border-line bg-card p-5 text-sm">
              <div className="font-semibold text-ink">Prefer email?</div>
              <div className="mt-2 flex flex-col gap-1 text-ink-muted">
                <a href={`mailto:${siteConfig.email.sales}`} className="hover:text-brand-strong">
                  Sales — {siteConfig.email.sales}
                </a>
                <a href={`mailto:${siteConfig.email.support}`} className="hover:text-brand-strong">
                  Support — {siteConfig.email.support}
                </a>
              </div>
            </div>
          </div>

          <ContactForm defaultTopic={defaultTopic} />
        </div>
      </Container>
    </section>
  );
}
