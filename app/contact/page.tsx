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
    "Marsa is a concept build with no team behind it. The contact form runs the real validation rules and then keeps nothing, and the page says so before you type.",
  path: "/contact",
});

/** Only addresses that are actually configured. */
const mailboxes = [
  { label: "Sales", address: siteConfig.email.sales },
  { label: "Support", address: siteConfig.email.support },
].filter((m) => m.address);

/**
 * What this page can honestly say about itself.
 *
 * The first of these read "Fast replies — We answer every enquiry within one
 * business day", which is the same sentence the honesty pass deleted from the
 * lead form's success screen, still standing on the page that hosts the
 * contact form. Nobody reads a submission here and nobody replies, so it was a
 * commitment made to a real person by a build with no operator — and the form
 * below it discards what you type. `tests/forms-collect-nothing.test.ts` now
 * scans the pages that host a form as well as the form components, which is
 * the gap that let it survive.
 *
 * The third said "Your details are handled per our Privacy Policy". They are
 * not handled at all; that is the point, and it is worth more than the
 * reassurance it replaced.
 */
const highlights = [
  {
    icon: <IconShield />,
    title: "Nothing kept",
    text: "What you type never leaves your browser. No inbox, no database row, nothing to erase later.",
  },
  {
    icon: <IconGlobe />,
    title: "Real validation",
    text: "The same rules run here and on the server, from one shared module, so the two cannot drift apart.",
  },
  {
    icon: <IconClock />,
    title: "What a configured build does",
    text: "Writes to Postgres, rate-limits across instances, then notifies by email — never the other way round.",
  },
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
    <section className="bg-surface-alt py-12 md:py-16">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-16">
          <div className="lg:pt-4">
            <h1 className="text-display-sm font-bold text-ink">Talk to us</h1>
            <p className="mt-4 max-w-md text-base text-ink-muted">
              Marsa is a concept build, so there is no team behind this address and nowhere for
              the form below to send what you write.
            </p>

            <ul className="mt-8 flex flex-col gap-5">
              {highlights.map((h) => (
                <li key={h.title} className="flex items-start gap-4">
                  <span className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-card bg-brand/10 text-brand-strong [&_svg]:h-5 [&_svg]:w-5">
                    {h.icon}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">{h.title}</div>
                    <p className="mt-1 text-sm text-ink-muted">{h.text}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* Rendered only when a real address is configured. This block
                used to offer sales@ and support@marsa.money — a domain nobody
                owns, so both were invitations to write into a void. */}
            {mailboxes.length > 0 && (
              <div className="mt-8 rounded-card border border-line bg-card p-5 text-sm">
                <div className="font-semibold text-ink">Prefer email?</div>
                <div className="mt-2 flex flex-col gap-1 text-ink-muted">
                  {mailboxes.map(({ label, address }) => (
                    <a
                      key={label}
                      href={`mailto:${address}`}
                      className="rounded-sm hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                    >
                      {label}: {address}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <ContactForm defaultTopic={defaultTopic} />
        </div>
      </Container>
    </section>
  );
}
