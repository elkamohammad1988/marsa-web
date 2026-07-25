import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { footerColumns, footerBadges } from "@/lib/nav";
import { siteConfig } from "@/lib/site";
import { regulatoryDisclosure } from "@/lib/legal";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { IconLinkedIn, IconYouTube, IconX } from "@/components/icons";

const socials = [
  { label: "Marsa on X", href: siteConfig.social.x, Icon: IconX },
  { label: "Marsa on YouTube", href: siteConfig.social.youtube, Icon: IconYouTube },
  { label: "Marsa on LinkedIn", href: siteConfig.social.linkedin, Icon: IconLinkedIn },
];

const fastLinks = [
  { label: "Tariffs", href: "/pricing" },
  { label: "Help", href: "/faq" },
  { label: "Support", href: "/contact?topic=support" },
  { label: "FAQ", href: "/faq" },
];

export function Footer() {
  return (
    <footer className="bg-surface-blue-tint-2 pt-12 md:pt-16">
      <Container>
        <div className="flex justify-center pb-6 md:pb-8">
          <Link
            href="/"
            aria-label="Marsa home"
            className="select-none font-display text-[clamp(72px,14vw,180px)] font-bold leading-none tracking-tighter text-gradient"
          >
            <span aria-hidden>marsa</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-8 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-6">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-semibold text-ink">{col.title}</h2>
              <ul className="mt-4 flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="inline-block py-1 text-sm text-ink-muted underline-offset-4 transition-colors hover:text-brand-strong hover:underline"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="relative isolate mt-10 flex flex-col items-stretch gap-4 overflow-hidden rounded-card-lg bg-surface-navy px-6 py-6 text-white shadow-elevated ring-1 ring-white/10 md:flex-row md:items-center md:justify-between md:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh-deep opacity-80" />
          <NewsletterForm />

          <div className="flex items-center gap-3">
            <span className="text-sm text-white/80">Stay connected</span>
            <div className="flex items-center gap-2">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-strong transition-colors hover:bg-white/90"
                  aria-label={label}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-line pt-6 text-center">
          <h2 className="text-sm font-semibold text-ink">Fast links</h2>
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm text-ink-muted">
            {fastLinks.map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  className="inline-block py-1 underline-offset-4 hover:text-brand-strong hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 max-w-5xl text-xs leading-relaxed text-ink-muted">
          {regulatoryDisclosure()} Marsa provides multi-currency accounts, SEPA &amp; SWIFT
          transfers, and FX services to individuals and businesses across the EU and beyond.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6 text-center text-xs text-ink-subtle md:grid-cols-6">
          {footerBadges.map((b) => (
            <span key={b}>{b}</span>
          ))}
        </div>

        <div className="py-6 text-center text-xs text-ink-subtle">
          © {new Date().getFullYear()} {siteConfig.legalName} All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
