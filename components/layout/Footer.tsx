import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/icons/Logo";
import { footerColumns, footerBadges } from "@/lib/nav";
import { siteConfig } from "@/lib/site";
import { regulatoryDisclosure } from "@/lib/legal";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { IconLinkedIn, IconYouTube, IconX } from "@/components/icons";

/**
 * Only profiles that are configured. These defaulted to `x.com/marsamoney`
 * and friends — accounts nobody owns, linked from every page and asserted in
 * `Organization.sameAs`.
 */
const socials = [
  { label: "Marsa on X", href: siteConfig.social.x, Icon: IconX },
  { label: "Marsa on YouTube", href: siteConfig.social.youtube, Icon: IconYouTube },
  { label: "Marsa on LinkedIn", href: siteConfig.social.linkedin, Icon: IconLinkedIn },
].filter((s) => s.href);

/**
 * The foot of every page. Four things were wrong with the previous one, and
 * all four were structural rather than cosmetic:
 *
 * 1. **A 180px wordmark.** `text-[clamp(72px,14vw,180px)]` in the brand
 *    gradient, centred, above everything else — by a wide margin the largest
 *    and most saturated element on any page, appearing on all of them. It read
 *    as placeholder art. Replaced by the ordinary logo lockup at the size the
 *    navbar uses, which is what a footer signature is for.
 *
 * 2. **A label with nothing to label.** "Stay connected" was rendered
 *    unconditionally beside `socials`, but `socials` is filtered to profiles
 *    that are actually configured and none are — so every page showed the
 *    words "Stay connected" floating alone at the far right of a dark pill,
 *    roughly 400px from the newsletter field it appeared to belong to. It is
 *    now inside the same conditional as the icons.
 *
 * 3. **"Fast links".** Pricing, FAQ, Support and Try the demo — all four
 *    already present in the columns directly above, three of them under the
 *    same label. A second navigation of the same destinations does not help a
 *    reader find anything; it just makes the footer longer.
 *
 * 4. **A white button.** The newsletter's submit was the only pure-white
 *    button in the product, sitting in a pill whose own background was the
 *    deepest surface — maximum contrast on the least important action on the
 *    page, out-shouting the primary CTA it sat below.
 */
export function Footer() {
  return (
    <footer className="relative isolate border-t border-line bg-surface-tint-2 pt-16 md:pt-20">
      <Container>
        {/* Signature + newsletter, on one line at desktop. */}
        <div className="flex flex-col gap-8 pb-12 md:flex-row md:items-start md:justify-between md:gap-16">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label="Marsa home"
              className="inline-flex rounded-full transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <Logo />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              One account for every currency you get paid in: receive, hold, convert and pay out
              from a single European IBAN.
            </p>
          </div>

          <div className="w-full max-w-md">
            <NewsletterForm />
            {socials.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                <span className="text-sm text-ink-muted">Stay connected</span>
                <div className="flex items-center gap-2">
                  {socials.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink-muted ring-1 ring-line transition-colors hover:text-brand-strong hover:ring-brand-strong/40"
                      aria-label={label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-10 border-t border-line pt-10 sm:grid-cols-3 lg:grid-cols-6">
          {footerColumns.map((col) => (
            <div key={col.title}>
              {/* A micro-label, not another 14px semibold line. The headings
                  and the links they head were the same size and nearly the
                  same weight, so six columns read as six undifferentiated
                  lists. */}
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                {col.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="link-underline inline-block text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-14 max-w-4xl border-t border-line pt-8 text-xs leading-relaxed text-ink-subtle">
          {regulatoryDisclosure()}
        </p>

        <div className="mt-8 flex flex-col-reverse items-start gap-5 border-t border-line py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-ink-subtle">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          {/*
            Four facts and one link, and they no longer look the same.

            All five rendered as identical filled, ringed, `rounded-full` chips
            — so four pieces of static text wore a control's chrome, and the one
            that *is* a control was indistinguishable from them except on hover.
            That is the shape the brief rules out twice over: static text must
            not look clickable, and a link must be findable without a pointer.

            The four facts are now plain small type separated by rules, which is
            what a strip of build metadata is. "Source on GitHub" keeps the link
            treatment the rest of this footer uses, so it reads as the one thing
            here you can go and do.
          */}
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-ink-subtle">
            {footerBadges.map((b, i) => (
              <li
                key={b.label}
                className={i > 0 ? "border-l border-line pl-3" : undefined}
              >
                {b.href ? (
                  <a
                    href={b.href}
                    className="rounded-sm font-medium text-ink-muted underline decoration-line-dark underline-offset-4 transition-colors hover:text-brand-strong hover:decoration-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  >
                    {b.label}
                  </a>
                ) : (
                  b.label
                )}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
