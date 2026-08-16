import type { ReactNode } from "react";
import Link from "next/link";
import { Heading } from "@/components/ui/Heading";
import { Logo } from "@/components/icons/Logo";
import { IconGlobe, IconExchange, IconBank } from "@/components/icons";

/**
 * The frame every authentication page sits in.
 *
 * One `<h1>` per page, supplied here, so the five pages cannot drift into
 * different heading levels — a document that starts at `h2` or repeats `h1` is
 * the most common way a well-styled page becomes hard to navigate with a
 * screen reader's heading list.
 *
 * **Why this is two panels rather than a centred card.**
 *
 * It used to be a `max-w-md` card alone in the middle of a 1440px page. On
 * `/login`, whose body was a four-line notice, that produced a small box
 * marooned in roughly 900px of empty canvas with the footer's wordmark looming
 * underneath — the least considered screen in the product, reached by the
 * navbar's second most prominent link.
 *
 * Every bank and every serious fintech — Mercury, Stripe, Revolut Business,
 * Brex — puts a brand panel beside the form. It is not decoration: the sign-in
 * page is the one screen a returning customer sees every single time, and it
 * is where a *new* visitor who clicked the wrong button ends up. Giving it a
 * left-hand column means the page still says what the product is when the
 * right-hand column is a single field.
 *
 * The panel's claims are quoted from copy the marketing pages already make —
 * no new assertions are introduced at the authentication boundary, which is
 * exactly where a reader is most inclined to believe them.
 */

const TRUST: { icon: (p: { className?: string }) => ReactNode; label: string }[] = [
  { icon: IconBank, label: "A European multi-currency IBAN in your name" },
  { icon: IconExchange, label: "Convert at the interbank reference rate" },
  { icon: IconGlobe, label: "Pay out over SEPA and SWIFT" },
];

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[1fr_minmax(0,27rem)] lg:gap-16">
      {/*
        Hidden below `lg`, and deliberately not reflowed to the top on mobile:
        on a phone the form *is* the page, and stacking a marketing panel above
        it would push the first field below the fold on the one screen where a
        returning customer wants nothing but the field.
      */}
      <aside className="hidden lg:block lg:pt-2">
        <Link href="/" className="inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-canvas">
          <Logo />
        </Link>

        <p className="mt-10 max-w-md font-display text-[34px] font-bold leading-[1.12] tracking-tight text-ink">
          One account for every currency you get paid in.
        </p>

        <ul className="mt-8 space-y-4">
          {TRUST.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-start gap-3.5">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/[0.12] ring-1 ring-brand/25">
                <Icon className="h-4 w-4 text-brand-strong" />
              </span>
              <span className="text-[15px] leading-relaxed text-ink-muted">{label}</span>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-md border-t border-line pt-6 text-xs leading-relaxed text-ink-subtle">
          Marsa Money Ltd. is not a bank. Accounts, IBANs, payments and currency exchange are
          provided by licensed partner institutions.
        </p>
      </aside>

      {/*
        No logo lockup here on small screens. The first draft repeated one
        above the card for when the `aside` is hidden — but the site navbar is
        directly above it and already shows the mark, so a phone rendered the
        Marsa logo twice within about 200px of vertical space.
      */}
      <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
        <div className="rounded-card-lg border border-line bg-card p-6 shadow-e2 sm:p-8">
          <Heading level="h1" size="panel">
            {title}
          </Heading>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
          <div className="mt-7">{children}</div>
        </div>

        {footer && <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}
